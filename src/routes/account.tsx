import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { authClient, signOut } from "@/lib/auth/client";
import { getMyAccount, saveMyPhone, type AccountOrder, type AccountOrderStatus } from "@/lib/customers";
import { payMethods, taka } from "@/lib/catalog";

// The admin dashboard lives on its own deployment.
const ADMIN_SITE = "https://rayamart-admin.vercel.app";
const adminOnly = import.meta.env.VITE_ADMIN_ONLY === "1";

export const Route = createFileRoute("/account")({
  loader: () => getMyAccount(),
  component: AccountPage,
});

function AccountPage() {
  const data = Route.useLoaderData();
  if (!data.signedIn) return <AuthForm />;
  if (data.isAdmin) return <AdminRedirect />;
  return <SignedInView name={data.name} phone={data.phone} orders={data.orders} />;
}

function AdminRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    if (adminOnly) {
      navigate({ to: "/admin-customers" });
    } else {
      window.location.href = `${ADMIN_SITE}/admin-customers`;
    }
  }, [navigate]);
  return <main className="mx-auto max-w-md px-4 py-16 text-sm text-mute">অ্যাডমিন ড্যাশবোর্ডে নিয়ে যাওয়া হচ্ছে…</main>;
}

const statusText: Record<AccountOrderStatus, string> = {
  unpaid: "পেমেন্ট অপেক্ষায়",
  paid: "পেমেন্ট নিশ্চিত, প্রক্রিয়াধীন",
  delivered: "ডেলিভার হয়েছে",
  cancelled: "বাতিল বা সময়সীমা শেষ",
};

