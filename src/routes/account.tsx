import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { authClient, signOut } from "@/lib/auth/client";
import {
  getMyAccount,
  saveMyPhone,
  updateMyProfile,
  type AccountOrder,
  type AccountOrderStatus,
} from "@/lib/customers";
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
      toast.error("নতুন পাসওয়ার্ড কমপক্ষে বেক মে মৃনো মুডমের্ডে বাকৃত ঘন্টিভিকে।");
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
        if (result.error) throw new Error(result.error.message || "ইমেইল/মোবাইল বা পাসওয়ার্ড ঠিক নয়।");
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
      setMessage(error instanceof Error ? error.message : "কিছু একটি সমস্যা হয়েছে। আবার চেষ্টা করো।");
      setBusy(false);
    }
  }

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
          <button className={btn + " w-full"} type="submit" disabled={busy}>{busy ? "অপেক্ষা করো…" : mode === "login" ? "লগইন" : "অ্যাকাউন্ট খোলো"}</button>
        </form>

        {message && <p role="alert" className="mt-4 text-sm text-red-700">{message}</p>}
      </section>
    </main>
  );
}
