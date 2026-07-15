// ─────────────────────────────────────────────────────────────────────────────
//  Client-side language controller.
//
//  The page is rendered server-side in the default language. The dictionary is
//  serialized into `window.__I18N__` by the Layout. This module swaps every
//  translatable node in place when the user toggles the nav switcher — no reload,
//  no route change — and broadcasts `rb:langchange` so bespoke views (the hero)
//  can replay their own animations.
//
//  Conventions:
//    data-i18n="key"                 → element.textContent (must be a leaf node)
//    data-i18n-attr="attr:key,…"     → element.setAttribute(attr, value)
//  The <html lang> value follows the active interface language. Page-specific
//  SEO metadata stays stable until each locale has its own canonical URL.
// ─────────────────────────────────────────────────────────────────────────────

type Dict = Record<string, string>;

const STORAGE_KEY = "rb-lang";

const I18N: Record<string, Dict> = (window as any).__I18N__ ?? {};
const DEFAULT_LANG: string = (window as any).__DEFAULT_LANG__ ?? "en";
const LOCKED_LANG: string | null = (window as any).__LOCKED_LANG__ ?? null;
const AVAILABLE = Object.keys(I18N);

// The server renders the default language, so that's our starting point.
let current = DEFAULT_LANG;

function resolveInitial(): string {
  if (LOCKED_LANG && AVAILABLE.includes(LOCKED_LANG)) return LOCKED_LANG;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && AVAILABLE.includes(stored)) return stored;
  const nav = (navigator.language || "").slice(0, 2).toLowerCase();
  return AVAILABLE.includes(nav) ? nav : DEFAULT_LANG;
}

function translateNodes(dict: Dict) {
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n!;
    const value = dict[key];
    if (value != null) el.textContent = value;
  });

  document.querySelectorAll<HTMLElement>("[data-i18n-attr]").forEach((el) => {
    el.dataset.i18nAttr!.split(",").forEach((pair) => {
      const [attr, key] = pair.split(":").map((s) => s.trim());
      const value = dict[key];
      if (attr && value != null) el.setAttribute(attr, value);
    });
  });
}

function syncSwitcher(lang: string) {
  document.querySelectorAll<HTMLElement>("[data-lang]").forEach((btn) => {
    const active = btn.dataset.lang === lang;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", String(active));
  });
}

function syncLocaleLinks(lang: string) {
  const home = `/${lang}/`;
  document.querySelectorAll<HTMLAnchorElement>("[data-locale-home]").forEach((link) => {
    link.href = home;
  });
  document.querySelectorAll<HTMLAnchorElement>("[data-locale-hash]").forEach((link) => {
    link.href = `${home}${link.dataset.localeHash || ""}`;
  });
}

export function setLang(lang: string, opts: { persist?: boolean } = {}) {
  if (LOCKED_LANG && lang !== LOCKED_LANG) return;
  if (!AVAILABLE.includes(lang)) return;

  const dict = I18N[lang];
  const changed = lang !== current;

  if (changed) {
    translateNodes(dict);
    document.documentElement.lang = lang === "de" ? "de-AT" : "en";
    current = lang;
  }

  syncSwitcher(lang);
  syncLocaleLinks(lang);
  if (opts.persist !== false) localStorage.setItem(STORAGE_KEY, lang);

  if (changed) {
    window.dispatchEvent(
      new CustomEvent("rb:langchange", { detail: { lang } }),
    );
  }
}

// Delegate clicks from any [data-lang] control in the nav.
document.addEventListener("click", (e) => {
  const route = (e.target as HTMLElement)?.closest<HTMLElement>("[data-lang-route]");
  if (route?.dataset.langRoute) {
    localStorage.setItem(STORAGE_KEY, route.dataset.langRoute);
    return;
  }
  if (LOCKED_LANG) return;
  const btn = (e.target as HTMLElement)?.closest<HTMLElement>("[data-lang]");
  if (!btn) return;
  e.preventDefault();
  setLang(btn.dataset.lang!);
});

// Apply the preferred language on load (no-op text swap when it matches SSR).
setLang(resolveInitial(), { persist: Boolean(LOCKED_LANG) });

// Expose for debugging / manual control.
(window as any).rbSetLang = setLang;
