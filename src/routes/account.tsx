import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth/client";

export const Route = createFileRoute("/account")({ component: CustomerAccount });

type Mode = "login" | "register";

function normalizeBangladeshPhone(value: string): string | null {
  const digits = value.replace(/\\D/g, "");
  let normalized = digits;
  if (normalized.startsWith("00880")) normalized = normalized.slice(2);
  if (normalized.startsWith("880")) normalized = normalized.slice(3);
  if (normalized.startsWith("0")) normalized = normalized.slice(1);
  if (!/^1[3-9]\\d{8}$/.test(normalized)) return null;
  return "880" + normalized;
}

function internalEmail(phone: string): string {
  return `phone-${phone}@phone.rayamart.invalid`;
}

function CustomerAccount() {
  const [mode, setMode] = useState<Mode>("login");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const normalized = normalizeBangladeshPhone(phone);
    if (!normalized) {
      setMessage("সঠিক বাংলাদেশি মোবাইল নম্বর দাও (যেমন 01XXXXXXXXX)।");
      return;
    }
    if (password.length < 8) {
      setMessage("পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।");
      return;
    }
    if (mode === "register" && name.trim().length < 2) {
      setMessage("তোমার নাম লিখো।");
      return;
    }

    setBusy(true);
    try {
      const email = internalEmail(normalized);
      if (mode === "register") {
        const result = await authClient.signUp.email({
          name: name.trim(),
          email,
          password,
        });
        if (result.error) throw new Error(result.error.message || "অ্যাকাউন্ট খোলা যায়নি।");
      } else {
        const result = await authClient.signIn.email({ email, password });
        if (result.error) throw new Error(result.error.message || "নম্বর বা পাসওয়ার্ড সঠিক নয়।");
      }
      window.location.href = "/account";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "লগইন করা যায়নি। আবার চেষ্টা করো।");
    } finally {
      setBusy(false);
    }
  }

  async function googleLogin() {
    setMessage("");
    setBusy(true);
    try {
      const { signIn } = await import("@/lib/auth/client");
      await signIn("grok-google", { callbackURL: "/account", errorCallbackURL: "/account" });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Google Login শুরু করা যায়নি।");
      setBusy(false);
    }
  }

  const field = "w-full border border-line bg-white px-4 py-3 text-sm outline-none focus:border-pine";
  const primary = "w-full bg-pine px-4 py-3 text-sm text-white disabled:opacity-50";

  return (
    <main className="mx-auto max-w-md px-4 py-12 sm:py-16">
      <Link to="/" className="font-serif text-4xl text-pine">Raya Mart</Link>
      <section className="mt-8 border border-line bg-white p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-mute">Customer account</p>
        <h1 className="mt-2 font-serif text-3xl">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
        <p className="mt-2 text-sm text-ink-soft">
          {mode === "login" ? "তোমার অ্যাকাউন্টে প্রবেশ করো।" : "Raya Mart-এ নতুন অ্যাকাউন্ট খোলো।"}
        </p>

        <div className="mt-6 grid grid-cols-2 border border-line p-1">
          <button type="button" className={mode === "login" ? "bg-pine px-3 py-2 text-sm text-white" : "px-3 py-2 text-sm"} onClick={() => { setMode("login"); setMessage(""); }}>Login</button>
          <button type="button" className={mode === "register" ? "bg-pine px-3 py-2 text-sm text-white" : "px-3 py-2 text-sm"} onClick={() => { setMode("register"); setMessage(""); }}>Register</button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={submit}>
          {mode === "register" && (
            <label className="block text-sm">তোমার নাম
              <input className={field + " mt-1"} value={name} onChange={e => setName(e.target.value)} autoComplete="name" required minLength={2} />
            </label>
          )}
          <label className="block text-sm">মোবাইল নম্বর
            <input className={field + " mt-1"} value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" required />
          </label>
          <label className="block text-sm">পাসওয়ার্ড
            <input className={field + " mt-1"} value={password} onChange={e => setPassword(e.target.value)} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required />
          </label>
          <button className={primary} type="submit" disabled={busy}>{busy ? "অপেক্ষা করো…" : mode === "login" ? "Login" : "Create account"}</button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-mute"><span className="h-px flex-1 bg-line" />অথবা<span className="h-px flex-1 bg-line" /></div>
        <button type="button" className="w-full border border-line px-4 py-3 text-sm disabled:opacity-50" onClick={googleLogin} disabled={busy}>Continue with Google</button>

        {message && <p role="alert" className="mt-4 text-sm text-red-700">{message}</p>}
        <p className="mt-5 text-xs leading-5 text-mute">
          OTP ছাড়া অ্যাকাউন্ট খোলা হচ্ছে, তাই মোবাইল নম্বরের মালিকানা যাচাই হয় না। পাসওয়ার্ড ভুলে গেলে আপাতত স্বয়ংক্রিয় ফোন-ভিত্তিক রিকভারি নেই।
        </p>
      </section>
    </main>
  );
}
