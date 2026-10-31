import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";

export type PartnerStatus = "pending" | "approved" | "rejected";

export type PartnerRecord = {
  id: string;
  name: string;
  phone: string;
  handle: string;
  audience: string;
  status: PartnerStatus;
  code: string | null;
  createdAt: string;
  approvedAt: string | null;
};

// What is stored in raya_partners.data (the account link is kept server-side only).
type StoredPartner = Omit<PartnerRecord, "id"> & { userId: string };

const CODE_PATTERN = /^[a-z0-9-]{2,40}$/;

function toRecord(id: string, data: StoredPartner): PartnerRecord {
  return {
    id,
    name: data.name,
    phone: data.phone,
    handle: data.handle,
    audience: data.audience,
    status: data.status,
    code: data.code,
    createdAt: data.createdAt,
    approvedAt: data.approvedAt,
  };
}

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

// The signed-in customer's own partner application, if any.
export const getMyPartner = createServerFn({ method: "GET" })
  .handler(async (): Promise<{ signedIn: boolean; partner: PartnerRecord | null }> => {
    const userId = await signedInUserId();
    if (!userId) return { signedIn: false, partner: null };
    const sql = await getSql();
    const rows = await sql.query<{ id: string; data: StoredPartner }>(
      "SELECT id, data FROM raya_partners WHERE user_id = $1 LIMIT 1",
      [userId],
    );
    const row = rows[0];
    return { signedIn: true, partner: row ? toRecord(row.id, row.data) : null };
  });

export const applyAsPartner = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string; phone: string; handle: string; audience: string }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const userId = await signedInUserId();
    if (!userId) throw new Error("আগে অ্যাকাউন্ট খুলে লগইন করো।");
    const name = String(data.name || "").trim();
    const phone = String(data.phone || "").replace(/\s/g, "");
    const handle = String(data.handle || "").trim();
    const audience = String(data.audience || "").trim();
    if (name.length < 2 || name.length > 80) throw new Error("তোমার নাম লিখো।");
    if (!/^01\d{9}$/.test(phone)) throw new Error("১১ সংখ্যার মোবাইল নম্বর দাও।");
    if (handle.length < 3 || handle.length > 200) throw new Error("তোমার Facebook পেজ বা Instagram-এর লিংক দাও।");
    if (audience.length > 300) throw new Error("দর্শক সম্পর্কে ছোট করে লেখো।");

    const sql = await getSql();
    const existing = await sql.query<{ id: string }>("SELECT id FROM raya_partners WHERE user_id = $1 LIMIT 1", [userId]);
    if (existing[0]) throw new Error("তুমি আগেই partner-এর জন্য আবেদন করেছো।");

    const id = `P-${crypto.randomUUID().replace(/-/g, "").toUpperCase()}`;
    const stored: StoredPartner = {
      userId,
      name,
      phone,
      handle,
      audience,
      status: "pending",
      code: null,
      createdAt: new Date().toISOString(),
      approvedAt: null,
    };
    await sql.query(
      "INSERT INTO raya_partners (id, user_id, data, created_at, updated_at) VALUES ($1, $2, $3::jsonb, now(), now())",
      [id, userId, JSON.stringify(stored)],
    );
    return { ok: true };
  });

// Admin: all applications, newest first.
export const listPartnerApplications = createServerFn({ method: "GET" })
  .handler(async (): Promise<PartnerRecord[]> => {
    await requireAdmin();
    const sql = await getSql();
    const rows = await sql.query<{ id: string; data: StoredPartner }>(
      "SELECT id, data FROM raya_partners ORDER BY created_at DESC LIMIT 200",
    );
    return rows.map((row) => toRecord(row.id, row.data));
  });

// Admin: approve with a partner code (unique), or reject.
export const reviewPartner = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; action: "approve" | "reject"; code?: string }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    await requireAdmin();
    if (!/^P-[A-F0-9]{32}$/.test(data.id)) throw new Error("Partner not found.");
    let patch: Record<string, unknown>;
    if (data.action === "reject") {
      patch = { status: "rejected" };
    } else {
      const code = String(data.code || "").trim().toLowerCase();
      if (!CODE_PATTERN.test(code)) throw new Error("কোড: ছোট হাতের ইংরেজি অক্ষর, সংখ্যা ও হাইফেন (২-৪০ অক্ষর)।");
      const sql = await getSql();
      const taken = await sql.query<{ id: string }>(
        "SELECT id FROM raya_partners WHERE data->>'code' = $1 AND id <> $2 LIMIT 1",
        [code, data.id],
      );
      if (taken[0]) throw new Error("এই কোড আগে থেকেই অন্য partner-এর।");
      patch = { status: "approved", code, approvedAt: new Date().toISOString() };
    }
    const sql = await getSql();
    await sql.query(
      "UPDATE raya_partners SET data = data || $2::jsonb, updated_at = now() WHERE id = $1",
      [data.id, JSON.stringify(patch)],
    );
    return { ok: true };
  });
