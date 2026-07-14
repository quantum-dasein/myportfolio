import { ui, defaultLang } from "./ui";

export type Lang = keyof typeof ui;
export type UIKey = keyof (typeof ui)[typeof defaultLang];

/**
 * Server-side translator. `const t = useTranslations(lang); t("hero.title.1")`.
 * Falls back to the default language if a key is missing in the target locale.
 */
export function useTranslations(lang: Lang = defaultLang) {
  return function t(key: UIKey): string {
    return ui[lang][key] || ui[defaultLang][key];
  };
}

/**
 * Derive the active language from the URL (e.g. `/de/…`). Kept for future
 * locale-prefixed routing; the current single-page build switches on the
 * client, but this keeps the door open for statically rendered /de pages.
 */
export function getLangFromUrl(url: URL): Lang {
  const [, seg] = url.pathname.split("/");
  if (seg in ui) return seg as Lang;
  return defaultLang;
}
