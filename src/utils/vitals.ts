// ─────────────────────────────────────────────────────────────────────────────
//  Core Web Vitals collector — zero dependencies.
//
//  Measures LCP, CLS, INP (approx.), FCP and TTFB with PerformanceObserver and
//  ships one batched "web_vitals" event to GA4 when the page is hidden.
//  GA4 is optional: set PUBLIC_GA4_ID (e.g. "G-XXXXXXXXXX") in .env to enable;
//  without it the module stays a silent no-op in production and logs in dev.
//  Every event carries device_category (mobile/desktop) for per-device slicing.
// ─────────────────────────────────────────────────────────────────────────────

const GA4_ID = import.meta.env.PUBLIC_GA4_ID as string | undefined;
const DEV = import.meta.env.DEV;

type Metrics = Partial<Record<"LCP" | "CLS" | "INP" | "FCP" | "TTFB", number>>;

const metrics: Metrics = {};
const deviceCategory = matchMedia("(max-width: 760px), (pointer: coarse)").matches ? "mobile" : "desktop";
let sent = false;

const observe = (type: string, callback: (entries: PerformanceEntry[]) => void, extra?: PerformanceObserverInit) => {
  try {
    const observer = new PerformanceObserver((list) => callback(list.getEntries()));
    observer.observe({ type, buffered: true, ...extra } as PerformanceObserverInit);
    return observer;
  } catch {
    return null; // metric not supported in this browser
  }
};

// LCP — the last candidate before first interaction / page hide wins.
observe("largest-contentful-paint", (entries) => {
  const last = entries[entries.length - 1];
  if (last) metrics.LCP = Math.round(last.startTime);
});

// CLS — sum of shifts without recent input, grouped into session windows.
let clsValue = 0;
let sessionValue = 0;
let sessionLast = 0;
let sessionFirst = 0;
observe("layout-shift", (entries) => {
  for (const entry of entries as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
    if (entry.hadRecentInput) continue;
    if (sessionValue && (entry.startTime - sessionLast > 1000 || entry.startTime - sessionFirst > 5000)) {
      clsValue = Math.max(clsValue, sessionValue);
      sessionValue = 0;
    }
    if (!sessionValue) sessionFirst = entry.startTime;
    sessionValue += entry.value;
    sessionLast = entry.startTime;
    metrics.CLS = Math.round(Math.max(clsValue, sessionValue) * 1000) / 1000;
  }
});

// INP approximation — the worst interaction duration seen on the page.
observe("event", (entries) => {
  for (const entry of entries as (PerformanceEntry & { duration: number; interactionId?: number })[]) {
    if (!entry.interactionId) continue;
    metrics.INP = Math.max(metrics.INP ?? 0, Math.round(entry.duration));
  }
}, { durationThreshold: 40 } as PerformanceObserverInit);

// FCP + TTFB — one-shot reads.
observe("paint", (entries) => {
  const fcp = entries.find((entry) => entry.name === "first-contentful-paint");
  if (fcp) metrics.FCP = Math.round(fcp.startTime);
});
const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
if (navigation) metrics.TTFB = Math.round(navigation.responseStart);

function send() {
  if (sent || !Object.keys(metrics).length) return;
  sent = true;

  if (DEV) console.debug("[vitals]", deviceCategory, metrics);
  if (!GA4_ID) return;

  const gtag = (window as any).gtag as ((...args: unknown[]) => void) | undefined;
  const payload = {
    device_category: deviceCategory,
    page_path: location.pathname,
    ...Object.fromEntries(Object.entries(metrics).map(([key, value]) => [`metric_${key.toLowerCase()}`, value])),
  };

  if (gtag) {
    gtag("event", "web_vitals", payload);
    return;
  }

  // No gtag on the page — fall back to the GA4 Measurement Protocol image hit.
  const params = new URLSearchParams({
    v: "2",
    tid: GA4_ID,
    cid: `${Date.now()}.${Math.floor(Math.random() * 1e9)}`,
    en: "web_vitals",
    dl: location.href,
    ...Object.fromEntries(Object.entries(payload).map(([key, value]) => [`ep.${key}`, String(value)])),
  });
  navigator.sendBeacon?.(`https://www.google-analytics.com/g/collect?${params}`);
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") send();
});
addEventListener("pagehide", send);
