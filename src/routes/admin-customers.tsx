import { createFileRoute } from "@tanstack/react-router";
import { AdminNav } from "@/components/admin-nav";
import { getCustomerStats } from "@/lib/customers";

export const Route = createFileRoute("/admin-customers")({
  head: () => ({ meta: [{ title: "Customers — Raya Mart admin" }] }),
  loader: () => getCustomerStats(),
  component: AdminCustomers,
});

function AdminCustomers() {
  const s = Route.useLoaderData();
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
    </div>
  );
}
