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
  paid?: boolean;
  paidTrx?: string;
  paidAt?: string;
  delivered?: boolean;
  deliveredAt?: string;
  cancelled?: boolean;
  // Partner (affiliate) code from the ?ref= link the customer came through.
  ref?: string;
};

const SHIP_FEE = 120;
const DISCOUNT_OVER = 3000;
const DISCOUNT_RATE = 0.03;
const PARTNER_RATE = 0.1;
const REF_PATTERN = /^[a-z0-9-]{2,40}$/;
const validPays = new Set<PayMethod>(["bkash", "nagad", "card", "cod"]);

export const createCustomerOrder = createServerFn({ method: "POST" })
  .inputValidator((data: { customer: Customer; items: { slug: string; qty: number }[]; ref?: string }) => data)
  .handler(async ({ data }): Promise<{ id: string }> => {
    const customer = data.customer;
    if (!customer || customer.name.trim().length < 2) throw new Error("নাম সঠিকভাবে লিখো।");
    const phone = customer.phone.replace(/\s/g, "");
    if (!/^01\d{9}$/.test(phone)) throw new Error("১১ সংখ্যার বাংলাদেশি মোবাইল নম্বর দাও।");
    if (!customer.city?.trim() || customer.address.trim().length < 8) throw new Error("শহর ও পূর্ণ ঠিকানা দাও।");
    if (!validPays.has(customer.pay)) throw new Error("পেমেন্ট পদ্ধতি সঠিক নয়।");
    if (!Array.isArray(data.items) || data.items.length < 1 || data.items.length > 50) throw new Error("কার্টে প্রোডাক্ট নেই।");

    const sql = await getSql();
    const lines: OrderLine[] = [];
    for (const item of data.items) {
      if (!item || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug) || !Number.isInteger(item.qty) || item.qty < 1 || item.qty > 8) {
        throw new Error("কার্টের প্রোডাক্টের তথ্য সঠিক নয়।");
      }
      const rows = await sql.query<{ data: Product }>("SELECT data FROM raya_products WHERE slug = $1 LIMIT 1", [item.slug]);
      const product = rows[0]?.data;
      if (!product) throw new Error("একটি প্রোডাক্ট আর পাওয়া যাচ্ছে না। পেজ রিফ্রেশ করে আবার চেষ্টা করো।");
      lines.push({ slug: product.slug, name: product.name, qty: item.qty, price: Number(product.price), image: product.image });
    }
    if (customer.pay === "cod") {
      const products = await Promise.all(lines.map(async (line) => {
        const rows = await sql.query<{ data: Product }>("SELECT data FROM raya_products WHERE slug = $1 LIMIT 1", [line.slug]);
        return rows[0]?.data;
      }));
      if (products.some((p) => !p?.landed)) throw new Error("Cash on delivery শুধু Dhaka-তে ready থাকা প্রোডাক্টে পাওয়া যাবে।");
    }
    const subtotal = lines.reduce((sum, line) => sum + line.price * line.qty, 0);
    const isCOD = customer.pay === "cod";
    const discount = !isCOD && subtotal >= DISCOUNT_OVER ? Math.round(subtotal * DISCOUNT_RATE) : 0;
    const shipping = isCOD ? SHIP_FEE : 0;
    const id = `RM-${crypto.randomUUID().replace(/-/g, "").toUpperCase()}`;
    const ref = typeof data.ref === "string" ? data.ref.trim().toLowerCase() : "";
    const order: StoredOrder = {
      id, createdAt: new Date().toISOString(), lines, subtotal, discount, shipping,
      total: subtotal - discount + shipping, advanceDue: isCOD ? SHIP_FEE : 0,
      dueOnDelivery: isCOD ? subtotal : 0,
      customer: { ...customer, name: customer.name.trim(), phone, address: customer.address.trim(), note: (customer.note ?? "").trim() },
      ...(REF_PATTERN.test(ref) ? { ref } : {}),
    };
    await sql.query("INSERT INTO raya_orders (id, data, created_at, updated_at) VALUES ($1, $2::jsonb, now(), now())", [id, JSON.stringify(order)]);
    return { id };
  });

export const getCustomerOrder = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }): Promise<StoredOrder | null> => {
    if (!/^RM-[A-F0-9]{32}$/.test(data.id)) return null;
    const sql = await getSql();
    const rows = await sql.query<{ data: StoredOrder }>("SELECT data FROM raya_orders WHERE id = $1 LIMIT 1", [data.id]);
    return rows[0]?.data ?? null;
  });

