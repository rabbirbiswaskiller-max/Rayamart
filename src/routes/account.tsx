import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Mail, Phone, User } from "lucide-react";
import { authClient, getBearerToken, signOut } from "@/lib/auth/client";
import { signInWithPassword, signUpWithPassword } from "@/lib/auth/password-auth";
import {
  getMyAccount,
  updateMyProfile,
  type AccountOrder,
  type AccountOrderStatus,
} from "@/lib/customers";
import { findLoginEmail } from "@/lib/login-lookup";
import { listMyAddresses, saveMyAddress, deleteMyAddress, type SavedAddress } from "@/lib/addresses";
import { getMyWishlist, toggleWishlist } from "@/lib/wishlist";
import { cities, payMethods, taka, type Product } from "@/lib/catalog";

// The admin dashboard lives on its own deployment.
const ADMIN_SITE = "https://rayamart-admin.vercel.app";
const adminOnly = import.meta.env.VITE_ADMIN_ONLY === "1";

const field = "w-full border border-line bg-white px-4 py-3 text-sm outline-none focus:border-pine";
const btn = "bg-pine px-4 py-3 text-sm text-white disabled:opacity-50";

export const Route = createFileRoute("/account")({
  loader: async () => {
    const account = await getMyAccount();
    if (!account.signedIn || account.isAdmin) {
      return { account, addresses: [] as SavedAddress[], wishlist: [] as Product[] };
    }
    const [addresses, wishlist] = await Promise.all([listMyAddresses(), getMyWishlist()]);
    return { account, addresses, wishlist };
  },
  component: AccountPage,
});

function AccountPage() {
  const { account, addresses, wishlist } = Route.useLoaderData();
  const router = useRouter();
  // The session may exist only as a stored bearer token (the cookie did not reach
  // the server). Re-run the loader in the browser so server calls carry the token.
  useEffect(() => {
    if (!account.signedIn && getBearerToken()) router.invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!account.signedIn) return <AuthForm />;
  if (account.isAdmin) return <AdminRedirect />;
  return <SignedInView name={account.name} email={account.email} phone={account.phone} orders={account.orders} addresses={addresses} wishlist={wishlist} />;
}

function AdminRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    if (adminOnly) {
      navigate({ to: "/admin-dashboard" });
    } else {
      window.location.href = `${ADMIN_SITE}/admin-dashboard`;
    }
  }, [navigate]);
  return <main className="mx-auto max-w-md px-4 py-16 text-sm text-mute">অ্যাডমিন ড্যাশবোর্ডে নিয়ে যাওয়া হচ্ছে…</main>;
}

const statusText: Record<AccountOrderStatus, string> = {
  unpaid: "পেমেন্ট অপেক্ষায়",
  paid: "পেমেন্ট নিশ্চিত, প্রক্রিয়াধীন",
  delivered: "ডেলিভার হয়েছে",
  cancelled: "বাতিল বা সময়সীমা শেষ",
};

const fulfillText: Record<string, string> = {
  pending: "প্রক্রিয়াধীন",
  processing: "প্রস্তুত হচ্ছে",
  shipped: "পাঠানো হয়েছে",
  delivered: "ডেলিভার হয়েছে",
  cancelled: "বাতিল",
};

function stateText(o: AccountOrder): string {
  if (o.status === "cancelled") return statusText.cancelled;
  if (o.status === "unpaid") return statusText.unpaid;
  return fulfillText[o.fulfillment] ?? statusText.paid;
}

type SignedAccount = { name: string; email: string; phone: string | null; orders: AccountOrder[] };

