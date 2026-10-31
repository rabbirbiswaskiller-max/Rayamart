import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminNav } from "@/components/admin-nav";
import { getDashboardStats, listAdminOrdersFull, type FulfillmentStatus } from "@/lib/admin-orders";
import { taka } from "@/lib/catalog";

export const Route = createFileRoute("/admin-dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Raya Mart admin" }] }),
  loader: async () => {
    const [stats, all] = await Promise.all([getDashboardStats(), listAdminOrdersFull()]);
    return { stats, recent: all.slice(0, 8) };
  },
  component: AdminDashboard,
});

const statusLabel: Record<FulfillmentStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function AdminDashboard() {
  const { stats, recent } = Route.useLoaderData();
  const cards: [string, string][] = [
    ["আজকের নতুন অর্ডার", String(stats.todayNew)],
    ["Pending (প্রক্রিয়াধীন)", String(stats.pending)],
    ["পেমেন্টের অপেক্ষা", String(stats.awaitingPayment)],
    ["মোট অর্ডার", String(stats.totalOrders)],
    ["আজকের সেলস", taka(stats.todaySales)],
    ["এই মাসের সেলস", taka(stats.monthSales)],
    ["আজকের লাভ (আনুমানিক)", taka(stats.todayProfit)],
    ["এই মাসের লাভ (আনুমানিক)", taka(stats.monthProfit)],
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <p className="text-xs tracking-widest text-mute uppercase">Admin</p>
      <h1 className="mt-2 font-serif text-4xl">ড্যাশবোর্ড</h1>
      <AdminNav />

      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="border border-line bg-ivory p-4">
            <p className="text-xs text-mute">{label}</p>
            <p className="mt-2 font-serif text-3xl tabular-nums">{value}</p>
          </div>
        ))}
      </div>
      {stats.unknownProfitOrders > 0 && (
        <p className="mt-3 text-xs text-mute">
          {stats.unknownProfitOrders}টি পেইড অর্ডারের কস্ট প্রাইস নেই, তাই লাভে ধরা হয়নি। <Link to="/admin-pricing" className="underline underline-offset-4">দাম ও লাভ</Link> পেজে কস্ট দাও।
        </p>
      )}

      <div className="mt-12 flex items-baseline justify-between">
        <h2 className="font-serif text-2xl">সাম্প্রতিক অর্ডার</h2>
        <Link to="/admin-orders" className="text-sm underline underline-offset-4">সব অর্ডার</Link>
      </div>
      {recent.length === 0 ? (
        <p className="mt-3 text-sm text-mute">এখনো কোনো অর্ডার নেই।</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs tracking-widest text-mute uppercase">
              <tr>
                <th className="py-3 pr-4">অর্ডার</th>
                <th className="py-3 pr-4">কাস্টমার</th>
                <th className="py-3 pr-4">মোট</th>
                <th className="py-3">অবস্থা</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((o) => (
                <tr key={o.id} className="border-b border-line">
                  <td className="py-3 pr-4 font-mono text-xs">{o.id.slice(0, 12)}…</td>
                  <td className="py-3 pr-4">{o.customer.name}<br /><span className="text-mute">{o.customer.phone}</span></td>
                  <td className="py-3 pr-4 tabular-nums">{taka(o.total)}</td>
                  <td className="py-3 text-xs">{statusLabel[o.fulfillment]}{o.paid ? "" : " · পেমেন্ট অপেক্ষায়"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
