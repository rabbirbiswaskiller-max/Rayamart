// Sends a custom event to Vercel Web Analytics.
// If the visitor opted out (?noanalytics=1) the script is never loaded, so window.va is missing and this does nothing.
type TrackData = Record<string, string | number | boolean>;

export function track(name: string, data?: TrackData) {
  if (typeof window === "undefined") return;
  try {
    const va = (window as unknown as { va?: (...args: unknown[]) => void }).va;
    va?.("event", { name, data });
  } catch {
    // Analytics must never break the shop.
  }
}
