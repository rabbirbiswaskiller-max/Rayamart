import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { expireStaleOrders, type StoredOrder } from "@/lib/orders";
import type { PayMethod } from "@/lib/catalog";

// Fields the admin keeps on an order (see admin-orders.ts).
type RawOrder = StoredOrder & { fulfillment?: string; tracking?: string; adminNote?: string };

const DAY = 86_400_000;
const BD_OFFSET = 6 * 3_600_000; // Bangladesh time is UTC+6

// YYYY-MM-DD in Bangladesh time.
function bdDay(iso: string): string {
  return new Date(new Date(iso).getTime() + BD_OFFSET).toISOString().slice(0, 10);
}

function shiftDay(day: string, n: number): string {
  return new Date(Date.parse(day) + n * DAY).toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / DAY);
}

function phoneFromEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const m = /^phone-880(1\d{9})@phone\.rayamart\.invalid$/i.exec(email);
  return m ? `0${m[1]}` : null;
}

function realEmail(email: string): string | null {
  return email.endsWith("@phone.rayamart.invalid") ? null : email;
}

// Profit = amount after discount minus what we pay the house. Null when a cost is missing.
function profitOf(o: StoredOrder): number | null {
  if (!o.lines.every((line) => typeof line.cost === "number")) return null;
  const cost = o.lines.reduce((sum, line) => sum + (line.cost as number) * line.qty, 0);
  return o.subtotal - (o.discount ?? 0) - cost;
}

function fulfillmentOf(o: RawOrder): string {
  if (o.cancelled) return "cancelled";
  if (o.delivered) return "delivered";
  return o.fulfillment ?? "pending";
}

async function requireAdmin(): Promise<void> {
  const { getSessionUser } = await import("@/lib/auth/verify.server");
  const user = await getSessionUser();
  const allowedEmail = process.env.RAYA_ADMIN_EMAIL?.trim().toLowerCase();
  if (!user?.email || !allowedEmail || user.email.trim().toLowerCase() !== allowedEmail) {
    throw new Error("Admin access required");
  }
}

// All orders, newest first.
async function loadOrders(): Promise<RawOrder[]> {
  await expireStaleOrders();
  const sql = await getSql();
  const rows = await sql.query<{ data: RawOrder }>("SELECT data FROM raya_orders ORDER BY created_at DESC LIMIT 5000");
  return rows.map((row) => row.data);
}

// ---------- Customer book ----------

export type CustomerRow = {
  phone: string;
  name: string;
  city: string;
  email: string | null;
  orders: number;
  paidOrders: number;
  paidTotal: number;
  lastOrderAt: string;
};

// Everyone who has placed an order, grouped by mobile number. Biggest buyers first.
export const listCustomerBook = createServerFn({ method: "GET" }).handler(async (): Promise<CustomerRow[]> => {
  await requireAdmin();
  const orders = await loadOrders();
  const sql = await getSql();
  const users = await sql.query<{ phone: string | null; email: string }>('SELECT phone, email FROM "user"');
  const accountByPhone = new Map<string, string | null>();
  for (const u of users) {
    const phone = u.phone || phoneFromEmail(u.email);
    if (phone) accountByPhone.set(phone, realEmail(u.email));
  }

  const byPhone = new Map<string, CustomerRow>();
  for (const o of orders) {
    const phone = o.customer.phone;
    let row = byPhone.get(phone);
    if (!row) {
      // Orders are newest first, so name and city come from the latest order.
      row = {
        phone,
        name: o.customer.name,
        city: o.customer.city,
        email: accountByPhone.get(phone) ?? null,
        orders: 0,
        paidOrders: 0,
        paidTotal: 0,
        lastOrderAt: o.createdAt,
      };
      byPhone.set(phone, row);
    }
    row.orders += 1;
    if (o.paid && !o.cancelled) {
      row.paidOrders += 1;
      row.paidTotal += o.total;
    }
  }
  return [...byPhone.values()].sort((a, b) => b.paidTotal - a.paidTotal || b.orders - a.orders);
});

// ---------- Customer detail ----------

export type CustomerOrderRow = {
  id: string;
  createdAt: string;
  paid: boolean;
  status: string;
  pay: PayMethod;
  total: number;
  subtotal: number;
  discount: number;
  profit: number | null;
  lines: { name: string; qty: number; price: number }[];
  tracking: string;
  adminNote: string;
};

export type CustomerDetail = {
  phone: string;
  name: string;
  city: string;
  address: string;
  note: string;
  email: string | null;
  accountCreatedAt: string | null;
  totals: { orders: number; paidOrders: number; paidTotal: number; profit: number; unknownProfit: number };
  orders: CustomerOrderRow[];
};

