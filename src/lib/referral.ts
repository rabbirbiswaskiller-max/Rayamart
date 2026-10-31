import { useEffect } from "react";
import { recordRefClick } from "@/lib/partner-dashboard";

const KEY = "raya-ref";
const REF_PATTERN = /^[a-z0-9-]{2,40}$/;

// Remember the partner code from a ?ref= link on this device, so the order
// still carries it when the customer comes back later to check out.
// Each visit with a ?ref= link also counts as a click for that partner.
export function useRefCapture() {
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get("ref")?.trim().toLowerCase();
      if (ref && REF_PATTERN.test(ref)) {
        window.localStorage.setItem(KEY, ref);
        recordRefClick({ data: { ref } }).catch(() => {});
      }
    } catch {
      /* storage blocked: the link just won't be remembered */
    }
  }, []);
}

export function readRef(): string | undefined {
  try {
    const ref = window.localStorage.getItem(KEY);
    return ref && REF_PATTERN.test(ref) ? ref : undefined;
  } catch {
    return undefined;
  }
}
