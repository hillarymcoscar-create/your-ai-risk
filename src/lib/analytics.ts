// Lightweight GA4 wrapper. Safe to call before gtag has loaded.

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

export const track = (event: string, params: Record<string, unknown> = {}) => {
  if (typeof window === "undefined") return;
  try {
    if (typeof window.gtag === "function") {
      window.gtag("event", event, params);
    } else {
      // Queue via dataLayer if gtag hasn't initialised yet.
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event, ...params });
    }
  } catch {
    /* never let analytics break the app */
  }
};

/** Fires a given event at most once per browser session (per key). */
export const trackOnce = (
  key: string,
  event: string,
  params: Record<string, unknown> = {},
) => {
  if (typeof window === "undefined") return;
  try {
    const storageKey = `ga_once:${key}`;
    if (sessionStorage.getItem(storageKey)) return;
    sessionStorage.setItem(storageKey, "1");
  } catch {
    // If sessionStorage is unavailable, still fire so we don't lose the event.
  }
  track(event, params);
};
