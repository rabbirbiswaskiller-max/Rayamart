import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import type { Product } from "@/lib/catalog";

const IMAGE_MAX_BYTES = 2_000_000;

export const uploadStoreImage = createServerFn({ method: "POST" })
  .inputValidator((data: { fileName: string; contentType: string; base64: string }) => data)
  .handler(async ({ data }) => {
    await assertAdmin();
    if (data.contentType !== "image/jpeg" && data.contentType !== "image/png" && data.contentType !== "image/webp" && data.contentType !== "image/gif") {
      throw new Error("শুধু JPG, PNG, WEBP বা GIF ছবি আপলোড করা যাবে।");
    }
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) throw new Error("Image storage এখনো প্রস্তুত নয়। Vercel BLOB_READ_WRITE_TOKEN সেটিং পরীক্ষা করতে হবে।");
    if (!data.base64 || data.base64.length > Math.ceil(IMAGE_MAX_BYTES * 1.4)) {
      throw new Error("ছবিটি অনেক বড়। ছোট ছবি বেছে আবার চেষ্টা করো।");
    }
    const bytes = Buffer.from(data.base64, "base64");
    if (!bytes.length || bytes.length > IMAGE_MAX_BYTES) throw new Error("ছবির সাইজ ২ MB-এর মধ্যে রাখো।");
    const safeName = data.fileName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-90) || "product-image.webp";
    const response = await fetch(`https://blob.vercel-storage.com/products/${Date.now()}-${safeName}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "x-api-version": "7",
        "x-content-type": data.contentType,
        "x-add-random-suffix": "1",
        "Content-Type": data.contentType,
      },
      body: bytes,
    });
    if (!response.ok) throw new Error("ছবি আপলোড হয়নি। আবার চেষ্টা করো।");
    const result = await response.json() as { url?: string };
    if (!result.url) throw new Error("আপলোড হয়েছে, কিন্তু ছবির লিংক পাওয়া যায়নি।");
    return { url: result.url };
  });

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

function withoutCost(product: Product): Product {
  const copy: Product = { ...product };
  delete copy.cost;
  return copy;
}

// Storefront and the Products page. Cost price is never returned here.
export const listStoreProducts = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const rows = await sql.query<{ data: Product }>("SELECT data FROM raya_products ORDER BY (data->>'featured')::int ASC, data->>'name' ASC");
  return rows.map((row) => withoutCost(row.data));
});

// Admin pricing page: includes cost and active flag.
export const listAdminProducts = createServerFn({ method: "GET" }).handler(async (): Promise<Product[]> => {
  await assertAdmin();
  const sql = await getSql();
  const rows = await sql.query<{ data: Product }>("SELECT data FROM raya_products ORDER BY (data->>'featured')::int ASC, data->>'name' ASC");
  return rows.map((row) => ({ ...row.data, active: row.data.active !== false }));
});

export const saveStoreProduct = createServerFn({ method: "POST" })
  .inputValidator((data: { product: Product }) => data)
  .handler(async ({ data }) => {
    await assertAdmin();
    const product = validateProduct(data.product);
    const sql = await getSql();
    // Keep cost and active flag already stored, unless this save sends new values.
    const existing = await sql.query<{ data: Product }>("SELECT data FROM raya_products WHERE slug = $1 LIMIT 1", [product.slug]);
    const prev = existing[0]?.data;
    const incoming = data.product as Partial<Product>;
    const merged: Product = {
      ...product,
      cost: typeof incoming.cost === "number" ? incoming.cost : prev?.cost,
      active: typeof incoming.active === "boolean" ? incoming.active : (prev?.active ?? true),
    };
    await sql.query(
      "INSERT INTO raya_products (slug, data, updated_at) VALUES ($1, $2::jsonb, now()) ON CONFLICT (slug) DO UPDATE SET data = EXCLUDED.data, updated_at = now()",
      [merged.slug, JSON.stringify(merged)],
    );
    return { success: true, product: withoutCost(merged) };
  });

// Admin: set cost price and on/off for one product.
export const updateProductMeta = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; cost: number; active: boolean }) => data)
  .handler(async ({ data }) => {
    await assertAdmin();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)) throw new Error("Invalid product slug.");
    if (!Number.isFinite(data.cost) || data.cost < 0) throw new Error("Cost price must be zero or more.");
    const sql = await getSql();
    await sql.query(
      "UPDATE raya_products SET data = data || $2::jsonb, updated_at = now() WHERE slug = $1",
      [data.slug, JSON.stringify({ cost: Math.round(data.cost), active: data.active === true })],
    );
    return { success: true };
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
