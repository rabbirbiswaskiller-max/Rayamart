import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";

/** Minimal signed-in identity for the site header (no orders, no addresses). */
export type HeaderUser = { signedIn: false } | { signedIn: true; name: string; initials: string };

/** Up to two initials from a name ("Rabbi Biswas" → "RB"). Works for Bangla too. */
export function initialsOf(name: string, fallback = "R"): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  const first = [...parts[0]][0] ?? fallback;
  const last = parts.length > 1 ? ([...parts[parts.length - 1]][0] ?? "") : "";
  return (first + last).toUpperCase();
}

/**
 * Who is signed in, for the header. Runs in the root loader so every page knows
 * the session on first paint and after a refresh. Never throws: a header failure
 * must not break the storefront, so any error reads as signed out.
 */
export const getHeaderUser = createServerFn({ method: "GET" }).handler(async (): Promise<HeaderUser> => {
  try {
    const { getSessionUser } = await import("@/lib/auth/verify.server");
    const user = await getSessionUser();
    if (!user) return { signedIn: false };
    const sql = await getSql();
    const rows = await sql.query<{ name: string }>('SELECT name FROM "user" WHERE id = $1 LIMIT 1', [user.id]);
    const name = (rows[0]?.name ?? "").trim() || (user.email ?? "").split("@")[0] || "";
    return { signedIn: true, name, initials: initialsOf(name) };
  } catch {
    return { signedIn: false };
  }
});
