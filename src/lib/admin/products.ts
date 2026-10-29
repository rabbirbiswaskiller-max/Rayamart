import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import type { Product } from "@/lib/catalog";

async function assertAdmin() {
  const { getSessionUser } = await import("@/lib/auth/verify.server");
  const user = await getSessionUser();
  const allowedEmail = process.env.RAYA_ADMIN_EMAIL?.trim().toLowerCase();
  if (!user?.email || !allowedEmail || user.email.trim().toLowerCase() !== allowedEmail) {
    throw new Error("Admin access required");
  }
}

function validateProduct(input: unknown): Product {
  if (!input || typeof input !== "object") throw new Error("Product data is missing.");
  const p = input as Partial<Product>;
  const requiredText = ["slug", "name", "house", "category", "origin", "image", "alt", "size", "blurb", "story"] as const;
  for (const key of requiredText) {
    if (typeof p[key] !== "string" || !p[key]!.trim()) throw new Error(`Please fill in ${key}.`);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug!)) throw new Error("Slug must use lowercase English letters, numbers and hyphens.");
  if (!Number.isFinite(p.price) || Number(p.price) < 1) throw new Error("Price must be greater than zero.");
  if (!Number.isFinite(p.rating) || Number(p.rating) < 0 || Number(p.rating) > 5) throw new Error("Rating must be from 0 to 5.");
  if (!Number.isFinite(p.reviews) || Number(p.reviews) < 0) throw new Error("Reviews must be zero or greater.");
  if (!Number.isFinite(p.featured)) throw new Error("Display order must be a number.");
  if (!Array.isArray(p.notes) || p.notes.some((n) => typeof n !== "string")) throw new Error("Product notes must be a list.");
  return {
    slug: p.slug!.trim(), name: p.name!.trim(), house: p.house!.trim(),
    category: p.category!.trim(), origin: p.origin!.trim(), price: Number(p.price),
    compareAt: p.compareAt ? Number(p.compareAt) : undefined,
    rating: Number(p.rating ?? 0), reviews: Number(p.reviews ?? 0),
    image: p.image!.trim(), alt: p.alt!.trim(), flash: Boolean(p.flash),
    landed: Boolean(p.landed), featured: Number(p.featured ?? 0), size: p.size!.trim(),
    blurb: p.blurb!.trim(), story: p.story!.trim(),
    notes: p.notes.map((n) => String(n).trim()).filter(Boolean),
  };
}

export const listStoreProducts = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const rows = await sql.query<{ data: Product }>("SELECT data FROM raya_products ORDER BY (data->>'featured')::int ASC, data->>'name' ASC");
  return rows.map((row) => row.data);
});

export const saveStoreProduct = createServerFn({ method: "POST" })
  .inputValidator((data: { product: Product }) => data)
  .handler(async ({ data }) => {
    await assertAdmin();
    const product = validateProduct(data.product);
    const sql = await getSql();
    await sql.query(
      "INSERT INTO raya_products (slug, data, updated_at) VALUES ($1, $2::jsonb, now()) ON CONFLICT (slug) DO UPDATE SET data = EXCLUDED.data, updated_at = now()",
      [product.slug, JSON.stringify(product)],
    );
    return { success: true, product };
  });

export const deleteStoreProduct = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    await assertAdmin();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)) throw new Error("Invalid product slug.");
    const sql = await getSql();
    await sql.query("DELETE FROM raya_products WHERE slug = $1", [data.slug]);
    return { success: true };
  });
