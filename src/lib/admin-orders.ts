import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { expireStaleOrders, type StoredOrder } from "@/lib/orders";

export type FulfillmentStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";
export const FULFILLMENT_STATUSES: FulfillmentStatus[] = ["pending", "processing", "shipped", "delivered", "cancelled"];

// Extra fields the admin keeps on an order (not shown to customers).
type StoredAdminOrder = StoredOrder & { fulfillment?: FulfillmentStatus; tracking?: string; adminNote?: string };

export type AdminOrderRow = StoredOrder & { fulfillment: FulfillmentStatus; tracking: string; adminNote: string };

export type DashboardStats = {
  todayNew: number;
  totalOrders: number;
  pending: number;
  awaitingPayment: number;
  todaySales: number;
  monthSales: number;
  todayProfit: number;
  monthProfit: number;
  // Paid orders with no cost price recorded, so they are left out of profit.
  unknownProfitOrders: number;
};

const BD_OFFSET = 6 * 3600 * 1000; // Bangladesh time is UTC+6

// YYYY-MM-DD in Bangladesh time.
function bdDay(iso: string): string {
  return new Date(new Date(iso).getTime() + BD_OFFSET).toISOString().slice(0, 10);
}

function fulfillmentOf(o: StoredAdminOrder): FulfillmentStatus {
  if (o.cancelled) return "cancelled";
  if (o.delivered) return "delivered";
  return o.fulfillment ?? "pending";
}

// Estimated profit = amount after discount minus what we pay the house.
// Delivery fee is left out (it goes to the courier). Null when a cost is missing.
function profitOf(o: StoredOrder): number | null {
  if (!o.lines.every((line) => typeof line.cost === "number")) return null;
  const cost = o.lines.reduce((sum, line) => sum + (line.cost as number) * line.qty, 0);
  return o.subtotal - (o.discount ?? 0) - cost;
}

async function requireAdmin(): Promise<void> {
  const { getSessionUser } = await import("@/lib/auth/verify.server");
  const user = await getSessionUser();
  const allowedEmail = process.env.RAYA_ADMIN_EMAIL?.trim().toLowerCase();
  if (!user?.email || !allowedEmail || user.email.trim().toLowerCase() !== allowedEmail) {
    throw new Error("Admin access required");
  }
}

async function loadAll(): Promise<AdminOrderRow[]> {
  await expireStaleOrders();
  const sql = await getSql();
  const rows = await sql.query<{ data: StoredAdminOrder }>("SELECT data FROM raya_orders ORDER BY created_at DESC LIMIT 500");
  return rows.map(({ data: o }) => ({
    ...o,
    fulfillment: fulfillmentOf(o),
    tracking: o.tracking ?? "",
    adminNote: o.adminNote ?? "",
  }));
}

// All orders, newest first, with their fulfillment status.
export const listAdminOrdersFull = createServerFn({ method: "GET" }).handler(async (): Promise<AdminOrderRow[]> => {
  await requireAdmin();
  return loadAll();
});

// Dashboard numbers. Sales count paid orders that are not cancelled, by payment day.
export const getDashboardStats = createServerFn({ method: "GET" }).handler(async (): Promise<DashboardStats> => {
  await requireAdmin();
  const all = await loadAll();
  const today = bdDay(new Date().toISOString());
  const month = today.slice(0, 7);
  let todayNew = 0;
  let pending = 0;
  let awaitingPayment = 0;
  let todaySales = 0;
  let monthSales = 0;
  let todayProfit = 0;
  let monthProfit = 0;
  let unknownProfitOrders = 0;
  for (const o of all) {
    if (bdDay(o.createdAt) === today) todayNew += 1;
    if (!o.paid && !o.cancelled) awaitingPayment += 1;
    if (o.paid && (o.fulfillment === "pending" || o.fulfillment === "processing" || o.fulfillment === "shipped")) {
      pending += 1;
    }
    if (o.paid && !o.cancelled) {
      const paidDay = bdDay(o.paidAt ?? o.createdAt);
      const profit = profitOf(o);
      if (profit === null) unknownProfitOrders += 1;
      if (paidDay === today) {
        todaySales += o.total;
        if (profit !== null) todayProfit += profit;
      }
      if (paidDay.slice(0, 7) === month) {
        monthSales += o.total;
        if (profit !== null) monthProfit += profit;
      }
    }
  }
  return {
    todayNew,
    totalOrders: all.length,
    pending,
    awaitingPayment,
    todaySales,
    monthSales,
    todayProfit,
    monthProfit,
    unknownProfitOrders,
  };
});

// Admin: change the fulfillment status, tracking number and internal note of an order.
export const setOrderFulfillment = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; status: FulfillmentStatus; tracking: string; note: string }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    await requireAdmin();
    if (!/^RM-[A-F0-9]{32}$/.test(data.id)) throw new Error("Order not found.");
    if (!FULFILLMENT_STATUSES.includes(data.status)) throw new Error("Invalid status.");

    const sql = await getSql();
    const rows = await sql.query<{ data: StoredAdminOrder }>("SELECT data FROM raya_orders WHERE id = $1 LIMIT 1", [data.id]);
    const order = rows[0]?.data;
    if (!order) throw new Error("Order not found.");

    const needsPayment = data.status === "processing" || data.status === "shipped" || data.status === "delivered";
    if (needsPayment && !order.paid && order.customer.pay !== "cod") {
      throw new Error("পেমেন্ট নিশ্চিত না হলে এই স্ট্যাটাস দেওয়া যাবে না।");
    }

    const patch = {
      fulfillment: data.status,
      delivered: data.status === "delivered",
      deliveredAt: data.status === "delivered" ? new Date().toISOString() : null,
      cancelled: data.status === "cancelled",
      tracking: data.tracking.trim().slice(0, 100),
      adminNote: data.note.trim().slice(0, 1000),
    };
    await sql.query("UPDATE raya_orders SET data = data || $2::jsonb, updated_at = now() WHERE id = $1", [data.id, JSON.stringify(patch)]);
    return { ok: true };
  });
