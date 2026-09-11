import { track } from "@vercel/analytics";

type EventValue = string | number | boolean | null;
type EventData = Record<string, EventValue>;

const ATTRIBUTION_KEY = "rb-attribution-v1";
const GA4_ID = import.meta.env.PUBLIC_GA4_ID as string | undefined;

export interface Attribution {
  landing: string;
  referrer: string;
  campaign: string;
}

function currentAttribution(): Attribution {
  const params = new URLSearchParams(location.search);
  const campaign = ["utm_source", "utm_medium", "utm_campaign", "utm_content"]
    .map((key) => (params.get(key) ? `${key}=${params.get(key)}` : ""))
    .filter(Boolean)
    .join(" · ");

  return {
    landing: `${location.pathname}${location.search}`,
    referrer: document.referrer || "direct",
    campaign: campaign || "none",
  };
}

export function captureAttribution(): Attribution {
  const current = currentAttribution();
  try {
    const stored = sessionStorage.getItem(ATTRIBUTION_KEY);
    if (stored) return JSON.parse(stored) as Attribution;
    sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(current));
  } catch {
    // Private browsing can deny storage; the current page is still useful.
  }
  return current;
}

export function getAttribution(): Attribution {
  try {
    const stored = sessionStorage.getItem(ATTRIBUTION_KEY);
    if (stored) return JSON.parse(stored) as Attribution;
  } catch {
    // Fall through to the current page.
  }
  return currentAttribution();
}

export function trackEvent(name: string, data: EventData = {}) {
  const compact = Object.fromEntries(
    Object.entries(data)
      .slice(0, 2)
      .map(([key, value]) => [
        key.slice(0, 255),
        typeof value === "string" ? value.slice(0, 255) : value,
      ]),
  );

  if (import.meta.env.DEV) console.debug("[analytics]", name, compact);

  try {
    track(name, compact);
  } catch {
    // Analytics must never be able to interrupt navigation or a form submit.
  }

  const gtag = (window as any).gtag as
    | ((...args: unknown[]) => void)
    | undefined;
  if (GA4_ID && gtag) gtag("event", name, compact);
}

function placementOf(element: HTMLElement) {
  return (
    element.dataset.trackPlace ||
    element.closest<HTMLElement>("section[id]")?.id ||
    element.closest<HTMLElement>("article")?.classList[0] ||
    "page"
  );
}

function initAnalytics() {
  captureAttribution();
  if (document.documentElement.dataset.analyticsWired === "true") return;
  document.documentElement.dataset.analyticsWired = "true";

  document.addEventListener("click", (event) => {
    const target = (event.target as HTMLElement | null)?.closest<HTMLElement>(
      "[data-track]",
    );
    if (!target) return;
    trackEvent(target.dataset.track || "interaction", {
      item:
        target.dataset.trackItem || target.getAttribute("href") || "unknown",
      placement: placementOf(target),
    });
  });

  addEventListener("rb:track", ((
    event: CustomEvent<{ name: string; data?: EventData }>,
  ) => {
    if (!event.detail?.name) return;
    trackEvent(event.detail.name, event.detail.data);
  }) as EventListener);
}

initAnalytics();
document.addEventListener("astro:page-load", initAnalytics);
