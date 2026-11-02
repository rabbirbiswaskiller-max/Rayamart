import { useEffect } from "react";
import { recordRefClick } from "@/lib/partner-dashboard";

const KEY = "raya-ref";
const REF_PATTERN = /^[a-z0-9-]{2,40}$/;
// A partner link credits the partner for 30 days after the visitor last opened it.
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Remember the partner code from a ?ref= link on this device for 30 days, so the
// order still carries it when the customer comes back later to check out.
// Each visit with a ?ref= link also counts as a click for that partner.
export function useRefCapture() {
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get("ref")?.trim().toLowerCase();
      if (ref && REF_PATTERN.test(ref)) {
        window.localStorage.setItem(KEY, JSON.stringify({ ref, expires: Date.now() + THIRTY_DAYS_MS }));
        recordRefClick({ data: { ref } }).catch(() => {});
      }
    } catch {
      /* storage blocked: the link just won't be remembered */
    }
  }, []);
}

export function readRef(): string | undefined {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return undefined;
    const saved = JSON.parse(raw) as { ref?: unknown; expires?: unknown };
    if (typeof saved.ref !== "string" || typeof saved.expires !== "number") return undefined;
    if (saved.expires < Date.now() || !REF_PATTERN.test(saved.ref)) {
      window.localStorage.removeItem(KEY);
      return undefined;
    }
    return saved.ref;
  } catch {
    return undefined;
  }
}
