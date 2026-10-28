import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { KeyRound, ShieldCheck, ArrowLeft, LoaderCircle } from "lucide-react";

export const Route = createFileRoute("/admin-setup")({
  head: () => ({ meta: [{ title: "Secure Admin Setup — Raya Mart" }] }),
  component: AdminSetupPage,
});

const getSetupStatus = createServerFn({ method: "GET" }).handler(async () => ({
  enabled: Boolean(process.env.RAYA_ADMIN_SETUP_TOKEN?.trim()),
  adminEmail: process.env.RAYA_ADMIN_EMAIL?.trim() ?? "",
}));

function AdminSetupPage() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [adminEmail, setAdminEmail] = useState("");
  const [name, setName] = useState("Rabbir Biswas");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [setupToken, setSetupToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    void getSetupStatus().then((result) => {
      setEnabled(result.enabled);
      setAdminEmail(result.adminEmail);
      setEmail(result.adminEmail);
    }).catch(() => {
      setEnabled(false);
      setMessage("Setup status যাচাই করা যায়নি। পরে আবার চেষ্টা করো।");
    });
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!enabled) {
      setMessage("Secure admin setup এখন বন্ধ আছে।");
      return;
    }
    if (email.trim().toLowerCase() !== adminEmail.trim().toLowerCase()) {
      setMessage("শুধু অনুমোদিত Admin Email দিয়েই অ্যাকাউন্ট তৈরি করা যাবে।");
      return;
    }
    if (password.length < 12) {
      setMessage("নিরাপত্তার জন্য কমপক্ষে ১২ অক্ষরের পাসওয়ার্ড দাও।");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("দুটি পাসওয়ার্ড এক নয়। আবার মিলিয়ে লেখো।");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/auth/sign-up/email", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-raya-admin-setup-token": setupToken,
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          callbackURL: "/manage-store",
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof result.message === "string"
            ? result.message
            : "Admin account তৈরি হয়নি। Token ও email পরীক্ষা করো।",
        );
      }
      setPassword("");
      setConfirmPassword("");
      setSetupToken("");
      setSuccess(true);
      setMessage("Admin account তৈরি হয়েছে। Dashboard খুলছি…");
      window.location.assign("/manage-store");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Setup সম্পন্ন হয়নি। আবার চেষ্টা করো।");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f1e9] px-4 py-10 text-[#182f28] sm:px-6 sm:py-16">
      <section className="mx-auto max-w-xl rounded-3xl border border-[#ddd8cc] bg-[#fbfaf6] p-6 shadow-[0_24px_70px_rgba(28,61,52,.09)] sm:p-10">
        <Link to="/" className="inline-flex items-center gap-2 text-xs font-bold tracking-[.2em] text-[#1c3d34] no-underline">
          <span className="grid size-9 place-items-center rounded-xl bg-[#1c3d34] font-serif text-xl text-white">R</span> RAYA MART
        </Link>
        <div className="mt-8 grid size-12 place-items-center rounded-2xl bg-[#e5eee7] text-[#1c3d34]"><KeyRound className="size-6" /></div>
        <p className="mt-5 text-[10px] font-bold uppercase tracking-[.22em] text-[#7c5e3a]">One-time secure setup</p>
        <h1 className="mt-2 font-serif text-3xl sm:text-4xl">Create your admin login.</h1>
        <p className="mt-3 text-sm leading-6 text-[#6c6a60]">এই ধাপটি শুধু তোমার অ্যাডমিন অ্যাকাউন্টের জন্য। পাসওয়ার্ড source code বা GitHub-এ রাখা হবে না; Better Auth সেটি নিরাপদভাবে hash করে database-এ রাখবে।</p>

        {enabled === null && <p className="mt-6 inline-flex items-center gap-2 text-sm text-[#6c6a60]"><LoaderCircle className="size-4 animate-spin" /> Setup status যাচাই হচ্ছে…</p>}
        {enabled === false && (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            Secure setup এখন বন্ধ আছে। Admin account তৈরি হয়ে গেলে এই পেজটি ব্যবহার করা যাবে না।
          </div>
        )}
        {enabled && (
          <form onSubmit={submit} className="mt-7 grid gap-4">
            <label className="grid gap-2 text-sm font-medium">নাম
              <input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" className="h-12 rounded-xl border border-[#d9d4c8] bg-white px-4 outline-none focus:border-[#1c3d34]" />
            </label>
            <label className="grid gap-2 text-sm font-medium">Admin Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" className="h-12 rounded-xl border border-[#d9d4c8] bg-white px-4 outline-none focus:border-[#1c3d34]" />
            </label>
            <label className="grid gap-2 text-sm font-medium">নতুন পাসওয়ার্ড
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={12} autoComplete="new-password" className="h-12 rounded-xl border border-[#d9d4c8] bg-white px-4 outline-none focus:border-[#1c3d34]" />
            </label>
            <label className="grid gap-2 text-sm font-medium">পাসওয়ার্ড আবার লেখো
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={12} autoComplete="new-password" className="h-12 rounded-xl border border-[#d9d4c8] bg-white px-4 outline-none focus:border-[#1c3d34]" />
            </label>
            <label className="grid gap-2 text-sm font-medium">One-time setup code
              <input type="password" value={setupToken} onChange={(e) => setSetupToken(e.target.value)} required autoComplete="off" className="h-12 rounded-xl border border-[#d9d4c8] bg-white px-4 outline-none focus:border-[#1c3d34]" />
            </label>
            <button type="submit" disabled={busy || success} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#1c3d34] px-5 text-sm font-semibold text-white hover:bg-[#102820] disabled:opacity-60">
              {busy ? <LoaderCircle className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
              {busy ? "নিরাপদভাবে তৈরি হচ্ছে…" : "Create admin account"}
            </button>
          </form>
        )}
        {message && <p role="status" className={`mt-4 rounded-xl p-3 text-sm leading-6 ${success ? "bg-[#e5eee7] text-[#235c42]" : "border border-red-200 bg-red-50 text-red-800"}`}>{message}</p>}
        <Link to="/manage-store" className="mt-6 inline-flex items-center gap-2 text-sm text-[#625e54] underline underline-offset-4"><ArrowLeft className="size-4" /> Back to admin login</Link>
      </section>
    </main>
  );
}
