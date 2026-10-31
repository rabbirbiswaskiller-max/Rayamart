import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminNav } from "@/components/admin-nav";
import { getCustomerStats } from "@/lib/customers";
import { listCustomerBook } from "@/lib/admin-reports";
import { taka } from "@/lib/catalog";

export const Route = createFileRoute("/admin-customers")({
  head: () => ({ meta: [{ title: "Customers — Raya Mart admin" }] }),
  loader: async () => {
    const [stats, book] = await Promise.all([getCustomerStats(), listCustomerBook()]);
    return { s: stats, book };
  },
  component: AdminCustomers,
});

function AdminCustomers() {
  const { s, book } = Route.useLoaderData();
  const cards: [string, number][] = [
    ["মোট সাইনআপ", s.total],
    ["গত ৭ দিন", s.last7],
    ["গত ৩০ দিন", s.last30],
    ["সাইনআপকারী যারা কিনেছে", s.boughtCount],
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <p className="text-xs tracking-widest text-mute uppercase">Admin</p>
      <h1 className="mt-2 font-serif text-4xl">গ্রাহক সাইনআপ</h1>
      <p className="mt-2 text-sm text-ink-soft">সময় বাংলাদেশ সময় অনুযায়ী।</p>
      <AdminNav />

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="border border-line bg-ivory p-4">
            <p className="text-xs text-mute">{label}</p>
            <p className="mt-2 font-serif text-3xl tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-12 font-serif text-2xl">দিনভিত্তিক সাইনআপ (সর্বোচ্চ ৩০ দিন)</h2>
      {s.daily.length === 0 ? (
        <p className="mt-3 text-sm text-mute">এখনো কোনো সাইনআপ নেই।</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs tracking-widest text-mute uppercase">
              <tr>
                <th className="py-3 pr-4">তারিখ</th>
                <th className="py-3">সাইনআপ</th>
              </tr>
            </thead>
            <tbody>
              {s.daily.map((d) => (
                <tr key={d.day} className="border-b border-line">
                  <td className="py-3 pr-4 tabular-nums">{d.day}</td>
                  <td className="py-3 tabular-nums">{d.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mt-12 font-serif text-2xl">সব গ্রাহক</h2>
      <p className="mt-2 text-sm text-ink-soft">যারা অর্ডার দিয়েছেন, তাদের তালিকা। নামে ক্লিক করলে বিস্তারিত দেখা যাবে।</p>
      {book.length === 0 ? (
        <p className="mt-3 text-sm text-mute">এখনো কোনো অর্ডার নেই।</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs tracking-widest text-mute uppercase">
              <tr>
                <th className="py-3 pr-4">নাম</th>
                <th className="py-3 pr-4">মোবাইল</th>
                <th className="py-3 pr-4">শহর</th>
                <th className="py-3 pr-4">অর্ডার</th>
                <th className="py-3 pr-4">পেইড</th>
                <th className="py-3">মোট কেনা</th>
              </tr>
            </thead>
            <tbody>
              {book.map((c) => (
                <tr key={c.phone} className="border-b border-line">
                  <td className="py-3 pr-4">
                    <Link to="/admin-customer/$phone" params={{ phone: c.phone }} className="underline underline-offset-4">
                      {c.name || c.phone}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 tabular-nums">{c.phone}</td>
                  <td className="py-3 pr-4">{c.city}</td>
                  <td className="py-3 pr-4 tabular-nums">{c.orders}</td>
                  <td className="py-3 pr-4 tabular-nums">{c.paidOrders}</td>
                  <td className="py-3 tabular-nums">{taka(c.paidTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
