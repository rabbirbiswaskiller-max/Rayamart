import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import type { PayMethod, Product } from "@/lib/catalog";

type Customer = {
  name: string;
  phone: string;
  city: string;
  address: string;
  pay: PayMethod;
  note: string;
};
type OrderLine = { slug: string; name: string; qty: number; price: number; image: string };
export type StoredOrder = {
  id: string;
  createdAt: string;
  lines: OrderLine[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  advanceDue: number;
  dueOnDelivery: number;
  customer: Customer;
};

const SHIP_FEE = 120;
const DISCOUNT_OVER = 3000;
const DISCOUNT_RATE = 0.03;
const validPays = new Set<PayMethod>(["bkash", "nagad", "card", "cod"]);

export const createCustomerOrder = createServerFn({ method: "POST" })
  .inputValidator((data: { customer: Customer; items: { slug: string; qty: number }[] }) => data)
  .handler(async ({ data }): Promise<{ id: string }> => {
    const customer = data.customer;
    if (!customer || customer.name.trim().length < 2) throw new Error("নাম সঠিকভাবে লিখো।");
    const phone = customer.phone.replace(/\s/g, "");
    if (!/^01\d{9}$/.test(phone)) throw new Error("১১ সংখ্যার বাংলাদেশি মোবাইল নম্বর দাও।");
    if (!customer.city?.trim() || customer.address.trim().length < 8) throw new Error("শহর ও পূর্ণ ঠিকানা দাও।");
    if (!validPays.has(customer.pay)) throw new Error("পেমেন্ট পদ্ধতি সঠিক নয়।");
    if (!Array.isArray(data.items) || data.items.length < 1 || data.items.length > 50) throw new Error("কার্টে প্রোডাক্ট নেই।");

    const sql = await getSql();
    const lines: OrderLine[] = [];
    for (const item of data.items) {
      if (!item || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug) || !Number.isInteger(item.qty) || item.qty < 1 || item.qty > 8) {
        throw new Error("কার্টের প্রোডাক্টের তথ্য সঠিক নয়।");
      }
      const rows = await sql.query<{ data: Product }>("SELECT data FROM raya_products WHERE slug = $1 LIMIT 1", [item.slug]);
      const product = rows[0]?.data;
      if (!product) throw new Error("একটি প্রোডাক্ট আর পাওয়া যাচ্ছে না। পেজ রিফ্রেশ করে আবার চেষ্টা করো।");
      lines.push({ slug: product.slug, name: product.name, qty: item.qty, price: Number(product.price), image: product.image });
    }
    const allLanded = lines.every((line) => {
      // The persisted product is the source of truth for availability.
      return true;
    });
    if (customer.pay === "cod") {
      const products = await Promise.all(lines.map(async (line) => {
        const rows = await sql.query<{ data: Product }>("SELECT data FROM raya_products WHERE slug = $1 LIMIT 1", [line.slug]);
        return rows[0]?.data;
      }));
      if (products.some((p) => !p?.landed)) throw new Error("Cash on delivery শুধু Dhaka-তে ready থাকা প্রোডাক্টে পাওয়া যাবে।");
    }
    const subtotal = lines.reduce((sum, line) => sum + line.price * line.qty, 0);
    const isCOD = customer.pay === "cod";
    const discount = !isCOD && subtotal >= DISCOUNT_OVER ? Math.round(subtotal * DISCOUNT_RATE) : 0;
    const shipping = isCOD ? SHIP_FEE : 0;
    const id = `RM-${crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
    const order: StoredOrder = {
      id, createdAt: new Date().toISOString(), lines, subtotal, discount, shipping,
      total: subtotal - discount + shipping, advanceDue: isCOD ? SHIP_FEE : 0,
      dueOnDelivery: isCOD ? subtotal : 0,
      customer: { ...customer, name: customer.name.trim(), phone, address: customer.address.trim(), note: (customer.note ?? "").trim() },
    };
    await sql.query("INSERT INTO raya_orders (id, data, created_at, updated_at) VALUES ($1, $2::jsonb, now(), now())", [id, JSON.stringify(order)]);
    return { id };
  });

export const getCustomerOrder = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }): Promise<StoredOrder | null> => {
    if (!/^RM-[A-F0-9]{12}$/.test(data.id)) return null;
    const sql = await getSql();
    const rows = await sql.query<{ data: StoredOrder }>("SELECT data FROM raya_orders WHERE id = $1 LIMIT 1", [data.id]);
    return rows[0]?.data ?? null;
  });

export const listAdminOrders = createServerFn({ method: "GET" })
  .handler(async (): Promise<StoredOrder[]> => {
    const { getSessionUser } = await import("@/lib/auth/verify.server");
    const user = await getSessionUser();
    const allowedEmail = process.env.RAYA_ADMIN_EMAIL?.trim().toLowerCase();
    if (!user?.email || !allowedEmail || user.email.trim().toLowerCase() !== allowedEmail) {
      throw new Error("Admin access required");
    }
    const sql = await getSql();
    const rows = await sql.query<{ data: StoredOrder }>("SELECT data FROM raya_orders ORDER BY created_at DESC LIMIT 500");
    return rows.map((row) => row.data);
  });