function SignedInView({ name, email, phone, orders, addresses, wishlist }: SignedAccount & { addresses: SavedAddress[]; wishlist: Product[] }) {
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

      <Section title="প্রোফাইল">
        <ProfileForm name={name} email={email} phone={phone ?? ""} />
      </Section>

      <Section title="পাসওয়ার্ড বদলাও">
        <PasswordForm />
      </Section>

      <Section title="আমার অর্ডার">
        {!phone ? (
          <p className="text-sm text-ink-soft">
            অর্ডার দেখতে উপরের প্রোফাইলে মোবাইল নম্বর যোগ করো — যে নম্বরে অর্ডার দিয়েছিলে।
          </p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-mute">এখনো কোনো অর্ডার নেই। প্রোডাক্ট দেখতে Shop দেখো।</p>
        ) : (
          <ul className="space-y-3">
            {orders.map((o) => (
              <OrderItem key={o.id} order={o} />
            ))}
          </ul>
        )}
      </Section>

      <Section title="ডেলিভারি ঠিকানা">
        <AddressBook addresses={addresses} />
      </Section>

      <Section title="পছন্দের প্রোডাক্ট">
        <Wishlist items={wishlist} />
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 border border-line bg-white p-6 sm:p-8">
      <h2 className="font-serif text-2xl">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ProfileForm({ name, email, phone }: { name: string; email: string; phone: string }) {
  const router = useRouter();
  const [nameValue, setNameValue] = useState(name);
  const [emailValue, setEmailValue] = useState(email);
  const [phoneValue, setPhoneValue] = useState(phone);
  const [busy, setBusy] = useState(false);

  async function save(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setBusy(true);
    try {
      await updateMyProfile({ data: { name: nameValue, email: emailValue, phone: phoneValue } });
      toast.success("প্রোফাইল সেভ হয়েছে");
      router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "সেভ হয়নি।");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={save}>
      <label className="block text-sm">
        নাম
        <input className={`${field} mt-1`} value={nameValue} onChange={(ev) => setNameValue(ev.target.value)} required minLength={2} />
      </label>
      <label className="block text-sm">
        ইমেইল (ঐচ্ছিক)
        <input type="email" className={`${field} mt-1`} value={emailValue} onChange={(ev) => setEmailValue(ev.target.value)} />
      </label>
      <label className="block text-sm">
        মোবাইল নম্বর
        <input inputMode="tel" placeholder="01XXXXXXXXX" className={`${field} mt-1`} value={phoneValue} onChange={(ev) => setPhoneValue(ev.target.value)} />
      </label>
      <button type="submit" disabled={busy} className={btn}>
        {busy ? "সেভ হচ্ছে…" : "সেভ করো"}
      </button>
    </form>
  );
}

function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (next.length < 8) {
      toast.error("নতুন পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।");
      return;
    }
    setBusy(true);
    try {
      const result = await authClient.changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: false });
      if (result.error) throw new Error(result.error.message || "পাসওয়ার্ড বদলানো যায়নি।");
      toast.success("পাসওয়ার্ড বদলানো হয়েছে");
      setCurrent("");
      setNext("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "পাসওয়ার্ড বদলানো যায়নি।");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={save}>
      <label className="block text-sm">
        বর্তমান পাসওয়ার্ড
        <input type="password" className={`${field} mt-1`} value={current} onChange={(ev) => setCurrent(ev.target.value)} autoComplete="current-password" required />
      </label>
      <label className="block text-sm">
        নতুন পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর)
        <input type="password" className={`${field} mt-1`} value={next} onChange={(ev) => setNext(ev.target.value)} autoComplete="new-password" minLength={8} required />
      </label>
      <button type="submit" disabled={busy} className={btn}>
        {busy ? "বদলানো হচ্ছে…" : "পাসওয়ার্ড বদলাও"}
      </button>
    </form>
  );
}

