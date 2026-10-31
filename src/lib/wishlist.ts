import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import type { Product } from "@/lib/catalog";

async function currentUserId(): Promise<string | null> {
  const { getSessionUser } = await import("@/lib/auth/verify.server");
  const user = await getSessionUser();
  return user?.id ?? null;
}

// Which products this shopper has saved (used on the product page).
export const getWishlistSlugs = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ signedIn: boolean; slugs: string[] }> => {
    const userId = await currentUserId();
    if (!userId) return { signedIn: false, slugs: [] };
    const sql = await getSql();
    const rows = await sql.query<{ slug: string }>(
      "SELECT slug FROM raya_wishlist WHERE user_id = $1 ORDER BY created_at DESC",
      [userId],
    );
    return { signedIn: true, slugs: rows.map((r) => r.slug) };
  },
);

// Saved products in full, for the account page. Cost price is never sent.
export const getMyWishlist = createServerFn({ method: "GET" }).handler(async (): Promise<Product[]> => {
  const userId = await currentUserId();
  if (!userId) return [];
  const sql = await getSql();
  const rows = await sql.query<{ data: Product }>(
    "SELECT p.data FROM raya_wishlist w JOIN raya_products p ON p.slug = w.slug WHERE w.user_id = $1 ORDER BY w.created_at DESC",
    [userId],
  );
  return rows
    .map((row) => {
      const copy: Product = { ...row.data };
      delete copy.cost;
      return copy;
    })
    .filter((p) => p.active !== false);
});

export const toggleWishlist = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; on: boolean }) => data)
  .handler(async ({ data }) => {
    const userId = await currentUserId();
    if (!userId) throw new Error("Log in first to save products.");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)) throw new Error("Invalid product.");
    const sql = await getSql();
    if (data.on) {
      await sql.query(
        "INSERT INTO raya_wishlist (user_id, slug) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [userId, data.slug],
      );
    } else {
      await sql.query("DELETE FROM raya_wishlist WHERE user_id = $1 AND slug = $2", [userId, data.slug]);
    }
    return { ok: true, on: data.on };
  });
