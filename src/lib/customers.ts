import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { expireStaleOrders } from "@/lib/orders";
import type { PayMethod } from "@/lib/catalog";

// Customers sign up with an email, or with a mobile number (stored as an internal email).
// Orders are linked to an account by the mobile number used at checkout (format 01XXXXXXXXX).
type RawLine = { name: string; qty: number; price: number };
type StoredLike = {
  id: string;
  createdAt: string;
  lines: RawLine[];
  subtotal: number;
  discount?: number;
  shipping?: number;
  total: number;
  advanceDue?: number;
  customer: { phone: string; pay: PayMethod; city?: string };
  paid?: boolean;
  delivered?: boolean;
  cancelled?: boolean;
  fulfillment?: string;
  tracking?: string;
};

export type AccountOrderStatus = "unpaid" | "paid" | "delivered" | "cancelled";
export type AccountOrder = {
  id: string;
  createdAt: string;
  items: string[];
  lines: RawLine[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  advanceDue: number;
  pay: PayMethod;
  status: AccountOrderStatus;
  fulfillment: string;
  tracking: string;
};

export type MyAccount =
  | { signedIn: false }
  | {
      signedIn: true;
      isAdmin: boolean;
      name: string;
      email: string;
      phone: string | null;
      orders: AccountOrder[];
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

function realEmail(email: string | null | undefined): string {
  if (!email || email.endsWith("@phone.rayamart.invalid")) return "";
  return email;
}

function adminEmail(): string {
  return (process.env.RAYA_ADMIN_EMAIL ?? "").trim().toLowerCase();
}

function isAdminEmail(email: string | null | undefined): boolean {
  const admin = adminEmail();
  return !!admin && !!email && email.trim().toLowerCase() === admin;
}

function statusOf(o: StoredLike): AccountOrderStatus {
  if (o.cancelled) return "cancelled";
  if (o.delivered) return "delivered";
  if (o.paid) return "paid";
  return "unpaid";
}

function fulfillmentOf(o: StoredLike): string {
  if (o.cancelled) return "cancelled";
  if (o.delivered) return "delivered";
  return o.fulfillment ?? "pending";
}

async function requireAdmin(): Promise<void> {
  const { getSessionUser } = await import("@/lib/auth/verify.server");
  const user = await getSessionUser();
  if (!user || !isAdminEmail(user.email)) {
    throw new Error("Admin access required");
  }
}

// Saves a mobile number on the account. Keeps the login email in step when the
// account signs in with a mobile number (internal email).
async function setPhone(userId: string, currentEmail: string, phone: string): Promise<void> {
  const sql = await getSql();
  const internal = `phone-880${phone.slice(1)}@phone.rayamart.invalid`;
  const taken = await sql.query<{ id: string }>(
    'SELECT id FROM "user" WHERE id <> $1 AND (phone = $2 OR LOWER(email) = $3) LIMIT 1',
    [userId, phone, internal],
  );
  if (taken.length > 0) throw new Error("এই মোবাইল নম্বরে আগেভাগে অ্যাকাউন্ট আছে।");
  if (currentEmail.endsWith("@phone.rayamart.invalid")) {
    await sql.query('UPDATE "user" SET phone = $1, email = $2 WHERE id = $3', [phone, internal, userId]);
  } else {
    await sql.query('UPDATE "user" SET phone = $1 WHERE id = $2', [phone, userId]);
  }
}

// The signed-in user's name, mobile and orders (matched by mobile number).
// Admins get isAdmin: true so the login page can send them to the dashboard.
export const getMyAccount = createServerFn({ method: "GET" }).handler(async (): Promise<MyAccount> => {
  const { getSessionUser } = await import("@/lib/auth/verify.server");
  const user = await getSessionUser();
  if (!user) return { signedIn: false };

  const sql = await getSql();
  const rows = await sql.query<{ name: string; email: string; phone: string | null }>(
    'SELECT name, email, phone FROM "user" WHERE id = $1 LIMIT 1',
    [user.id],
  );
  const me = rows[0];
  const email = me?.email ?? user.email ?? "";
  const isAdmin = isAdminEmail(email);
  const phone = me?.phone || phoneFromEmail(email);

  if (isAdmin) {
    return { signedIn: true, isAdmin: true, name: me?.name ?? "", email: "", phone: null, orders: [] };
  }

  await expireStaleOrders();
  const orderRows = phone
    ? await sql.query<{ data: StoredLike }>(
        "SELECT data FROM raya_orders WHERE data->'customer'->>'phone' = $1 ORDER BY created_at DESC LIMIT 100",
        [phone],
      )
    : [];

  return {
    signedIn: true,
    isAdmin: false,
    name: me?.name ?? "",
    email: realEmail(email),
    phone,
    orders: orderRows.map(({ data: o }) => ({
      id: o.id,
      createdAt: o.createdAt,
      items: o.lines.map((line) => `${line.name} × ${line.qty}`),
      lines: o.lines.map((l) => ({ name: l.name, qty: l.qty, price: l.price })),
      subtotal: o.subtotal,
      discount: o.discount ?? 0,
      shipping: o.shipping ?? 0,
      total: o.total,
      advanceDue: o.advanceDue ?? 0,
      pay: o.customer.pay,
      status: statusOf(o),
      fulfillment: fulfillmentOf(o),
      tracking: o.tracking ?? "",
    })),
  };
});

// Save the mobile number on the signed-in account (phone format 01XXXXXXXXX).
export const saveMyPhone = createServerFn({ method: "POST" })
  .inputValidator((data: { phone: string }) => data)
  .handler(async ({ data }) => {
    const { getSessionUser } = await import("@/lib/auth/verify.server");
    const user = await getSessionUser();
    if (!user) throw new Error("আগে লগইন করুন।");
    if (!/^01[3-9]\d{8}$/.test(data.phone)) throw new Error("সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX)।");
    const sql = await getSql();
    const me = (await sql.query<{ email: string }>('SELECT email FROM "user" WHERE id = $1 LIMIT 1', [user.id]))[0];
    await setPhone(user.id, me?.email ?? user.email ?? "", data.phone);
    return { ok: true };
  });

// Edit name, email and mobile on the signed-in account. Password is changed separately.
export const updateMyProfile = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string; email: string; phone: string }) => data)
  .handler(async ({ data }) => {
    const { getSessionUser } = await import("@/lib/auth/verify.server");
    const user = await getSessionUser();
    if (!user) throw new Error("আগে লগইন করুন।");

    const name = String(data.name || "").trim();
    if (name.length < 2 || name.length > 80) throw new Error("নাম কমপক্ষে ২ অক্ষরের হতে হবে।");
    const email = String(data.email || "").trim().toLowerCase();
    if (email && (!email.includes("@") || email.length > 120)) throw new Error("সঠিক ইমেইল দাও।");
    if (isAdminEmail(email)) throw new Error("এই ইমেইল ব্যবহার করা যাবে না।");
    const phone = String(data.phone || "").replace(/\s/g, "");
    if (phone && !/^01[3-9]\d{8}$/.test(phone)) throw new Error("সঠিক মোবাইল নম্বর দাও (01XXXXXXXXX)।");

    const sql = await getSql();
    const me = (await sql.query<{ email: string; phone: string | null }>(
      'SELECT email, phone FROM "user" WHERE id = $1 LIMIT 1',
      [user.id],
    ))[0];
    if (!me) throw new Error("অ্যাকাউন্ট পাওয়া যায়নি।");

    // Phone first, while the old login email is still known.
    const currentPhone = me.phone || phoneFromEmail(me.email);
    if (phone && phone !== currentPhone) await setPhone(user.id, me.email, phone);

    const latest = (await sql.query<{ email: string }>('SELECT email FROM "user" WHERE id = $1 LIMIT 1', [user.id]))[0];
    if (email && email !== (latest?.email ?? "").toLowerCase()) {
      const taken = await sql.query<{ id: string }>(
        'SELECT id FROM "user" WHERE id <> $1 AND LOWER(email) = $2 LIMIT 1',
        [user.id, email],
      );
      if (taken.length > 0) throw new Error("এই ইমেইল আরেকটি অ্যাকাউন্টে ব্যবহারৃত।");
      await sql.query('UPDATE "user" SET email = $1 WHERE id = $2', [email, user.id]);
    }

    await sql.query('UPDATE "user" SET name = $1 WHERE id = $2', [name, user.id]);
    return { ok: true };
  });

