import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";

const CODE_PATTERN = /^[a-z0-9-]{2,40}$/;
const PARTNER_RATE = 0.1;
const MIN_WITHDRAW = 300;

// Only the fields the dashboard needs from an order. No customer details leave the server.
type OrderData = {
  subtotal: number;
  discount?: number;
  paid?: boolean;
  delivered?: boolean;
  cancelled?: boolean;
};

export type WithdrawalStatus = "requested" | "paid" | "rejected";
type WithdrawalData = {
  ref: string;
  amount: number;
  number: string;
  status: WithdrawalStatus;
  requestedAt: string;
  paidAt: string | null;
  trx: string | null;
};
export type WithdrawalRow = WithdrawalData & { id: string };

export type PartnerStats = { clicks: number; orders: number; paid: number; delivered: number; cancelled: number };
export type PartnerMoney = { pending: number; approved: number; requested: number; paidOut: number; available: number };

export type DashboardData = {
  signedIn: boolean;
  partner: { name: string; code: string } | null;
  stats: PartnerStats;
  money: PartnerMoney;
  withdrawals: WithdrawalRow[];
};

const emptyStats: PartnerStats = { clicks: 0, orders: 0, paid: 0, delivered: 0, cancelled: 0 };
const emptyMoney: PartnerMoney = { pending: 0, approved: 0, requested: 0, paidOut: 0, available: 0 };

async function signedInUserId(): Promise<string | null> {
  const { getSessionUser } = await import("@/lib/auth/verify.server");
  const user = await getSessionUser();
  return user?.id ?? null;
}

async function requireAdmin(): Promise<void> {
  const { getSessionUser } = await import("@/lib/auth/verify.server");
  const user = await getSessionUser();
  const allowedEmail = process.env.RAYA_ADMIN_EMAIL?.trim().toLowerCase();
  if (!user?.email || !allowedEmail || user.email.trim().toLowerCase() !== allowedEmail) {
    throw new Error("Admin access required");
  }
}

// The signed-in user's partner code, only if they are an approved partner.
async function approvedPartnerFor(userId: string): Promise<{ name: string; code: string } | null> {
  const sql = await getSql();
  const rows = await sql.query<{ data: { name: string; status: string; code: string | null } }>(
    "SELECT data FROM raya_partners WHERE user_id = $1 LIMIT 1",
    [userId],
  );
  const d = rows[0]?.data;
  if (!d || d.status !== "approved" || !d.code) return null;
  return { name: d.name, code: d.code };
}

function commissionOf(o: OrderData): number {
  return Math.round((o.subtotal - (o.discount ?? 0)) * PARTNER_RATE);
}

// Numbers for one partner code: clicks, order counts, money and withdrawals.
async function moneyAndStats(code: string): Promise<{
  stats: PartnerStats;
  money: PartnerMoney;
  withdrawals: WithdrawalRow[];
}> {
  const sql = await getSql();
  const clickRows = await sql.query<{ n: string }>(
    "SELECT count(*)::text AS n FROM raya_ref_clicks WHERE ref = $1",
    [code],
  );
  const orderRows = await sql.query<{ data: OrderData }>(
    "SELECT data FROM raya_orders WHERE data->>'ref' = $1 ORDER BY created_at DESC LIMIT 2000",
    [code],
  );
  const wRows = await sql.query<{ id: string; data: WithdrawalData }>(
    "SELECT id, data FROM raya_withdrawals WHERE data->>'ref' = $1 ORDER BY created_at DESC LIMIT 200",
    [code],
  );

  const stats: PartnerStats = {
    clicks: Number(clickRows[0]?.n ?? 0),
    orders: orderRows.length,
    paid: 0,
    delivered: 0,
    cancelled: 0,
  };
  let pending = 0;
  let approved = 0;
  for (const row of orderRows) {
    const o = row.data;
    if (o.cancelled) {
      stats.cancelled += 1;
      continue;
    }
    if (!o.paid) continue;
    stats.paid += 1;
    if (o.delivered) {
      stats.delivered += 1;
      approved += commissionOf(o);
    } else {
      pending += commissionOf(o);
    }
  }

  const withdrawals: WithdrawalRow[] = wRows.map((r) => ({ id: r.id, ...r.data }));
  let requested = 0;
  let paidOut = 0;
  for (const w of withdrawals) {
    if (w.status === "requested") requested += w.amount;
    if (w.status === "paid") paidOut += w.amount;
  }
  const available = Math.max(0, approved - requested - paidOut);

  return {
    stats,
    money: { pending, approved, requested, paidOut, available },
    withdrawals,
  };
}