function SignedInView({ name, phone, orders }: { name: string; phone: string | null; orders: AccountOrder[] }) {
  const [busy, setBusy] = useState(false);

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      <Link to="/" className="font-serif text-4xl text-pine">Raya Mart</Link>
      <section className="mt-8 border border-line bg-white p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-mute">আপনার অ্যাকাউন্ট</p>
        <h1 className="mt-2 font-serif text-3xl">স্বাগতম{name ? `, ${name}` : ""}</h1>
        {phone ? <p className="mt-2 text-sm text-ink-soft">মোবাইল: {phone}</p> : null}
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await signOut("/account");
          }}
          className="mt-5 border border-line px-4 py-2 text-sm disabled:opacity-50"
        >
          লগআউট
        </button>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-2xl">আমার অর্ডার</h2>
        {!phone ? (
          <AddPhone />
        ) : orders.length === 0 ? (
          <p className="mt-3 text-sm text-mute">এখনো কোনো অর্ডার নেই। প্রোডাক্ট দেখতে Shop দেখো।</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {orders.map((o) => (
              <li key={o.id} className="border border-line bg-white p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-mono text-sm">{o.id}</p>
                  <p className="text-xs text-mute">{new Date(o.createdAt).toLocaleDateString("en-GB")}</p>
                </div>
                <p className="mt-2 text-sm text-ink-soft">{o.items.join(", ")}</p>
                <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <p className="tabular-nums">{taka(o.total)} · {payMethods.find((m) => m.id === o.pay)?.name ?? o.pay}</p>
                  <p className="font-medium">{statusText[o.status]}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function AddPhone() {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const normalized = normalizeBangladeshPhone(value);
    if (!normalized) {
      setMessage("সঠিক বাংলাদেশি মোবাইল নম্বর দাও (যেমন 01XXXXXXXXX)।");
      return;
    }
    setBusy(true);
    try {
      await saveMyPhone({ data: { phone: "0" + normalized.slice(3) } });
      window.location.href = "/account";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "মোবাইল নম্বর সংরক্ষণ করা যায়নি।");
      setBusy(false);
    }
  }

  return (
    <form className="mt-4 space-y-3" onSubmit={save}>
      <p className="text-sm text-ink-soft">
        অর্ডার দেখতে অ্যাকাউন্টে মোবাইল নম্বর যোগ করতে হবে — যে নম্বরে অর্ডার দিয়েছিলেন।
      </p>
      <input
        className="w-full border border-line bg-white px-4 py-3 text-sm outline-none focus:border-pine"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        inputMode="tel"
        placeholder="01XXXXXXXXX"
        required
      />
      <button type="submit" disabled={busy} className="bg-pine px-4 py-3 text-sm text-white disabled:opacity-50">
        {busy ? "সংরক্ষণ করো…" : "সংরক্ষণ করো"}
      </button>
      {message && <p role="alert" className="text-sm text-red-700">{message}</p>}
    </form>
  );
}

function normalizeBangladeshPhone(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  let normalized = digits;
  if (normalized.startsWith("00880")) normalized = normalized.slice(2);
  if (normalized.startsWith("880")) normalized = normalized.slice(3);
  if (normalized.startsWith("0")) normalized = normalized.slice(1);
  if (!/^1[3-9]\d{8}$/.test(normalized)) return null;
  return "880" + normalized;
}

function internalEmail(phone: string): string {
  return `phone-${phone}@phone.rayamart.invalid`;
}

type Mode = "login" | "register";

function AuthForm() {
  const [mode, setMode] = useState<Mode>("login");
  const [identifier, setIdentifier] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (password.length < 8) {
      setMessage("পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।");
      return;
    }

    setBusy(true);
    try {
      if (mode === "login") {
        const id = identifier.trim();
        let loginEmail: string;
        if (id.includes("@")) {
          loginEmail = id.toLowerCase();
        } else {
          const normalized = normalizeBangladeshPhone(id);
          if (!normalized) throw new Error("সঠিক ইমেইল বা মোবাইল নম্বর দিন।");
          loginEmail = internalEmail(normalized);
        }
        const result = await authClient.signIn.email({ email: loginEmail, password });
        if (result.error) throw new Error(result.error.message || "ইমেইল/মোবাইল বা পাসওয়ার্ড ঠিক নয়।");
      } else {
        if (name.trim().length < 2) throw new Error("আপনার নাম লিখুন।");
        const normalized = normalizeBangladeshPhone(phone);
        if (!normalized) throw new Error("সঠিক বাংলাদেশি মোবাইল নম্বর দিন (যেমন 01XXXXXXXXX)।");
        const trimmedEmail = email.trim().toLowerCase();
        if (trimmedEmail && !trimmedEmail.includes("@")) throw new Error("সঠিক ইমেইল দিন (ঐচ্ছিক)।");
        const result = await authClient.signUp.email({
          name: name.trim(),
          email: trimmedEmail || internalEmail(normalized),
          password,
        });
        if (result.error) throw new Error(result.error.message || "অ্যাকাউন্ট খোলা যায়নি।");
        await saveMyPhone({ data: { phone: "0" + normalized.slice(3) } });
      }
      window.location.href = "/account";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "কিছু একটি সমস্যা হয়েছে। আবার চেষ্টা করো।");
      setBusy(false);
    }
  }

  const field = "w-full border border-line bg-white px-4 py-3 text-sm outline-none focus:border-pine";
  const primary = "w-full bg-pine px-4 py-3 text-sm text-white disabled:opacity-50";

  return (
    <main className="mx-auto max-w-md px-4 py-12 sm:py-16">
      <Link to="/" className="font-serif text-4xl text-pine">Raya Mart</Link>
      <section className="mt-8 border border-line bg-white p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-mute">অ্যাকাউন্ট</p>
        <h1 className="mt-2 font-serif text-3xl">{mode === "login" ? "লগইন" : "নতুন অ্যাকাউন্ট"}</h1>

        <div className="mt-6 grid grid-cols-2 border border-line p-1">
          <button type="button" className={mode === "login" ? "bg-pine px-3 py-2 text-sm text-white" : "px-3 py-2 text-sm"} onClick={() => { setMode("login"); setMessage(""); }}>লগইন</button>
          <button type="button" className={mode === "register" ? "bg-pine px-3 py-2 text-sm text-white" : "px-3 py-2 text-sm"} onClick={() => { setMode("register"); setMessage(""); }}>রেজিস্টার</button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={submit}>
          {mode === "login" ? (
            <label className="block text-sm">ইমেইল বা মোবাইল নম্বর
              <input className={field + " mt-1"} value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" placeholder="you@example.com বা 01XXXXXXXXX" required />
            </label>
          ) : (
            <>
              <label className="block text-sm">তোমার নাম
                <input className={field + " mt-1"} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required minLength={2} />
              </label>
              <label className="block text-sm">মোবাইল নম্বর
                <input className={field + " mt-1"} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" required />
              </label>
              <label className="block text-sm">ইমেইল (ঐচ্ছিক)
                <input className={field + " mt-1"} value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" />
              </label>
            </>
          )}
          <label className="block text-sm">পাসওয়ার্ড
            <input className={field + " mt-1"} value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required />
          </label>
          <button className={primary} type="submit" disabled={busy}>{busy ? "অপেক্ষা করো…" : mode === "login" ? "লগইন" : "অ্যাকাউন্ট খোলো"}</button>
        </form>

        {message && <p role="alert" className="mt-4 text-sm text-red-700">{message}</p>}
      </section>
    </main>
  );
}