export const getCustomerDetail = createServerFn({ method: "GET" })
  .inputValidator((data: { phone: string }) => data)
  .handler(async ({ data }): Promise<CustomerDetail | null> => {
    await requireAdmin();
    const phone = String(data.phone || "").replace(/\s/g, "");
    if (!/^01\d{9}$/.test(phone)) throw new Error("Invalid phone.");
    await expireStaleOrders();
    const sql = await getSql();
    const rows = await sql.query<{ data: RawOrder }>(
      "SELECT data FROM raya_orders WHERE data->'customer'->>'phone' = $1 ORDER BY created_at DESC LIMIT 300",
      [phone],
    );
    const orders = rows.map((row) => row.data);
    if (orders.length === 0) return null;

    const internal = `phone-880${phone.slice(1)}@phone.rayamart.invalid`;
    const accounts = await sql.query<{ email: string; createdAt: string | Date }>(
      'SELECT email, "createdAt" FROM "user" WHERE phone = $1 OR LOWER(email) = $2 LIMIT 1',
      [phone, internal],
    );
    const account = accounts[0];
    const latest = orders[0].customer;

    let paidOrders = 0;
    let paidTotal = 0;
    let profit = 0;
    let unknownProfit = 0;
    const outRows: CustomerOrderRow[] = orders.map((o) => {
      const p = profitOf(o);
      if (o.paid === true && !o.cancelled) {
        paidOrders += 1;
        paidTotal += o.total;
        if (p === null) unknownProfit += 1;
        else profit += p;
      }
      return {
        id: o.id,
        createdAt: o.createdAt,
        paid: o.paid === true,
        status: fulfillmentOf(o),
        pay: o.customer.pay,
        total: o.total,
        subtotal: o.subtotal,
        discount: o.discount ?? 0,
        profit: p,
        lines: o.lines.map((l) => ({ name: l.name, qty: l.qty, price: l.price })),
        tracking: o.tracking ?? "",
        adminNote: o.adminNote ?? "",
      };
    });

    return {
      phone,
      name: latest.name,
      city: latest.city,
      address: latest.address,
      note: latest.note ?? "",
      email: account ? realEmail(account.email) : null,
      accountCreatedAt: account ? new Date(account.createdAt).toISOString() : null,
      totals: { orders: orders.length, paidOrders, paidTotal, profit, unknownProfit },
      orders: outRows,
    };
  });

// ---------- Sales reports ----------

export type ReportBucket = {
  label: string;
  orders: number;
  sales: number;
  profit: number;
  unknownProfit: number;
};

export type TopProduct = {
  slug: string;
  name: string;
  qty: number;
  revenue: number;
  profit: number | null;
};

export type SalesReport = {
  daily: ReportBucket[];
  weekly: ReportBucket[];
  monthly: ReportBucket[];
  top: TopProduct[];
};

// Sales count paid, not cancelled orders by payment day (Bangladesh time).
export const getSalesReport = createServerFn({ method: "GET" }).handler(async (): Promise<SalesReport> => {
  await requireAdmin();
  const orders = (await loadOrders()).filter((o) => o.paid === true && !o.cancelled);
  const today = bdDay(new Date().toISOString());

  const newBucket = (label: string): ReportBucket => ({ label, orders: 0, sales: 0, profit: 0, unknownProfit: 0 });

  const dailyMap = new Map<string, ReportBucket>();
  for (let i = 0; i < 30; i++) {
    const day = shiftDay(today, -i);
    dailyMap.set(day, newBucket(day));
  }

  // Weeks are 7-day blocks ending today: index 0 is the last 7 days.
  const weekly: ReportBucket[] = [];
  for (let w = 0; w < 8; w++) {
    weekly.push(newBucket(`${shiftDay(today, -(w * 7 + 6))} – ${shiftDay(today, -w * 7)}`));
  }

  const monthlyMap = new Map<string, ReportBucket>();
  for (let m = 0; m < 12; m++) {
    const d = new Date(Date.parse(today));
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() - m);
    const key = d.toISOString().slice(0, 7);
    monthlyMap.set(key, newBucket(key));
  }

  const add = (b: ReportBucket, o: StoredOrder, profit: number | null) => {
    b.orders += 1;
    b.sales += o.total;
    if (profit === null) b.unknownProfit += 1;
    else b.profit += profit;
  };

  const perProduct = new Map<string, TopProduct & { known: boolean }>();
  for (const o of orders) {
    const day = bdDay(o.paidAt ?? o.createdAt);
    const profit = profitOf(o);
    const daily = dailyMap.get(day);
    if (daily) add(daily, o, profit);
    const ago = daysBetween(day, today);
    if (ago >= 0 && ago < 56) add(weekly[Math.floor(ago / 7)], o, profit);
    const month = monthlyMap.get(day.slice(0, 7));
    if (month) add(month, o, profit);

    for (const line of o.lines) {
      const cur = perProduct.get(line.slug) ?? { slug: line.slug, name: line.name, qty: 0, revenue: 0, profit: 0, known: true };
      cur.qty += line.qty;
      cur.revenue += line.price * line.qty;
      if (typeof line.cost === "number") cur.profit = (cur.profit ?? 0) + (line.price - line.cost) * line.qty;
      else cur.known = false;
      perProduct.set(line.slug, cur);
    }
  }

  const top: TopProduct[] = [...perProduct.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)
    .map((p) => ({ slug: p.slug, name: p.name, qty: p.qty, revenue: p.revenue, profit: p.known ? p.profit : null }));

  return {
    daily: [...dailyMap.values()],
    weekly,
    monthly: [...monthlyMap.values()],
    top,
  };
});
