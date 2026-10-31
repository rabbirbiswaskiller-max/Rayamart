import { createFileRoute } from "@tanstack/react-router";
import { AdminNav } from "@/components/admin-nav";
import { getSalesReport, type ReportBucket } from "@/lib/admin-reports";
import { taka } from "@/lib/catalog";

export const Route = createFileRoute("/admin-reports")({
  head: () => ({ meta: [{ title: "Reports — Raya Mart admin" }] }),
  loader: () => getSalesReport(),
  component: ReportsPage,
});

function ReportsPage() {
  const r = Route.useLoaderData();
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <p className="text-xs tracking-widest text-mute uppercase">Admin</p>
      <h1 className="mt-2 font-serif text-4xl">রিপোর্ট</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-soft">
        শুধু পেইড ও বাতিল-নয় অর্ডার গণনা হয়েছে। লাভ = বিক্রয় (ছাড়ের পরে) − কস্ট। ডেলিভারি চার্জ ধরা নেই।
      </p>
      <AdminNav />

      <Section title="দৈনিক (গত ৩০ দিন)" rows={r.daily} />
      <Section title="সাপ্তাহিক (গত ৭ সপ্তাহ)" rows={r.weekly} />
      <Section title="মাসিক (গত ১২ মাস)" rows={r.monthly} />

      <h2 className="mt-12 font-serif text-2xl">সেরা প্রোডাক্ট (সব সময়)</h2>
      {r.top.length === 0 ? (
        <p className="mt-3 text-sm text-mute">এখনো কোনো পেইড অর্ডার নেই।</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs tracking-widest text-mute uppercase">
              <tr>
                <th className="py-3 pr-4">প্রোডাক্ট</th>
                <th className="py-3 pr-4">পরিমাণ</th>
                <th className="py-3 pr-4">বিক্রয়</th>
                <th className="py-3">লাভ</th>
              </tr>
            </thead>
            <tbody>
              {r.top.map((p) => (
                <tr key={p.slug} className="border-b border-line">
                  <td className="py-3 pr-4">{p.name}</td>
                  <td className="py-3 pr-4 tabular-nums">{p.qty}</td>
                  <td className="py-3 pr-4 tabular-nums">{taka(p.revenue)}</td>
                  <td className="py-3 tabular-nums">{p.profit === null ? <span className="text-mute">—</span> : taka(p.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Section({ title, rows }: { title: string; rows: ReportBucket[] }) {
  return (
    <>
      <h2 className="mt-12 font-serif text-2xl">{title}</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-xs tracking-widest text-mute uppercase">
            <tr>
              <th className="py-3 pr-4">সময়কাল</th>
              <th className="py-3 pr-4">অর্ডার</th>
              <th className="py-3 pr-4">বিক্রয়</th>
              <th className="py-3">লাভ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.label} className={`border-b border-line ${b.orders === 0 ? "text-mute" : ""}`}>
                <td className="py-3 pr-4 tabular-nums">{b.label}</td>
                <td className="py-3 pr-4 tabular-nums">{b.orders}</td>
                <td className="py-3 pr-4 tabular-nums">{taka(b.sales)}</td>
                <td className="py-3 tabular-nums">
                  {taka(b.profit)}
                  {b.unknownProfit > 0 && <span className="text-xs text-mute"> (+{b.unknownProfit} কস্টবিহীন)</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
