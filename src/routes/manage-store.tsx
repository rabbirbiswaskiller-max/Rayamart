import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { authClient } from "@/lib/auth/client";
import { getAdminAccess } from "@/lib/admin/access";

export const Route = createFileRoute("/manage-store")({
  component: ManageStore,
});

type Access = {
  signedIn: boolean;
  allowed: boolean;
  emailConfigured: boolean;
};

function ManageStore() {
  const [access, setAccess] = useState<Access | null>(null);
  const [error, setError] = useState("");

  async function checkAccess() {
    try {
      const result = await getAdminAccess();
      setAccess(result);
    } catch {
      setError("লগইন যাচাই করা যায়নি। Auth configuration পরীক্ষা করো।");
    }
  }

  useEffect(() => {
    void checkAccess();
  }, []);

  async function googleLogin() {
    setError("");
    try {
      const { signIn } = await import("@/lib/auth/client");
      await signIn("grok-google", {
        callbackURL: "/manage-store",
        errorCallbackURL: "/manage-store",
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Google Login শুরু হয়নি। Auth configuration পরীক্ষা করো.",
      );
    }
  }

  async function logout() {
    try {
      const { signOut } = await import("@/lib/auth/client");
      await signOut();
      setAccess(null);
      await checkAccess();
    } catch {
      setError("লগআউট করা যায়নি। আবার চেষ্টা করো।");
    }
  }

  const cardStyle = {
    maxWidth: 620,
    margin: "40px auto",
    padding: 24,
    border: "1px solid #dce5df",
    borderRadius: 16,
    background: "#fff",
    color: "#1c3d34",
    fontFamily: "Arial, sans-serif",
  } as const;

  return (
    <main style={cardStyle}>
      <p style={{ color: "#668176", letterSpacing: 2 }}>RAYA MART</p>
      <h1>Store Admin</h1>
      <p>দোকানের ব্যবস্থাপনা শুধু অনুমোদিত অ্যাডমিনের জন্য।</p>

      {!access && !error && <p>লগইন যাচাই হচ্ছে…</p>}

      {access && !access.emailConfigured && (
        <p style={{ color: "#a33" }}>
          Admin-এর Gmail এখনো সার্ভারে সেট করা হয়নি। নিরাপত্তার জন্য প্রবেশ বন্ধ।
        </p>
      )}

      {access && access.emailConfigured && !access.allowed && (
        <>
          <p>
            {access.signedIn
              ? "এই Google অ্যাকাউন্টের Admin অনুমতি নেই।"
              : "Admin Panel খুলতে Google দিয়ে লগইন করো।"}
          </p>
          {!access.signedIn && (
            <button onClick={googleLogin}>Continue with Google</button>
          )}
        </>
      )}

      {access?.allowed && (
        <>
          <h2>Admin Dashboard</h2>
          <p>Admin পরিচয় যাচাই সফল হয়েছে।</p>
          <p>
            অর্ডার, পণ্য ও বিক্রির রিপোর্ট যুক্ত করার পর সেগুলো এখানে পরিচালনা
            করা যাবে।
          </p>
          <button onClick={logout}>লগআউট</button>
        </>
      )}

      {error && <p role="alert" style={{ color: "#a33" }}>{error}</p>}
    </main>
  );
}
