import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { expireStaleOrders } from "@/lib/orders";
import type { PayMethod } from "@/lib/catalog";

// Customer accounts use a phone-based internal email: phone-8801XXXXXXXXX@phone.rayamart.invalid
// Orders are linked to an account by the mobile number used at checkout.
type StoredLike = {
  id: string;
  createdAt: string;
  lines: { name: string; qty: number }[];
  total: number;
  advanceDue?: number;
  customer: { phone: string; pay: PayMethod };
  paid?: boolean;
  delivered?: boolean;
  cancelled?: boolean;
};

export type AccountOrderStatus = "unpaid" | "paid" | "delivered" | "cancelled";
export type AccountOrder = {
  id: string;
  createdAt: string;
  items: string[];
  total: number;
  advanceDue: number;
  pay: PayMethod;
  status: AccountOrderStatus;
};

export type CustomerStats = {
  total: number;
  last7: number;
  last30: number;
  boughtCount: number;
  daily: { day: string; count: number }[];
};

function phoneFromEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const m = /^phone-880(1\d{9})@phone\.rayamart\.invalid$/i.exec(email);
  return m ? `0${m[1]}` : null;
}

function statusOf(o: StoredLike): AccountOrderStatus {
  if (o.cancelled) return "cancelled";
  if (o.delivered) return "delivered";
  if (o.paid) return "paid";
  return "unpaid";
}

async function requireAdmin(): Promise<void> {
  const { getSessionUser } = await import("@/lib/auth/verify.server");
  const user = await getSessionUser();
  const allowedEmail = process.env.RAYA_ADMIN_EMAIL?.trim().toLowerCase();
  if (!user?.email || !allowedEmail || user.email.trim().toLowerCase() !== allowedEmail) {
    throw new Error("Admin access required");
  }
}

// The signed-in customer's name, phone and their orders (matched by mobile number).
export const getMyAccount = createServerFn({ method: "GET" })
  .handler(async (): Promise<
    | { signedIn: false }
    | { signedIn: true; name: string; phone: string | null; orders: AccountOrder[] }
  > => {
    const { getSessionUser } = await import("@/lib/auth/verify.server");
    const user = await getSessionUser();
    if (!user) return { signedIn: false };

    await expireStaleOrders();
    const sql = await getSql();
    const nameRows = await sql.query<{ name: string }>('SELECT name FROM "user" WHERE id = $1 LIMIT 1', [user.id]);
    const phone = phoneFromEmail(user.email);
    const rows = phone
      ? await sql.query<{ data: StoredLike }>(
          "SELECT data FROM raya_orders WHERE data->'customer'->>'phone' = $1 ORDER BY created_at DESC LIMIT 100",
          [phone],
        )
      : [];

    return {
      signedIn: true,
      name: nameRows[0]?.name ?? "",
      phone,
      orders: rows.map(({ data: o }) => ({
        id: o.id,
        createdAt: o.createdAt,
        items: o.lines.map((line) => `${line.name} × ${line.qty}`),
        total: o.total,
        advanceDue: o.advanceDue ?? 0,
        pay: o.customer.pay,
        status: statusOf(o),
      })),
    };
  });

// Admin: how many customers signed up, how many of them have bought.
export const getCustomerStats = createServerFn({ method: "GET" })
  .handler(async (): Promise<CustomerStats> => {
    await requireAdmin();
    const sql = await getSql();
    const users = await sql.query<{ email: string; createdAt: string | Date }>(
      `SELECT email, "createdAt" FROM "user" WHERE email LIKE 'phone-%@phone.rayamart.invalid'`,
    );
    const buyerRows = await sql.query<{ phone: string | null }>(
      "SELECT DISTINCT data->'customer'->>'phone' AS phone FROM raya_orders WHERE data->>'paid' = 'true'",
    );
    const buyers = new Set<string>();
    for (const r of buyerRows) {
      if (r.phone) buyers.add(r.phone);
    }

    const DAY = 86_400_000;
    const BD = 6 * 3_600_000; // Bangladesh time is UTC+6
    const now = Date.now();
    const dayCounts = new Map<string, number>();
    let last7 = 0;
    let last30 = 0;
    let boughtCount = 0;
    for (const u of users) {
      const t = new Date(u.createdAt).getTime();
      const age = now - t;
      if (age <= 7 * DAY) last7 += 1;
      if (age <= 30 * DAY) last30 += 1;
      const day = new Date(t + BD).toISOString().slice(0, 10);
      dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
      const phone = phoneFromEmail(u.email);
      if (phone && buyers.has(phone)) boughtCount += 1;
    }

    const daily = [...dayCounts.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .slice(0, 30)
      .map(([day, count]) => ({ day, count }));

    return { total: users.length, last7, last30, boughtCount, daily };
  });