function OrderItem({ order: o }: { order: AccountOrder }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="border border-line p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-sm">{o.id}</p>
        <p className="text-xs text-mute">{new Date(o.createdAt).toLocaleDateString("en-GB")}</p>
      </div>
      <p className="mt-2 text-sm text-ink-soft">{o.items.join(", ")}</p>
      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <p className="tabular-nums">
          {taka(o.total)} · {payMethods.find((m) => m.id === o.pay)?.name ?? o.pay}
        </p>
        <p className="font-medium">{stateText(o)}</p>
      </div>
      {o.tracking ? (
        <p className="mt-2 text-sm">
          ট্র্যাকিং নম্বর: <span className="font-mono">{o.tracking}</span>
        </p>
      ) : null}
      <button type="button" className="mt-3 text-xs underline underline-offset-4" onClick={() => setOpen((v) => !v)}>
        {open ? "বিস্তারিত লুকাও" : "বিস্তারিত দেখো"}
      </button>
      {open ? (
        <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
          {o.lines.map((l, i) => (
            <div key={i} className="flex justify-between gap-3">
              <dt>{l.name} × {l.qty}</dt>
              <dd className="tabular-nums">{taka(l.price * l.qty)}</dd>
            </div>
          ))}
          <div className="flex justify-between">
            <dt className="text-mute">সাবটোটাল</dt>
            <dd className="tabular-nums">{taka(o.subtotal)}</dd>
          </div>
          {o.discount > 0 ? (
            <div className="flex justify-between">
              <dt className="text-mute">ছাড়</dt>
              <dd className="tabular-nums">-{taka(o.discount)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between">
            <dt className="text-mute">ডেলিভারি</dt>
            <dd>{o.shipping > 0 ? taka(o.shipping) : "ফ্রি"}</dd>
          </div>
          <div className="flex justify-between font-medium">
            <dt>মোট</dt>
            <dd className="tabular-nums">{taka(o.total)}</dd>
          </div>
          {o.advanceDue > 0 ? (
            <div className="flex justify-between">
              <dt className="text-mute">অগ্রিম ডেলিভারি চার্জ</dt>
              <dd className="tabular-nums">{taka(o.advanceDue)}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </li>
  );
}

const emptyAddress = { label: "", name: "", phone: "", city: "Dhaka", address: "", isDefault: false };

function AddressBook({ addresses }: { addresses: SavedAddress[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<SavedAddress | "new" | null>(null);
  const [form, setForm] = useState(emptyAddress);
  const [busy, setBusy] = useState(false);

  function startNew() {
    setForm({ ...emptyAddress, isDefault: addresses.length === 0 });
    setEditing("new");
  }

  function startEdit(a: SavedAddress) {
    setForm({ label: a.label, name: a.name, phone: a.phone, city: a.city, address: a.address, isDefault: a.isDefault });
    setEditing(a);
  }

  async function save(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setBusy(true);
    try {
      const id = editing && editing !== "new" ? editing.id : undefined;
      await saveMyAddress({ data: { id, ...form } });
      setEditing(null);
      toast.success("ঠিকানা সেভ হয়েছে");
      router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "সেভ হয়নি।");
    } finally {
      setBusy(false);
    }
  }

  async function makeDefault(a: SavedAddress) {
    setBusy(true);
    try {
      await saveMyAddress({ data: { id: a.id, label: a.label, name: a.name, phone: a.phone, city: a.city, address: a.address, isDefault: true } });
      router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "সেভ হয়নি।");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("এই ঠিকানা মুছব?")) return;
    setBusy(true);
    try {
      await deleteMyAddress({ data: { id } });
      router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "মুছা যায়নি।");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {addresses.length === 0 && editing === null ? (
        <p className="text-sm text-mute">এখনো কোনো ঠিকানা নেই।</p>
      ) : null}

      <ul className="space-y-3">
        {addresses.map((a) => (
          <li key={a.id} className="border border-line p-4 text-sm">
            <p className="font-medium">
              {a.label || a.name}
              {a.isDefault ? <span className="ml-2 text-xs text-pine">ডিফল্ট</span> : null}
            </p>
            <p className="text-ink-soft">{a.name} · {a.phone} · {a.city}</p>
            <p className="text-ink-soft">{a.address}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs">
              <button type="button" className="underline" disabled={busy} onClick={() => startEdit(a)}>এডিট</button>
              {!a.isDefault ? (
                <button type="button" className="underline" disabled={busy} onClick={() => makeDefault(a)}>ডিফল্ট করো</button>
              ) : null}
              <button type="button" className="underline" disabled={busy} onClick={() => remove(a.id)}>মুছো</button>
            </div>
          </li>
        ))}
      </ul>

      {editing === null ? (
        addresses.length < 10 ? (
          <button type="button" className="border border-line px-4 py-2 text-sm" onClick={startNew}>
            নতুন ঠিকানা যোগ করো
          </button>
        ) : null
      ) : (
        <form className="space-y-3 border-t border-line pt-4" onSubmit={save}>
          <input className={field} placeholder="লেবেল (যেমন বাসা, অফিস)" value={form.label} onChange={(ev) => setForm({ ...form, label: ev.target.value })} />
          <input className={field} placeholder="প্রাপকের নাম" required minLength={2} value={form.name} onChange={(ev) => setForm({ ...form, name: ev.target.value })} />
          <input className={field} placeholder="মোবাইল 01XXXXXXXXX" inputMode="tel" required value={form.phone} onChange={(ev) => setForm({ ...form, phone: ev.target.value })} />
          <select className={field} value={form.city} onChange={(ev) => setForm({ ...form, city: ev.target.value })}>
            {cities.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <textarea className={field} placeholder="বাসা, রাস্তা, এলাকা" required minLength={8} rows={3} value={form.address} onChange={(ev) => setForm({ ...form, address: ev.target.value })} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isDefault} onChange={(ev) => setForm({ ...form, isDefault: ev.target.checked })} />
            ডিফল্ট ঠিকানা হিসেবে রাখো
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className={btn}>সেভ করো</button>
            <button type="button" className="border border-line px-4 py-3 text-sm" onClick={() => setEditing(null)}>বাতিল</button>
          </div>
        </form>
      )}
    </div>
  );
}

function Wishlist({ items }: { items: Product[] }) {
  const router = useRouter();
  if (items.length === 0) {
    return <p className="text-sm text-mute">পছন্দের প্রোডাক্ট সেভ করতে প্রোডাক্ট পেজে ♡ চাপো।</p>;
  }
  return (
    <ul className="divide-y divide-line">
      {items.map((p) => (
        <li key={p.slug} className="flex items-center justify-between gap-3 py-3 text-sm">
          <Link to="/product/$slug" params={{ slug: p.slug }} className="font-serif text-lg underline-offset-4 hover:underline">
            {p.name}
          </Link>
          <div className="flex items-center gap-3">
            <span className="tabular-nums">{taka(p.price)}</span>
            <button
              type="button"
              className="text-xs underline"
              onClick={async () => {
                try {
                  await toggleWishlist({ data: { slug: p.slug, on: false } });
                  router.invalidate();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "সরানো যায়নি।");
                }
              }}
            >
              সরাও
            </button>
          </div>
        </li>
      ))}
    </ul>
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

const darkInput =
  "h-[52px] w-full rounded-2xl border border-[#174247] bg-white/[0.03] pl-11 pr-4 text-[15px] text-[#e6fbfc] placeholder:text-[#4d6e72] outline-none transition-[border-color,box-shadow,background-color] duration-200 hover:border-[#22595f] focus:border-[#00f2fe] focus:bg-[#00f2fe]/[0.04] focus:shadow-[0_0_0_4px_rgba(0,242,254,0.12),0_0_22px_rgba(0,242,254,0.25)]";

function AuthField({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs tracking-wide text-[#7ea3a7]">{label}</span>
      <span className="relative block">
        <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[#7ea3a7] transition-colors duration-200 group-focus-within:text-[#00f2fe] [&>svg]:size-[18px]">
          {icon}
        </span>
        {children}
      </span>
    </label>
  );
}

function tabClass(active: boolean): string {
  return `h-10 rounded-xl text-sm font-medium transition-all duration-200 ${
    active
      ? "bg-gradient-to-r from-[#00c6d1] to-[#00f2fe] text-[#03181a] shadow-[0_6px_20px_rgba(0,242,254,0.3)]"
      : "text-[#7ea3a7] hover:text-[#e6fbfc]"
  }`;
}

// Stops a request that never answers from leaving the button busy forever.
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(
      () => reject(new Error("সার্ভার সাড়া দিচ্ছে না। একটু পরে আবার চেষ্টা করো।")),
      ms,
    );
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function AuthForm() {
  const [mode, setMode] = useState<Mode>("login");
  const [identifier, setIdentifier] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  function switchMode(next: Mode) {
    setMode(next);
    setMessage("");
  }

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
          // Find the account that has this mobile number saved. Falls back to the
          // mobile-only internal email for accounts created with a number alone.
          const found = await findLoginEmail({ data: { phone: "0" + normalized.slice(3) } });
          loginEmail = found.email ?? internalEmail(normalized);
        }
        const result = await withTimeout(signInWithPassword({ data: { email: loginEmail, password } }), 20000);
        if (!result.ok) throw new Error(result.message);
      } else {
        if (name.trim().length < 2) throw new Error("আপনার নাম লিখুন।");
        const normalized = normalizeBangladeshPhone(phone);
        if (!normalized) throw new Error("সঠিক বাংলাদেশি মোবাইল নম্বর দিন (যেমন 01XXXXXXXXX)।");
        const trimmedEmail = email.trim().toLowerCase();
        if (trimmedEmail && !trimmedEmail.includes("@")) throw new Error("সঠিক ইমেইল দিন (ঐচ্ছিক)।");
        const result = await signUpWithPassword({
          data: {
            name: name.trim(),
            email: trimmedEmail || internalEmail(normalized),
            password,
            phone: "0" + normalized.slice(3),
          },
        });
        if (!result.ok) throw new Error(result.message);
      }
      // The session cookie is set by the server, so the account page now sees it.
      window.location.assign("/account");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "কিছু একটি সমস্যা হয়েছে। আবার চেষ্টা করো।");
      setBusy(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#050d0e] px-4 py-10 sm:py-16">
      <section className="group mx-auto grid max-w-4xl overflow-hidden rounded-3xl border border-[#00f2fe]/10 bg-[#0a1719] shadow-[0_30px_80px_rgba(0,0,0,0.6),0_0_60px_rgba(0,242,254,0.12)] md:grid-cols-[1.05fr_1fr]">
        <div className="relative flex flex-col justify-center overflow-hidden bg-gradient-to-br from-[#053d42] via-[#0b5f66] to-[#0a8f99] px-8 py-14 text-[#e6fbfc] [clip-path:polygon(0_0,100%_0,100%_88%,0_100%)] md:px-12 md:[clip-path:polygon(0_0,100%_0,84%_100%,0_100%)]">
          <span aria-hidden className="absolute -top-28 -right-28 size-80 rotate-45 rounded-[36px] border-2 border-[#00f2fe]/35" />
          <span aria-hidden className="absolute -bottom-20 -left-24 size-56 rotate-[20deg] rounded-[40px] bg-gradient-to-br from-[#00f2fe]/35 to-transparent" />
          <span aria-hidden className="absolute right-12 bottom-24 size-24 rotate-45 border-2 border-[#00f2fe]/60" />
          <span aria-hidden className="absolute top-20 left-14 size-3.5 rotate-45 bg-[#00f2fe] shadow-[0_0_18px_#00f2fe]" />
          <div className="relative">
            <Link to="/" className="font-serif text-2xl text-[#00f2fe]">Raya Mart</Link>
            <h2 className="mt-10 text-5xl font-extrabold tracking-[0.04em] text-white md:text-6xl">
              WEL<span className="text-[#00f2fe]">COME</span>
            </h2>
            <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-[#e6fbfc]/80">
              অর্ডার, ঠিকানা ও পছন্দের প্রোডাক্ট — সবকিছু এক জায়গায়।
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-center px-6 py-10 sm:px-10">
          <div className="grid grid-cols-2 gap-1 rounded-2xl border border-[#174247] p-1">
            <button type="button" className={tabClass(mode === "login")} onClick={() => switchMode("login")}>লগইন</button>
            <button type="button" className={tabClass(mode === "register")} onClick={() => switchMode("register")}>রেজিস্টার</button>
          </div>

          <h1 className="mt-8 text-3xl font-bold text-[#e6fbfc]">
            {mode === "login" ? "আবার স্বাগতম" : "নতুন অ্যাকাউন্ট"}
          </h1>
          <p className="mt-2 text-sm text-[#7ea3a7]">
            {mode === "login" ? "ইমেইল বা মোবাইল নম্বর দিয়ে লগইন করো।" : "তোমার তথ্য দিয়ে অ্যাকাউন্ট খোলো।"}
          </p>

          <form className="group mt-7 space-y-5" onSubmit={submit}>
            {mode === "login" ? (
              <AuthField label="ইমেইল বা মোবাইল নম্বর" icon={<User />}>
                <input
                  className={darkInput}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoComplete="username"
                  placeholder="you@example.com বা 01XXXXXXXXX"
                  required
                />
              </AuthField>
            ) : (
              <>
                <AuthField label="তোমার নাম" icon={<User />}>
                  <input
                    className={darkInput}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    required
                    minLength={2}
                  />
                </AuthField>
                <AuthField label="মোবাইল নম্বর" icon={<Phone />}>
                  <input
                    className={darkInput}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="01XXXXXXXXX"
                    required
                  />
                </AuthField>
                <AuthField label="ইমেইল (ঐচ্ছিক)" icon={<Mail />}>
                  <input
                    className={darkInput}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                  />
                </AuthField>
              </>
            )}

            <AuthField label="পাসওয়ার্ড" icon={<Lock />}>
              <input
                className={`${darkInput} pr-12`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                minLength={8}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "পাসওয়ার্ড লুকাও" : "পাসওয়ার্ড দেখাও"}
                aria-pressed={showPassword}
                className="absolute top-1/2 right-4 -translate-y-1/2 text-[#00f2fe]/80 transition-colors duration-200 hover:text-[#00f2fe] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00f2fe] [&>svg]:size-5"
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </AuthField>

            <button
              type="submit"
              disabled={busy}
              className="mt-2 h-[54px] w-full rounded-2xl bg-gradient-to-r from-[#00c6d1] via-[#00f2fe] to-[#00a8c4] text-base font-bold tracking-wide text-[#03181a] shadow-[0_10px_30px_rgba(0,242,254,0.3)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(0,242,254,0.45)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#00f2fe] disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {busy ? "অপেক্ষা করো…" : mode === "login" ? "লগইন" : "অ্যাকাউন্ট খোলো"}
            </button>
          </form>

          {message ? (
            <p role="alert" className="mt-5 rounded-xl border border-[#ff8a8a]/30 bg-[#ff8a8a]/10 px-4 py-3 text-sm text-[#ffb3b3]">
              {message}
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
