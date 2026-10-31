import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AdminNav } from "@/components/admin-nav";
import { getCustomerDetail, type CustomerOrderRow } from "@/lib/admin-reports";
import { taka } from "@/lib/catalog";

export const Route = createFileRoute("/admin-customer/$phone")({
  head: () => ({ meta: [{ title: "Customer — Raya Mart admin" }] }),
  loader: async ({ params }) => {
    const detail = await getCustomerDetail({ data: { phone: params.phone } });
    if (!detail) throw notFound();
    return detail;
  },
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <AdminNav />
      <p className="mt-8 text-sm text-mute">এই নম্বরে কোনো অর্ডার নেই।</p>
    </div>
  ),
  component: CustomerPage,
});

const statusText: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const payText: Record<string, string> = {
  bkash: "bKash",
  nagad: "Nagad",
  card: "Card",
  cod: "Cash on delivery",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", dateStyle: "medium", timeStyle: "short" });
}

function CustomerPage() {
  const c = Route.useLoaderData();
  const cards: [string, string][] = [
    ["মোট অর্ডার", String(c.totals.orders)],
    ["পেইড অর্ডার", String(c.totals.paidOrders)],
    ["মোট কেনা (পেইড)", taka(c.totals.paidTotal)],
    ["লাভ (আনুমানিক)", taka(c.totals.profit)],
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <p className="text-xs tracking-widest text-mute uppercase">Admin</p>
      <h1 className="mt-2 font-serif text-4xl">{c.name}</h1>
      <p className="mt-2 text-sm text-ink-soft">
        {c.phone}
        {c.email ? ` · ${c.email}` : ""}
        {c.city ? ` · ${c.city}` : ""}
      </p>
      <AdminNav />
      <p className="mt-4 text-sm text-ink-soft">{c.address}</p>
      {c.note && <p className="mt-2 text-sm text-mute">কাস্টমারের নোট: {c.note}</p>}
      {c.accountCreatedAt && (
        <p className="mt-2 text-xs text-mute">অ্যাকাউন্ট তৈরি: {fmt(c.accountCreatedAt)}</p>
      )}

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="border border-line bg-ivory p-4">
            <p className="text-xs text-mute">{label}</p>
            <p className="mt-2 font-serif text-2xl tabular-nums">{value}</p>
          </div>
        ))}
      </div>
      {c.totals.unknownProfit > 0 && (
        <p className="mt-2 text-xs text-mute">{c.totals.unknownProfit}টি অর্ডারে কস্ট নেই, তাই লাভে ধরা হয়নি।</p>
      )}

      <h2 className="mt-12 font-serif text-2xl">অর্ডারের इতিহাস</h2>
      <div className="mt-4 space-y-3">
        {c.orders.map((o) => (
          <OrderBox key={o.id} order={o} />
        ))}
      </div>
      <p className="mt-8 text-sm">
        <Link to="/admin-customers" className="underline underline-offset-4">সব গ্রাহকের তালিকায় ফিরুন</Link>
      </p>
    </div>
  );
}

function OrderBox({ order: o }: { order: CustomerOrderRow }) {
  const state = o.status === "cancelled" ? "Cancelled" : statusText[o.status] ?? o.status;
  return (
    <div className="border border-line bg-ivory p-4 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-mono text-xs">{o.id}</span>
        <span className="text-xs text-mute">{fmt(o.createdAt)}</span>
      </div>
      <p className="mt-2">
        {state}
        {o.paid ? "" : " · পেমেন্ট অপেক্ষায়"}
        {" · "}{payText[o.pay] ?? o.pay}
        {" · "}<span className="tabular-nums">{taka(o.total)}</span>
        {o.profit !== null && o.paid && o.status !== "cancelled" && (
          <span className="text-mute"> · লাভ {taka(o.profit)}</span>
        )}
      </p>
      <ul className="mt-2 space-y-1 text-ink-soft">
        {o.lines.map((l) => (
          <li key={l.name + l.qty}>{l.name} × {l.qty}</li>
        ))}
      </ul>
      {o.tracking && <p className="mt-2 text-xs">ট্র্যাকিং: <span className="font-mono">{o.tracking}</span></p>}
      {o.adminNote && <p className="mt-1 text-xs text-mute">নোট: {o.adminNote}</p>}
    </div>
  );
}
