import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
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
  const [busy, setBusy] = useState(false);
  const [adminEmail, setAdminEmail] = useState("rabbirbiswasraya@gmail.com");
  const [adminPassword, setAdminPassword] = useState("");

  async function checkAccess() {
    try {
      const result = await getAdminAccess();
      setAccess(result);
    } catch {
      setError("লগইন যাচাই করা যায়নি। কিছুক্ষণ পর আবার চেষ্টা করো।");
    }
  }

  useEffect(() => {
    void checkAccess();
  }, []);

  async function adminLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { authClient } = await import("@/lib/auth/client");
      const result = await authClient.signIn.email({
        email: adminEmail.trim(),
        password: adminPassword,
      });
      if (result.error) {
        throw new Error(result.error.message || "ইমেইল বা পাসওয়ার্ড সঠিক নয়।");
      }
      setAdminPassword("");
      await checkAccess();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Admin Login করা যায়নি। ইমেইল ও পাসওয়ার্ড পরীক্ষা করো।",
      );
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    try {
      const { signOut } = await import("@/lib/auth/client");
      await signOut();
      setAccess(null);
      setError("");
      await checkAccess();
    } catch {
      setError("লগআউট করা যায়নি। আবার চেষ্টা করো।");
    }
  }

  const page: React.CSSProperties = {
    minHeight: "70vh",
    padding: "44px 16px 64px",
    background: "#f6f8f6",
    color: "#173c31",
    fontFamily: "Arial, sans-serif",
  };
  const card: React.CSSProperties = {
    maxWidth: 470,
    margin: "0 auto",
    padding: "28px 24px",
    border: "1px solid #e0e8e2",
    borderRadius: 20,
    background: "#fff",
    boxShadow: "0 12px 35px rgba(20,60,45,.07)",
  };
  const button: React.CSSProperties = {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    padding: "13px 16px",
    borderRadius: 10,
    border: "1px solid #d9e3dc",
    background: "#fff",
    color: "#173c31",
    textAlign: "center",
    fontSize: 15,
    fontWeight: 600,
    textDecoration: "none",
    cursor: "pointer",
  };

  return (
    <main style={page}>
      <section style={card}>
        <Link to="/" style={{ color: "#173c31", textDecoration: "none", fontSize: 13, letterSpacing: 3, fontWeight: 800 }}>
          RAYA MART
        </Link>
        <div style={{ marginTop: 24, marginBottom: 24 }}>
          <p style={{ margin: "0 0 8px", color: "#718278", fontSize: 12, letterSpacing: 2, textTransform: "uppercase" }}>
            Welcome to Raya Mart
          </p>
          <h1 style={{ margin: 0, fontSize: 29, lineHeight: 1.2, fontFamily: "Georgia, serif" }}>
            Login to your account
          </h1>
          <p style={{ margin: "12px 0 0", color: "#64746b", fontSize: 14, lineHeight: 1.7 }}>
            কাস্টমার ও দোকান পরিচালনার জন্য আলাদা লগইন ব্যবহার করো।
          </p>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ padding: 16, border: "1px solid #e0e8e2", borderRadius: 14, background: "#fbfcfb" }}>
            <div style={{ fontSize: 11, color: "#6b7d72", letterSpacing: 1.5, fontWeight: 700 }}>CUSTOMER ACCOUNT</div>
            <h2 style={{ margin: "7px 0", fontSize: 19 }}>কাস্টমার লগইন</h2>
            <p style={{ margin: "0 0 14px", color: "#64746b", fontSize: 13, lineHeight: 1.6 }}>
              মোবাইল নম্বর ও পাসওয়ার্ড দিয়ে লগইন করো অথবা নতুন অ্যাকাউন্ট খোলো।
            </p>
            <Link to="/account" style={{ ...button, background: "#173c31", color: "#fff", borderColor: "#173c31" }}>
              Customer Login / Register
            </Link>
          </div>

          <div style={{ padding: 16, border: "1px solid #e0e8e2", borderRadius: 14 }}>
            <div style={{ fontSize: 11, color: "#6b7d72", letterSpacing: 1.5, fontWeight: 700 }}>AUTHORIZED ACCESS ONLY</div>
            <h2 style={{ margin: "7px 0", fontSize: 19 }}>স্টোর অ্যাডমিন</h2>
            <p style={{ margin: "0 0 14px", color: "#64746b", fontSize: 13, lineHeight: 1.6 }}>
              পণ্য ও দোকান পরিচালনার জন্য শুধু অনুমোদিত অ্যাডমিন প্রবেশ করতে পারবেন।
            </p>

            {!access && !error && <p style={{ color: "#64746b", fontSize: 13 }}>লগইন অবস্থা যাচাই হচ্ছে…</p>}

            {access && !access.emailConfigured && (
              <p role="alert" style={{ color: "#a33", fontSize: 13 }}>
                Admin email সার্ভারে সেট করা নেই। নিরাপত্তার জন্য প্রবেশ বন্ধ রাখা হয়েছে।
              </p>
            )}

            {access && access.emailConfigured && !access.allowed && (
              <>
                {access.signedIn && (
                  <p style={{ color: "#a33", fontSize: 13 }}>
                    এই Google অ্যাকাউন্টের Admin অনুমতি নেই। অনুমোদিত অ্যাকাউন্ট দিয়ে চেষ্টা করো।
                  </p>
                )}
                <form onSubmit={adminLogin} style={{ display: "grid", gap: 10 }}>
                  <label style={{ display: "grid", gap: 6, fontSize: 13, color: "#43584d" }}>
                    Admin Email
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={(event) => setAdminEmail(event.target.value)}
                      autoComplete="username"
                      required
                      style={{ boxSizing: "border-box", width: "100%", padding: "12px 13px", border: "1px solid #d9e3dc", borderRadius: 9, fontSize: 14 }}
                    />
                  </label>
                  <label style={{ display: "grid", gap: 6, fontSize: 13, color: "#43584d" }}>
                    Admin Password
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(event) => setAdminPassword(event.target.value)}
                      autoComplete="current-password"
                      required
                      style={{ boxSizing: "border-box", width: "100%", padding: "12px 13px", border: "1px solid #d9e3dc", borderRadius: 9, fontSize: 14 }}
                    />
                  </label>
                  <button type="submit" disabled={busy} style={{ ...button, background: "#173c31", color: "#fff", borderColor: "#173c31", opacity: busy ? 0.65 : 1 }}>
                    {busy ? "লগইন হচ্ছে…" : "Admin Login"}
                  </button>
                </form>
              </>
            )}

            {access?.allowed && (
              <div>
                <h3 style={{ margin: "4px 0 8px", fontSize: 18 }}>Admin Dashboard</h3>
                <p style={{ color: "#64746b", fontSize: 13, lineHeight: 1.6 }}>
                  Admin পরিচয় যাচাই সফল হয়েছে। দোকানের ব্যবস্থাপনার সুবিধাগুলো এখানে যুক্ত করা যাবে।
                </p>
                <button type="button" onClick={logout} style={button}>লগআউট</button>
              </div>
            )}
          </div>
        </div>

        {error && (
          <p role="alert" style={{ marginTop: 16, padding: 12, borderRadius: 10, background: "#fff1f0", color: "#9b2929", fontSize: 13, lineHeight: 1.6 }}>
            {error}
          </p>
        )}

        <p style={{ margin: "22px 0 0", color: "#7a8980", fontSize: 11, lineHeight: 1.6, textAlign: "center" }}>
          নিরাপত্তার জন্য কাস্টমার অ্যাকাউন্ট থেকে Admin Panel খোলা যাবে না।
        </p>
      </section>
    </main>
  );
}
