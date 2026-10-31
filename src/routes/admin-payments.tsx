import { createFileRoute } from "@tanstack/react-router";
import { taka } from "@/lib/catalog";
import { listAllAdminOrders } from "@/lib/orders";

const methodLabel: Record<string, string> = {
  bkash: "bKash",
  nagad: "Nagad",
  cod: "Cash on delivery",
};

export const Route = createFileRoute("/admin-payments")({
  head: () => ({ meta: [{ title: "Payments — Raya Mart admin" }] }),
  loader: async () => ({ orders: await listAllAdminOrders() }),
  component: AdminPayments,
});

function AdminPayments() {
  const { orders } = Route.useLoaderData();
  const rows = orders.filter(
    (o) => o.customer.pay === "bkash" || o.customer.pay === "nagad" || o.customer.pay === "cod",
  );
  const paidCount = rows.filter((o) => o.paid).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <p className="text-xs tracking-widest text-mute uppercase">Admin</p>
      <h1 className="mt-2 font-serif text-4xl">bKash / Nagad / COD payments</h1>
      <p className="mt-2 text-sm text-ink-soft">
        {paidCount} paid · {rows.length - paidCount} waiting
      </p>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-xs tracking-widest text-mute uppercase">
            <tr>
              <th className="py-3 pr-4">Order</th>
              <th className="py-3 pr-4">Customer</th>
              <th className="py-3 pr-4">Method</th>
              <th className="py-3 pr-4">Amount due</th>
              <th className="py-3 pr-4">TrxID</th>
              <th className="py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} className="border-b border-line align-top">
                <td className="py-3 pr-4 font-mono text-xs">{o.id}</td>
                <td className="py-3 pr-4">
                  {o.customer.name}
                  <br />
                  <span className="text-mute">{o.customer.phone}</span>
                </td>
                <td className="py-3 pr-4">{methodLabel[o.customer.pay] ?? o.customer.pay}</td>
                <td className="py-3 pr-4 tabular-nums">
                  {taka(o.customer.pay === "cod" ? o.advanceDue : o.total)}
                </td>
                <td className="py-3 pr-4 font-mono text-xs">{o.paidTrx ?? "—"}</td>
                <td className="py-3">
                  {o.paid ? (
                    <span className="inline-flex items-center gap-1 font-medium text-blue-600">
                      <span aria-hidden>✔</span> Paid
                    </span>
                  ) : (
                    <span className="text-brick">Waiting</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="mt-6 text-sm text-mute">এখনো কোনো অর্ডার নেই।</p> : null}
      </div>
    </div>
  );
}
