import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";

// Finds the login email of the account that has this mobile number saved, so a
// customer can sign in with their mobile number and password. Returns null when
// no account has the number. Only the email is returned, never other account data.
export const findLoginEmail = createServerFn({ method: "POST" })
  .inputValidator((data: { phone: string }) => data)
  .handler(async ({ data }): Promise<{ email: string | null }> => {
    const phone = String(data.phone || "").replace(/\s/g, "");
    if (!/^01[3-9]\d{8}$/.test(phone)) return { email: null };
    const sql = await getSql();
    const rows = await sql.query<{ email: string }>(
      'SELECT email FROM "user" WHERE phone = $1 LIMIT 1',
      [phone],
    );
    return { email: rows[0]?.email ?? null };
  });