// Customer submits the TrxID. For bKash/Nagad the full total is checked; for
// cash on delivery only the advance delivery fee is checked. The server asks
// the Apps Script (which checks the SMS log) whether that TrxID arrived with
// the exact amount.
export const submitPaymentTrx = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; trx: string }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean; message: string }> => {
    if (!/^RM-[A-F0-9]{32}$/.test(data.id)) return { ok: false, message: "Order not found." };
    const trx = String(data.trx || "").trim().toUpperCase();
    if (!/^[A-Z0-9]{6,20}$/.test(trx)) return { ok: false, message: "Enter a valid TrxID." };

    const sql = await getSql();
    const rows = await sql.query<{ data: StoredOrder }>("SELECT data FROM raya_orders WHERE id = $1 LIMIT 1", [data.id]);
    const order = rows[0]?.data;
    if (!order) return { ok: false, message: "Order not found." };
    if (order.paid) return { ok: true, message: "Payment already confirmed." };
    const method = order.customer.pay;
    if (method !== "bkash" && method !== "nagad" && method !== "cod") {
      return { ok: false, message: "This order is not paid by bKash, Nagad or cash on delivery." };
    }
    const amountDue = method === "cod" ? order.advanceDue : order.total;

    const base = process.env.APPS_SCRIPT_URL;
    const secret = process.env.APPS_SCRIPT_SECRET;
    if (!base || !secret) return { ok: false, message: "Payment check is not set up yet." };

    const url = new URL(base);
    url.searchParams.set("key", secret);
    url.searchParams.set("trx", trx);
    url.searchParams.set("amount", String(amountDue));
    url.searchParams.set("orderId", order.id);

    const res = await fetch(url.toString());
    const result = (await res.json().catch(() => ({ ok: false }))) as { ok?: boolean; error?: string };
    if (!result.ok) {
      const messages: Record<string, string> = {
        not_found: "We cannot see this TrxID yet. Wait a minute and try again.",
        already_used: "This TrxID was already used for another order.",
        amount_mismatch: `The amount does not match. Please send exactly ৳${amountDue}.`,
      };
      return { ok: false, message: messages[result.error ?? ""] ?? "Could not verify the payment. Please try again." };
    }

    await sql.query(
      "UPDATE raya_orders SET data = data || $2::jsonb, updated_at = now() WHERE id = $1",
      [order.id, JSON.stringify({ paid: true, paidTrx: trx, paidAt: new Date().toISOString() })],
    );
    return { ok: true, message: "Payment confirmed. Thank you." };
  });

async function requireAdmin(): Promise<void> {
  const { getSessionUser } = await import("@/lib/auth/verify.server");
  const user = await getSessionUser();
  const allowedEmail = process.env.RAYA_ADMIN_EMAIL?.trim().toLowerCase();
  if (!user?.email || !allowedEmail || user.email.trim().toLowerCase() !== allowedEmail) {
    throw new Error("Admin access required");
  }
}

async function allOrders(): Promise<StoredOrder[]> {
  const sql = await getSql();
  const rows = await sql.query<{ data: StoredOrder }>("SELECT data FROM raya_orders ORDER BY created_at DESC LIMIT 500");
  return rows.map((row) => row.data);
}

// Dashboard: only orders whose payment is confirmed.
export const listAdminOrders = createServerFn({ method: "GET" })
  .handler(async (): Promise<StoredOrder[]> => {
    await requireAdmin();
    return (await allOrders()).filter((order) => order.paid === true);
  });

// Payments page: every order, paid or waiting.
export const listAllAdminOrders = createServerFn({ method: "GET" })
  .handler(async (): Promise<StoredOrder[]> => {
    await requireAdmin();
    return allOrders();
  });

export type CustomerOrderStatus = "unpaid" | "paid" | "delivered" | "cancelled";

