import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";

export type SavedAddress = {
  id: string;
  label: string;
  name: string;
  phone: string;
  city: string;
  address: string;
  isDefault: boolean;
};

const MAX_ADDRESSES = 10;

async function currentUserId(): Promise<string | null> {
  const { getSessionUser } = await import("@/lib/auth/verify.server");
  const user = await getSessionUser();
  return user?.id ?? null;
}

// Makes one address the default and clears the rest.
async function setDefault(userId: string, id: string): Promise<void> {
  const sql = await getSql();
  await sql.query("UPDATE raya_addresses SET is_default = (id = $2) WHERE user_id = $1", [userId, id]);
}

export const listMyAddresses = createServerFn({ method: "GET" }).handler(async (): Promise<SavedAddress[]> => {
  const userId = await currentUserId();
  if (!userId) return [];
  const sql = await getSql();
  const rows = await sql.query<{
    id: string;
    label: string;
    name: string;
    phone: string;
    city: string;
    address: string;
    is_default: boolean;
  }>(
    "SELECT id, label, name, phone, city, address, is_default FROM raya_addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at ASC",
    [userId],
  );
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    name: r.name,
    phone: r.phone,
    city: r.city,
    address: r.address,
    isDefault: r.is_default === true,
  }));
});

export const saveMyAddress = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id?: string;
      label: string;
      name: string;
      phone: string;
      city: string;
      address: string;
      isDefault: boolean;
    }) => data,
  )
  .handler(async ({ data }) => {
    const userId = await currentUserId();
    if (!userId) throw new Error("আগে লগইন করুন।");

    const label = String(data.label || "").trim().slice(0, 30);
    const name = String(data.name || "").trim();
    const phone = String(data.phone || "").replace(/\s/g, "");
    const city = String(data.city || "").trim();
    const address = String(data.address || "").trim();
    if (name.length < 2) throw new Error("প্রাপকের নাম লিখুন।");
    if (!/^01[3-9]\d{8}$/.test(phone)) throw new Error("সঠিক মোবাইল নম্বর দাও (01XXXXXXXXX)।");
    if (!city) throw new Error("শহর বেছে নাও।");
    if (address.length < 8) throw new Error("পূর্ণ ঠিকানা দাও।");

    const sql = await getSql();
    let id: string;
    if (data.id) {
      id = data.id;
      const own = await sql.query<{ id: string }>("SELECT id FROM raya_addresses WHERE id = $1 AND user_id = $2", [id, userId]);
      if (own.length === 0) throw new Error("ঠিকানা পাওয়া যায়নি।");
      await sql.query(
        "UPDATE raya_addresses SET label = $2, name = $3, phone = $4, city = $5, address = $6 WHERE id = $1",
        [id, label, name, phone, city, address],
      );
    } else {
      id = crypto.randomUUID();
      const count = await sql.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM raya_addresses WHERE user_id = $1", [userId]);
      if ((count[0]?.n ?? 0) >= MAX_ADDRESSES) throw new Error(`সর্বোচ্চ ${MAX_ADDRESSES}টি ঠিকানা সেভ করা যাবে।`);
      await sql.query(
        "INSERT INTO raya_addresses (id, user_id, label, name, phone, city, address, is_default) VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE)",
        [id, userId, label, name, phone, city, address],
      );
    }

    // Keep exactly one default: the chosen one, or any if none is set.
    const defaults = await sql.query<{ n: number }>(
      "SELECT COUNT(*)::int AS n FROM raya_addresses WHERE user_id = $1 AND is_default = TRUE",
      [userId],
    );
    if (data.isDefault || (defaults[0]?.n ?? 0) === 0) await setDefault(userId, id);
    return { ok: true, id };
  });

export const deleteMyAddress = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const userId = await currentUserId();
    if (!userId) throw new Error("আগে লগইন করুন।");
    const sql = await getSql();
    await sql.query("DELETE FROM raya_addresses WHERE id = $1 AND user_id = $2", [data.id, userId]);

    const defaults = await sql.query<{ n: number }>(
      "SELECT COUNT(*)::int AS n FROM raya_addresses WHERE user_id = $1 AND is_default = TRUE",
      [userId],
    );
    if ((defaults[0]?.n ?? 0) === 0) {
      const first = await sql.query<{ id: string }>(
        "SELECT id FROM raya_addresses WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1",
        [userId],
      );
      if (first[0]) await setDefault(userId, first[0].id);
    }
    return { ok: true };
  });