// Public order tracking: order number AND mobile used at checkout. Includes the
// fulfillment status and tracking number, never the address or TrxID.
export type TrackDetail =
  | { found: false }
  | {
      found: true;
      id: string;
      createdAt: string;
      city: string;
      pay: PayMethod;
      lines: RawLine[];
      subtotal: number;
      discount: number;
      shipping: number;
      total: number;
      advanceDue: number;
      status: AccountOrderStatus;
      fulfillment: string;
      tracking: string;
    };

export const trackOrderDetail = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; phone: string }) => data)
  .handler(async ({ data }): Promise<TrackDetail> => {
    const id = String(data.id || "").trim().toUpperCase();
    const phone = String(data.phone || "").replace(/\s/g, "");
    if (!/^RM-[A-F0-9]{32}$/.test(id) || !/^01\d{9}$/.test(phone)) return { found: false };
    await expireStaleOrders();
    const sql = await getSql();
    const rows = await sql.query<{ data: StoredLike }>("SELECT data FROM raya_orders WHERE id = $1 LIMIT 1", [id]);
    const o = rows[0]?.data;
    if (!o || o.customer.phone !== phone) return { found: false };
    return {
      found: true,
      id: o.id,
      createdAt: o.createdAt,
      city: o.customer.city ?? "",
      pay: o.customer.pay,
      lines: o.lines.map((l) => ({ name: l.name, qty: l.qty, price: l.price })),
      subtotal: o.subtotal,
      discount: o.discount ?? 0,
      shipping: o.shipping ?? 0,
      total: o.total,
      advanceDue: o.advanceDue ?? 0,
      status: statusOf(o),
      fulfillment: fulfillmentOf(o),
      tracking: o.tracking ?? "",
    };
  });

// Admin: how many customers signed up (admin account excluded), and how many of them have bought.
export const getCustomerStats = createServerFn({ method: "GET" }).handler(async (): Promise<CustomerStats> => {
  await requireAdmin();
  const sql = await getSql();
  const users = await sql.query<{ email: string; phone: string | null; createdAt: string | Date }>(
    'SELECT email, phone, "createdAt" FROM "user" WHERE LOWER(email) <> $1',
    [adminEmail()],
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
    const phone = u.phone || phoneFromEmail(u.email);
    if (phone && buyers.has(phone)) boughtCount += 1;
  }

  const daily = [...dayCounts.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, 30)
    .map(([day, count]) => ({ day, count }));

  return { total: users.length, last7, last30, boughtCount, daily };
});