// Public tracking: needs the order number AND the mobile used at checkout.
// Returns only what the customer should see, never the address or TrxID.
export const trackOrder = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; phone: string }) => data)
  .handler(async ({ data }): Promise<
    | { found: false }
    | {
        found: true;
        id: string;
        createdAt: string;
        total: number;
        advanceDue: number;
        pay: PayMethod;
        city: string;
        items: string[];
        status: CustomerOrderStatus;
      }
  > => {
    const id = String(data.id || "").trim().toUpperCase();
    const phone = String(data.phone || "").replace(/\s/g, "");
    if (!/^RM-[A-F0-9]{32}$/.test(id) || !/^01\d{9}$/.test(phone)) return { found: false };
    const sql = await getSql();
    const rows = await sql.query<{ data: StoredOrder }>("SELECT data FROM raya_orders WHERE id = $1 LIMIT 1", [id]);
    const order = rows[0]?.data;
    if (!order || order.customer.phone !== phone) return { found: false };
    const status: CustomerOrderStatus = order.cancelled
      ? "cancelled"
      : order.delivered
        ? "delivered"
        : order.paid
          ? "paid"
          : "unpaid";
    return {
      found: true,
      id: order.id,
      createdAt: order.createdAt,
      total: order.total,
      advanceDue: order.advanceDue ?? 0,
      pay: order.customer.pay,
      city: order.customer.city,
      items: order.lines.map((line) => `${line.name} × ${line.qty}`),
      status,
    };
  });

// Admin: mark an order delivered, cancelled, or open again.
export const setOrderStatus = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; status: "open" | "delivered" | "cancelled" }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    await requireAdmin();
    if (!/^RM-[A-F0-9]{32}$/.test(data.id)) throw new Error("Order not found.");
    if (!["open", "delivered", "cancelled"].includes(data.status)) throw new Error("Invalid status.");
    const sql = await getSql();
    const patch = {
      delivered: data.status === "delivered",
      deliveredAt: data.status === "delivered" ? new Date().toISOString() : null,
      cancelled: data.status === "cancelled",
    };
    await sql.query(
      "UPDATE raya_orders SET data = data || $2::jsonb, updated_at = now() WHERE id = $1",
      [data.id, JSON.stringify(patch)],
    );
    return { ok: true };
  });

export type CommissionState = "none" | "unpaid" | "pending" | "approved" | "cancelled";

export type PartnerOrderRow = {
  id: string;
  createdAt: string;
  ref: string | null;
  customerName: string;
  phone: string;
  pay: PayMethod;
  total: number;
  paid: boolean;
  paidTrx: string | null;
  status: "open" | "delivered" | "cancelled";
  commission: number;
  commissionState: CommissionState;
};

export type PartnerSummary = {
  ref: string;
  orders: number;
  paid: number;
  pending: number;
  approved: number;
  cancelled: number;
};

// Commission = 10% of the product amount after discount (delivery fee excluded).
// It is pending once the payment is confirmed and approved only after delivery.
function commissionFor(order: StoredOrder): { commission: number; state: CommissionState } {
  if (!order.ref) return { commission: 0, state: "none" };
  const commission = Math.round((order.subtotal - (order.discount ?? 0)) * PARTNER_RATE);
  if (order.cancelled) return { commission, state: "cancelled" };
  if (!order.paid) return { commission, state: "unpaid" };
  if (order.delivered) return { commission, state: "approved" };
  return { commission, state: "pending" };
}

export const listPartnerReport = createServerFn({ method: "GET" })
  .handler(async (): Promise<{ orders: PartnerOrderRow[]; partners: PartnerSummary[] }> => {
    await requireAdmin();
    const all = await allOrders();
    const relevant = all.filter((order) => order.ref || order.paid);
    const orders: PartnerOrderRow[] = relevant.map((order) => {
      const { commission, state } = commissionFor(order);
      return {
        id: order.id,
        createdAt: order.createdAt,
        ref: order.ref ?? null,
        customerName: order.customer.name,
        phone: order.customer.phone,
        pay: order.customer.pay,
        total: order.total,
        paid: order.paid === true,
        paidTrx: order.paidTrx ?? null,
        status: order.cancelled ? "cancelled" : order.delivered ? "delivered" : "open",
        commission,
        commissionState: state,
      };
    });

    const byRef = new Map<string, PartnerSummary>();
    for (const row of orders) {
      if (!row.ref) continue;
      const entry = byRef.get(row.ref) ?? { ref: row.ref, orders: 0, paid: 0, pending: 0, approved: 0, cancelled: 0 };
      entry.orders += 1;
      if (row.paid) entry.paid += 1;
      if (row.commissionState === "pending") entry.pending += row.commission;
      if (row.commissionState === "approved") entry.approved += row.commission;
      if (row.commissionState === "cancelled") entry.cancelled += 1;
      byRef.set(row.ref, entry);
    }
    return { orders, partners: [...byRef.values()].sort((a, b) => b.approved - a.approved) };
  });
