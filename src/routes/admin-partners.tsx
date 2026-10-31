import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { taka } from "@/lib/catalog";
import { listPartnerReport, setOrderStatus, type CommissionState } from "@/lib/orders";
import { listPartnerApplications, reviewPartner, type PartnerRecord } from "@/lib/partners";

export const Route = createFileRoute("/admin-partners")({
  head: () => ({ meta: [{ title: "Partners — Raya Mart admin" }] }),
  loader: async () => ({
    report: await listPartnerReport(),
    applications: await listPartnerApplications(),
  }),
  component: AdminPartners,
});

const stateLabel: Record<CommissionState, string> = {
  none: "—",
  unpaid: "Not paid yet",
  pending: "Pending (until delivered)",
  approved: "Approved",
  cancelled: "Cancelled",
};

const stateClass: Record<CommissionState, string> = {
  none: "text-mute",
  unpaid: "text-mute",
  pending: "text-gold",
  approved: "font-medium text-blue-600",
  cancelled: "text-brick",
};

function AdminPartners() {
  const { report, applications } = Route.useLoaderData();
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function change(id: string, status: "open" | "delivered" | "cancelled") {
    setError("");
    setBusyId(id);
    try {
      await setOrderStatus({ data: { id, status } });
      await router.invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update this order.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <p className="text-xs tracking-widest text-mute uppercase">Admin</p>
      <h1 className="mt-2 font-serif text-4xl">Partners and delivery</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-soft">
        Commission is 10% of the product amount after discount. It becomes approved only when the order is paid and marked delivered.
        Cancelled orders lose their commission.
      </p>

      <h2 className="mt-10 font-serif text-2xl">Partner applications</h2>
      {applications.length === 0 ? (
        <p className="mt-3 text-sm text-mute">No applications yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs tracking-widest text-mute uppercase">
              <tr>
                <th className="py-3 pr-4">Applicant</th>
                <th className="py-3 pr-4">Page / link</th>
                <th className="py-3 pr-4">Audience</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3">Decision</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <ApplicationRow key={app.id} app={app} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mt-12 font-serif text-2xl">Partners</h2>
      {report.partners.length === 0 ? (
        <p className="mt-3 text-sm text-mute">No partner orders yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs tracking-widest text-mute uppercase">
              <tr>
                <th className="py-3 pr-4">Partner code</th>
                <th className="py-3 pr-4">Orders</th>
                <th className="py-3 pr-4">Paid</th>
                <th className="py-3 pr-4">Pending</th>
                <th className="py-3 pr-4">Approved to pay</th>
                <th className="py-3">Cancelled</th>
              </tr>
            </thead>
            <tbody>
              {report.partners.map((p) => (
                <tr key={p.ref} className="border-b border-line">
                  <td className="py-3 pr-4 font-mono text-xs">{p.ref}</td>
                  <td className="py-3 pr-4 tabular-nums">{p.orders}</td>
                  <td className="py-3 pr-4 tabular-nums">{p.paid}</td>
                  <td className="py-3 pr-4 tabular-nums">{taka(p.pending)}</td>
                  <td className="py-3 pr-4 tabular-nums font-medium">{taka(p.approved)}</td>
                  <td className="py-3 tabular-nums">{p.cancelled}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mt-12 font-serif text-2xl">Orders</h2>
      {error ? <p role="alert" className="mt-3 text-sm text-brick">{error}</p> : null}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-xs tracking-widest text-mute uppercase">
            <tr>
              <th className="py-3 pr-4">Order</th>
              <th className="py-3 pr-4">Partner</th>
              <th className="py-3 pr-4">Customer</th>
              <th className="py-3 pr-4">Total</th>
              <th className="py-3 pr-4">Payment</th>
              <th className="py-3 pr-4">Commission</th>
              <th className="py-3">Delivery</th>
            </tr>
          </thead>
          <tbody>
            {report.orders.map((o) => (
              <tr key={o.id} className="border-b border-line align-top">
                <td className="py-3 pr-4 font-mono text-xs">{o.id}</td>
                <td className="py-3 pr-4 font-mono text-xs">{o.ref ?? "—"}</td>
                <td className="py-3 pr-4">
                  {o.customerName}
                  <br />
                  <span className="text-mute">{o.phone}</span>
                </td>
                <td className="py-3 pr-4 tabular-nums">{taka(o.total)}</td>
                <td className="py-3 pr-4">
                  {o.paid ? <span className="text-blue-600">✔ {o.paidTrx}</span> : <span className="text-brick">Waiting</span>}
                </td>
                <td className="py-3 pr-4">
                  {o.ref ? (
                    <>
                      <span className="tabular-nums">{taka(o.commission)}</span>
                      <br />
                      <span className={`text-xs ${stateClass[o.commissionState]}`}>{stateLabel[o.commissionState]}</span>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-3">
                  <div className="flex flex-wrap gap-2">
                    {o.status !== "delivered" ? (
                      <button
                        type="button"
                        disabled={busyId === o.id || !o.paid}
                        onClick={() => change(o.id, "delivered")}
                        className="border border-ink px-3 py-1 text-xs disabled:opacity-40"
                        title={o.paid ? "" : "Payment must be confirmed first"}
                      >
                        Mark delivered
                      </button>
                    ) : null}
                    {o.status !== "cancelled" ? (
                      <button
                        type="button"
                        disabled={busyId === o.id}
                        onClick={() => change(o.id, "cancelled")}
                        className="border border-line px-3 py-1 text-xs text-brick disabled:opacity-40"
                      >
                        Cancel
                      </button>
                    ) : null}
                    {o.status !== "open" ? (
                      <button
                        type="button"
                        disabled={busyId === o.id}
                        onClick={() => change(o.id, "open")}
                        className="border border-line px-3 py-1 text-xs disabled:opacity-40"
                      >
                        Reopen
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {report.orders.length === 0 ? <p className="mt-6 text-sm text-mute">No orders yet.</p> : null}
      </div>
    </div>
  );
}

function ApplicationRow({ app }: { app: PartnerRecord }) {
  const router = useRouter();
  const [code, setCode] = useState(app.code ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function review(action: "approve" | "reject") {
    setErr("");
    setBusy(true);
    try {
      await reviewPartner({ data: { id: app.id, action, code } });
      await router.invalidate();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr className="border-b border-line align-top">
      <td className="py-3 pr-4">
        {app.name}
        <br />
        <span className="text-mute">{app.phone}</span>
      </td>
      <td className="py-3 pr-4 break-all text-xs">{app.handle}</td>
      <td className="py-3 pr-4 text-xs">{app.audience || "—"}</td>
      <td className="py-3 pr-4 text-xs">{app.status}</td>
      <td className="py-3">
        {app.status === "approved" ? (
          <span className="font-mono text-xs">code: {app.code}</span>
        ) : (
          <div className="flex flex-wrap gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="code e.g. rahim"
              className="h-8 w-32 border border-line px-2 text-xs"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => review("approve")}
              className="border border-ink px-3 py-1 text-xs disabled:opacity-40"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => review("reject")}
              className="border border-line px-3 py-1 text-xs text-brick disabled:opacity-40"
            >
              Reject
            </button>
          </div>
        )}
        {err ? <p className="mt-1 text-xs text-brick">{err}</p> : null}
      </td>
    </tr>
  );
}