// Called when someone opens a ?ref= link. Counts clicks only for approved codes.
export const recordRefClick = createServerFn({ method: "POST" })
  .inputValidator((data: { ref: string }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const ref = String(data.ref || "").trim().toLowerCase();
    if (!CODE_PATTERN.test(ref)) return { ok: false };
    const sql = await getSql();
    const partner = await sql.query<{ id: string }>(
      "SELECT id FROM raya_partners WHERE data->>'code' = $1 AND data->>'status' = 'approved' LIMIT 1",
      [ref],
    );
    if (!partner[0]) return { ok: false };
    await sql.query("INSERT INTO raya_ref_clicks (ref) VALUES ($1)", [ref]);
    return { ok: true };
  });

// Partner's own dashboard.
export const getPartnerDashboard = createServerFn({ method: "GET" })
  .handler(async (): Promise<DashboardData> => {
    const userId = await signedInUserId();
    if (!userId) return { signedIn: false, partner: null, stats: emptyStats, money: emptyMoney, withdrawals: [] };
    const partner = await approvedPartnerFor(userId);
    if (!partner) return { signedIn: true, partner: null, stats: emptyStats, money: emptyMoney, withdrawals: [] };
    const { stats, money, withdrawals } = await moneyAndStats(partner.code);
    return { signedIn: true, partner, stats, money, withdrawals };
  });

// Partner asks for a payout from the available amount.
export const requestWithdrawal = createServerFn({ method: "POST" })
  .inputValidator((data: { amount: number; number: string }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const userId = await signedInUserId();
    if (!userId) throw new Error("আগে লগইন করো।");
    const partner = await approvedPartnerFor(userId);
    if (!partner) throw new Error("তুমি এখনো অনুমোদিত partner নও।");

    const amount = Math.floor(Number(data.amount));
    const number = String(data.number || "").replace(/\s/g, "");
    if (!Number.isFinite(amount) || amount < MIN_WITHDRAW) throw new Error(`ন্যূনতম ৳${MIN_WITHDRAW} তুলতে পারবে।`);
    if (!/^01\d{9}$/.test(number)) throw new Error("bKash নম্বর ১১ সংখ্যার হতে হবে।");

    const { money } = await moneyAndStats(partner.code);
    if (amount > money.available) throw new Error(`এখন সর্বোচ্চ ৳${money.available} তোলা যাবে।`);

    const id = `W-${crypto.randomUUID().replace(/-/g, "").toUpperCase()}`;
    const stored: WithdrawalData = {
      ref: partner.code,
      amount,
      number,
      status: "requested",
      requestedAt: new Date().toISOString(),
      paidAt: null,
      trx: null,
    };
    const sql = await getSql();
    await sql.query(
      "INSERT INTO raya_withdrawals (id, data, created_at, updated_at) VALUES ($1, $2::jsonb, now(), now())",
      [id, JSON.stringify(stored)],
    );
    return { ok: true };
  });

// Admin: all withdrawal requests, newest first.
export const listWithdrawals = createServerFn({ method: "GET" })
  .handler(async (): Promise<WithdrawalRow[]> => {
    await requireAdmin();
    const sql = await getSql();
    const rows = await sql.query<{ id: string; data: WithdrawalData }>(
      "SELECT id, data FROM raya_withdrawals ORDER BY created_at DESC LIMIT 300",
    );
    return rows.map((r) => ({ id: r.id, ...r.data }));
  });

// Admin: mark a request paid (with the bKash TrxID) or reject it.
export const reviewWithdrawal = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; action: "paid" | "reject"; trx?: string }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    await requireAdmin();
    if (!/^W-[A-F0-9]{32}$/.test(data.id)) throw new Error("Withdrawal not found.");
    let patch: Record<string, unknown>;
    if (data.action === "reject") {
      patch = { status: "rejected" };
    } else {
      const trx = String(data.trx || "").trim().toUpperCase();
      if (!/^[A-Z0-9]{6,20}$/.test(trx)) throw new Error("bKash TrxID সঠিক নয়।");
      patch = { status: "paid", paidAt: new Date().toISOString(), trx };
    }
    const sql = await getSql();
    await sql.query(
      "UPDATE raya_withdrawals SET data = data || $2::jsonb, updated_at = now() WHERE id = $1 AND data->>'status' = 'requested'",
      [data.id, JSON.stringify(patch)],
    );
    return { ok: true };
  });
