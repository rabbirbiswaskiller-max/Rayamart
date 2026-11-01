import { createServerFn } from "@tanstack/react-start";

/**
 * Email/password sign-in and sign-up run on the server, which then sets the
 * session cookie itself. The browser used to rely on Better Auth's response
 * headers, but on TanStack Start those are not always copied onto the final
 * response, so the session never reached the browser. Cookies set through
 * TanStack's setCookie do reach it.
 */

type Result = { ok: true; token: string } | { ok: false; message: string };

/** Must match `advanced.cookies.session_token.name` in `./server`. */
const SESSION_COOKIE = "__Host-grok-auth.session_token";

/**
 * Copy every Set-Cookie from a Better Auth response onto the TanStack response.
 * Returns the signed session token, which the browser also keeps as a bearer
 * token (Better Auth's `bearer` plugin accepts it), so the session survives even
 * if the cookie is not stored.
 */
async function forwardSessionCookies(res: Response): Promise<string> {
  const { setCookie } = await import("@tanstack/react-start/server");
  let sessionToken = "";
  for (const raw of res.headers.getSetCookie()) {
    const [pair, ...attrs] = raw.split(";").map((part) => part.trim());
    const eq = pair.indexOf("=");
    if (eq <= 0) continue;
    const name = pair.slice(0, eq);
    // The value is already URL-encoded on the wire; the cookie writer encodes it again.
    const value = decodeURIComponent(pair.slice(eq + 1));
    const lower = attrs.map((attr) => attr.toLowerCase());
    const maxAgeAttr = attrs.find((attr) => attr.toLowerCase().startsWith("max-age="));
    const maxAge = maxAgeAttr ? Number(maxAgeAttr.split("=")[1]) : undefined;
    if (name === SESSION_COOKIE) sessionToken = value;
    setCookie(name, value, {
      path: "/",
      httpOnly: lower.includes("httponly"),
      secure: true,
      sameSite: "lax",
      maxAge,
    });
  }
  return sessionToken;
}

export const signInWithPassword = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string; password: string }) => data)
  .handler(async ({ data }): Promise<Result> => {
    const { auth } = await import("@/lib/auth/server");
    const { getRequest } = await import("@tanstack/react-start/server");
    const res = (await auth.api.signInEmail({
      body: { email: data.email, password: data.password },
      headers: getRequest().headers,
      asResponse: true,
    })) as Response;
    if (!res.ok) return { ok: false, message: "ইমেইল/মোবাইল বা পাসওয়ার্ড ঠিক নয়।" };
    const token = await forwardSessionCookies(res);
    if (!token) return { ok: false, message: "সেশন তৈরি করা যায়নি। আবার চেষ্টা করো।" };
    return { ok: true, token };
  });

export const signUpWithPassword = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string; email: string; password: string; phone: string }) => data)
  .handler(async ({ data }): Promise<Result> => {
    if (!/^01[3-9]\d{8}$/.test(data.phone)) {
      return { ok: false, message: "সঠিক বাংলাদেশি মোবাইল নম্বর দিন (যেমন 01XXXXXXXXX)।" };
    }
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const taken = await sql.query<{ id: string }>('SELECT id FROM "user" WHERE phone = $1 LIMIT 1', [data.phone]);
    if (taken.length > 0) return { ok: false, message: "এই মোবাইল নম্বরে আগেভাগে অ্যাকাউন্ট আছে।" };

    const { auth } = await import("@/lib/auth/server");
    const { getRequest } = await import("@tanstack/react-start/server");
    const res = (await auth.api.signUpEmail({
      body: { name: data.name, email: data.email, password: data.password },
      headers: getRequest().headers,
      asResponse: true,
    })) as Response;
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string } | null;
      const exists = /already|exist/i.test(body?.message ?? "");
      return {
        ok: false,
        message: exists ? "এই ইমেইল দিয়ে আগেভাগে অ্যাকাউন্ট আছে।" : "অ্যাকাউন্ট খোলা যায়নি।",
      };
    }
    const body = (await res.clone().json().catch(() => null)) as { user?: { id?: string } } | null;
    const userId = body?.user?.id;
    if (userId) {
      await sql.query('UPDATE "user" SET phone = $1 WHERE id = $2', [data.phone, userId]);
    }
    const token = await forwardSessionCookies(res);
    if (!token) return { ok: false, message: "সেশন তৈরি করা যায়নি। আবার চেষ্টা করো।" };
    return { ok: true, token };
  });
