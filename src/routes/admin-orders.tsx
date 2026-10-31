import { useMemo, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { AdminNav } from "@/components/admin-nav";
import { payMethods, taka } from "@/lib/catalog";
import {
  FULFILLMENT_STATUSES,
  listAdminOrdersFull,
  setOrderFulfillment,
  type AdminOrderRow,
  type FulfillmentStatus,
} from "@/lib/admin-orders";

export const Route = createFileRoute("/admin-orders")({
  head: () => ({ meta: [{ title: "Orders — Raya Mart admin" }] }),
  loader: () => listAdminOrdersFull(),
  component: AdminOrders,
});

type Filter = "all" | "unpaid" | FulfillmentStatus;

const filterList: { value: Filter; label: string }[] = [
  { value: "all", label: "সব" },
  { value: "unpaid", label: "পেমেন্ট অপেক্ষায়" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const statusLabel: Record<FulfillmentStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function dhaka(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", dateStyle: "medium", timeStyle: "short" });
}

function payName(pay: string): string {
  return payMethods.find((m) => m.id === pay)?.name ?? pay;
}

function AdminOrders() {
  const orders = Route.useLoaderData();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [printId, setPrintId] = useState<string | null>(null);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (filter === "unpaid" && (o.paid || o.cancelled)) return false;
      if (filter !== "all" && filter !== "unpaid" && o.fulfillment !== filter) return false;
      if (!q) return true;
      return [o.id, o.customer.phone, o.customer.name].some((v) => v.toLowerCase().includes(q));
    });
  }, [orders, filter, query]);

  const printing = orders.find((o) => o.id === printId) ?? null;

  function printOrder(id: string) {
    setPrintId(id);
    setTimeout(() => window.print(), 50);
  }

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 print:hidden">
        <p className="text-xs tracking-widest text-mute uppercase">Admin</p>
        <h1 className="mt-2 font-serif text-4xl">অর্ডার ম্যানেজমেন্ট</h1>
        <AdminNav />

        <div className="mt-6 flex flex-wrap gap-2">
          {filterList.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`border px-3 py-2 text-xs ${filter === f.value ? "border-ink bg-ink text-ivory" : "border-line bg-white"}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="অর্ডার নম্বর, নাম বা মোবাইল দিয়ে খোঁজো"
          className="mt-4 w-full border border-line bg-white px-4 py-3 text-sm outline-none focus:border-pine"
        />
        <p className="mt-3 text-xs text-mute">{shown.length} টি অর্ডার</p>

        <ul className="mt-4 space-y-4">
          {shown.map((o) => (
            <OrderCard key={o.id} order={o} onPrint={() => printOrder(o.id)} />
          ))}
        </ul>
        {shown.length === 0 ? <p className="mt-8 text-sm text-mute">কোনো অর্ডার নেই।</p> : null}
      </div>

      {printing ? <PrintSheet order={printing} /> : null}
    </>
  );
}

function OrderCard({ order, onPrint }: { order: AdminOrderRow; onPrint: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<FulfillmentStatus>(order.fulfillment);
  const [tracking, setTracking] = useState(order.tracking);
  const [note, setNote] = useState(order.adminNote);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const paidLabel = order.cancelled
    ? "বাতিল"
    : order.paid
      ? `পেমেন্ট নিশ্চিত${order.paidTrx ? ` · ${order.paidTrx}` : ""}`
      : "পেমেন্ট অপেক্ষায়";

  async function save() {
    setBusy(true);
    setMessage("");
    try {
      await setOrderFulfillment({ data: { id: order.id, status, tracking, note } });
      await router.invalidate();
      setMessage("সংরক্ষিত হয়েছে।");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "সংরক্ষণ করা যায়নি।");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="border border-line bg-white">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left">
        <div>
          <p className="font-mono text-xs">{order.id}</p>
          <p className="mt-1 text-sm font-medium">{order.customer.name} · {order.customer.phone}</p>
          <p className="text-xs text-mute">{dhaka(order.createdAt)}</p>
        </div>
        <div className="text-right text-sm">
          <p className="font-medium tabular-nums">{taka(order.total)}</p>
          <p className="text-xs text-ink-soft">{statusLabel[order.fulfillment]} · {paidLabel}</p>
        </div>
      </button>

      {open ? (
        <div className="space-y-5 border-t border-line p-4">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-xs tracking-widest text-mute uppercase">কাস্টমার</p>
              <p className="mt-1 text-sm">{order.customer.name} · {order.customer.phone}</p>
              <p className="text-sm text-ink-soft">{order.customer.address}, {order.customer.city}</p>
              {order.customer.note ? <p className="mt-1 text-xs text-mute">কাস্টমারের নোট: {order.customer.note}</p> : null}
              <p className="mt-2 text-xs text-mute">
                পেমেন্ট: {payName(order.customer.pay)}
                {order.ref ? ` · পার্টনার: ${order.ref}` : ""}
              </p>
            </div>
            <div>
              <p className="text-xs tracking-widest text-mute uppercase">প্রোডাক্ট</p>
              <ul className="mt-1 space-y-1 text-sm">
                {order.lines.map((l) => (
                  <li key={l.slug}>{l.name} × {l.qty} — {taka(l.price * l.qty)}</li>
                ))}
              </ul>
              <div className="mt-3 space-y-1 text-xs text-mute">
                <p>সাবটোটাল: {taka(order.subtotal)}</p>
                {order.discount ? <p>ছাড়: −{taka(order.discount)}</p> : null}
                <p>ডেলিভারি: {taka(order.shipping)}</p>
                <p className="font-medium text-ink">মোট: {taka(order.total)}</p>
                {order.customer.pay === "cod" ? <p>ডেলিভারির সময় নিতে হবে: {taka(order.dueOnDelivery)}</p> : null}
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-sm">
              স্ট্যাটাস
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as FulfillmentStatus)}
                className="mt-1 w-full border border-line bg-white px-3 py-2 text-sm"
              >
                {FULFILLMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>{statusLabel[s]}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              ট্র্যাকিং নম্বর
              <input value={tracking} onChange={(e) => setTracking(e.target.value)} className="mt-1 w-full border border-line bg-white px-3 py-2 text-sm" />
            </label>
            <label className="text-sm md:col-span-3">
              নোট (শুধু অ্যাডমিনের জন্য)
              <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full border border-line bg-white px-3 py-2 text-sm" />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={save} disabled={busy} className="bg-pine px-4 py-2 text-sm text-white disabled:opacity-50">
              {busy ? "সংরক্ষণ…" : "সংরক্ষণ করো"}
            </button>
            <button type="button" onClick={onPrint} className="border border-ink px-4 py-2 text-sm">প্রিন্ট</button>
            {message ? <p className="text-xs text-mute">{message}</p> : null}
          </div>
        </div>
      ) : null}
    </li>
  );
}

function PrintSheet({ order }: { order: AdminOrderRow }) {
  return (
    <div className="hidden p-8 text-sm text-black print:block">
      <h1 className="font-serif text-3xl">Raya Mart — অর্ডার</h1>
      <p className="mt-2">অর্ডার: {order.id}</p>
      <p>তারিখ: {dhaka(order.createdAt)}</p>
      <p className="mt-4 font-medium">প্রাপক</p>
      <p>{order.customer.name} · {order.customer.phone}</p>
      <p>{order.customer.address}, {order.customer.city}</p>
      {order.customer.note ? <p>নোট: {order.customer.note}</p> : null}
      <p className="mt-4 font-medium">প্রোডাক্ট</p>
      <ul>
        {order.lines.map((l) => (
          <li key={l.slug}>{l.name} × {l.qty} — {taka(l.price * l.qty)}</li>
        ))}
      </ul>
      <p className="mt-4">মোট: {taka(order.total)} · পেমেন্ট: {payName(order.customer.pay)}</p>
      {order.customer.pay === "cod" ? <p>ডেলিভারির সময় নিতে হবে: {taka(order.dueOnDelivery)}</p> : null}
      {order.tracking ? <p>ট্র্যাকিং: {order.tracking}</p> : null}
    </div>
  );
}
