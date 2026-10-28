import { createServerFn } from "@tanstack/react-start";

export const getAdminAccess = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getSessionUser } = await import("@/lib/auth/verify.server");
    const user = await getSessionUser();
    const allowedEmail = process.env.RAYA_ADMIN_EMAIL?.trim().toLowerCase();

    return {
      signedIn: Boolean(user),
      allowed: Boolean(
        user?.email &&
        allowedEmail &&
        user.email.trim().toLowerCase() === allowedEmail
      ),
      emailConfigured: Boolean(allowedEmail),
    };
  },
);
