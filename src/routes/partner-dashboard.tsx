import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { taka } from "@/lib/catalog";
import { getPartnerDashboard, requestWithdrawal, type WithdrawalStatus } from "@/lib/partner-dashboard";

export const Route = createFileRoute("/partner-dashboard")({
  head: () => ({ meta: [{ title: "Partner ড্যাশবোর্ড — Raya Mart" }] }),
  loader: () => getPartnerDashboard(),
  component: PartnerDashboard,
});

const statusText: Record<WithdrawalStatus, string> = {
  requested: "অপেক্ষায়",
  paid: "পাঠানো হয়েছে",
  rejected: "বাতিল",
};

const card = "border border-line bg-ivory p-4";
const field = "mt-1 w-full border border-line bg-white px-3 py-3 text-sm outline-none focus:border-pine";

function PartnerDashboard() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [number, setNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function onRequest(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      await requestWithdrawal({ data: { amount: Number(amount), number } });
      setAmount("");
      setNumber("");
      setMessage("টাকা তোলার অনুরোধ পাঠানো হয়েছে।");
      await router.invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "অনুরোধ পাঠানো যায়নি।");
    } finally {
      setBusy(false);
    }
  }

  if (!data.signedIn) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
        <h1 className="font-serif text-4xl">ড্যাশবোর্ড দেখতে লগইন করো</h1>
        <Link to="/account" className="mt-6 inline-flex h-12 items-center bg-pine px-6 text-sm text-ivory">
          অ্যাকাউন্টে যাও
        </Link>
      </div>
    );
  }

  if (!data.partner) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
        <h1 className="font-serif text-4xl">তুমি এখনো অনুমোদিত partner নও</h1>
        <p className="mt-3 text-ink-soft">আবেদন অনুমোদন পেলে এখানে তোমার ড্যাশবোর্ড খুলবে।</p>
        <Link to="/partner" className="mt-6 inline-flex h-12 items-center bg-pine px-6 text-sm text-ivory">
          আবেদন দেখো
        </Link>
      </div>
    );
  }

  const link = `https://rayamart.vercel.app/?ref=${data.partner.code}`;
  const statCards: [string, number][] = [
    ["লিংক খোলা হয়েছে", data.stats.clicks],
    ["মোট অর্ডার", data.stats.orders],
    ["পেমেন্ট হয়েছে", data.stats.paid],
    ["সফল ডেলিভারি", data.stats.delivered],
    ["বাতিল", data.stats.cancelled],
  ];
  const moneyCards: [string, number][] = [
    ["অপেক্ষায় কমিশন", data.money.pending],
    ["মোট অনুমোদিত", data.money.approved],
    ["অনুরোধ চলছে", data.money.requested],
    ["তোলা হয়েছে", data.money.paidOut],
    ["এখন তোলা যাবে", data.money.available],
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <p className="text-xs tracking-widest text-mute uppercase">Partner ড্যাশবোর্ড</p>
      <h1 className="mt-2 font-serif text-4xl">স্বাগতম, {data.partner.name}</h1>

      <section className="mt-6 border border-line bg-ivory p-5">
        <p className="text-sm text-ink-soft">তোমার লিংক:</p>
        <p className="mt-1 break-all font-mono text-sm">{link}</p>
        <p className="mt-2 text-xs text-mute">এই লিংক দিয়ে যত মানুষ আসবে, সব হিসাব এখানে দেখাবে।</p>
      </section>

      <h2 className="mt-10 font-serif text-2xl">বিক্রির হিসাব</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {statCards.map(([label, value]) => (
          <div key={label} className={card}>
            <p className="text-xs text-mute">{label}</p>
            <p className="mt-2 font-serif text-3xl tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-10 font-serif text-2xl">কমিশনের হিসাব</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {moneyCards.map(([label, value]) => (
          <div key={label} className={card}>
            <p className="text-xs text-mute">{label}</p>
            <p className="mt-2 font-serif text-2xl tabular-nums">{taka(value)}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-mute">
        কমিশন অনুমোদিত হয় প্রোডাক্ট ডেলিভারি হওয়ার পর। ডেলিভারি না হওয়া পর্যন্ত টাকা তোলা যাবে না।
      </p>

      <h2 className="mt-10 font-serif text-2xl">টাকা তোলার অনুরোধ</h2>
      <form onSubmit={onRequest} className="mt-4 grid gap-4 border border-line bg-ivory p-5 sm:grid-cols-3">
        <label className="block text-sm">
          পরিমাণ (৳)
          <input
            type="number"
            min={300}
            className={field}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          bKash নম্বর
          <input
            className={field}
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            inputMode="tel"
            placeholder="01XXXXXXXXX"
            required
          />
        </label>
        <div className="flex items-end">
          <button type="submit" disabled={busy} className="h-12 w-full bg-pine px-4 text-sm text-ivory disabled:opacity-60">
            {busy ? "পাঠানো হচ্ছে…" : "অনুরোধ পাঠাও"}
          </button>
        </div>
      </form>
      <p className="mt-2 text-xs text-mute">ন্যূনতম ৳300। অনুরোধ পাঠানোর পর আমরা bKash-এ টাকা পাঠাব।</p>
      {message ? <p className="mt-3 text-sm text-pine">{message}</p> : null}
      {error ? <p role="alert" className="mt-3 text-sm text-brick">{error}</p> : null}

      <h2 className="mt-10 font-serif text-2xl">আগের অনুরোধ</h2>
      {data.withdrawals.length === 0 ? (
        <p className="mt-3 text-sm text-mute">এখনো কোনো অনুরোধ নেই।</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs tracking-widest text-mute uppercase">
              <tr>
                <th className="py-3 pr-4">তারিখ</th>
                <th className="py-3 pr-4">পরিমাণ</th>
                <th className="py-3 pr-4">bKash</th>
                <th className="py-3 pr-4">অবস্থা</th>
                <th className="py-3">TrxID</th>
              </tr>
            </thead>
            <tbody>
              {data.withdrawals.map((w) => (
                <tr key={w.id} className="border-b border-line">
                  <td className="py-3 pr-4 text-xs">{new Date(w.requestedAt).toLocaleDateString("en-GB")}</td>
                  <td className="py-3 pr-4 tabular-nums">{taka(w.amount)}</td>
                  <td className="py-3 pr-4 font-mono text-xs">{w.number}</td>
                  <td className="py-3 pr-4">{statusText[w.status]}</td>
                  <td className="py-3 font-mono text-xs">{w.trx ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
