import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { payMethods, taka } from "@/lib/catalog";
import { trackOrderDetail, type AccountOrderStatus, type TrackDetail } from "@/lib/customers";

export const Route = createFileRoute("/track")({
  head: () => ({ meta: [{ title: "Track — Raya Mart" }] }),
  component: TrackPage,
});

const statusCopy: Record<AccountOrderStatus, { title: string; body: string }> = {
  unpaid: {
    title: "Waiting for payment",
    body: "Send the payment to the number on your order page, then enter the TrxID there. We will update this page once it is confirmed.",
  },
  paid: {
    title: "Payment confirmed",
    body: "The desk will call you about the piece. This page updates when it is handed to the courier.",
  },
  delivered: {
    title: "Delivered",
    body: "The desk has marked this order as delivered. If anything is wrong, contact us on the number we called you from.",
  },
  cancelled: {
    title: "Cancelled",
    body: "This order has been cancelled. If you have a question, contact the desk.",
  },
};

const shipCopy: Record<string, string> = {
  pending: "Being prepared",
  processing: "Being prepared",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function TrackPage() {
  const [orderId, setOrderId] = useState("");
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<TrackDetail | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    setBusy(true);
    try {
      setResult(await trackOrderDetail({ data: { id: orderId.trim(), phone: phone.trim() } }));
    } catch {
      setError("Could not look up the order right now. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <p className="text-xs tracking-widest text-mute uppercase">Track</p>
      <h1 className="mt-3 font-serif text-5xl">Where is it?</h1>
      <p className="mt-3 text-ink-soft">
        Enter the order number and the mobile number you used at checkout. You can check from any device.
      </p>

      <form onSubmit={onSubmit} className="mt-8 grid gap-4 sm:grid-cols-2">
        <label className="block text-xs tracking-widest text-mute uppercase">
          Order number
          <input
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className="mt-2 h-12 w-full border border-line bg-ivory px-3 text-sm tracking-normal text-ink normal-case"
            placeholder="RM-…"
            autoComplete="off"
          />
        </label>
        <label className="block text-xs tracking-widest text-mute uppercase">
          Mobile
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            className="mt-2 h-12 w-full border border-line bg-ivory px-3 text-sm tracking-normal text-ink normal-case"
            placeholder="01XXXXXXXXX"
            autoComplete="tel"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="h-12 bg-pine px-6 text-sm text-ivory disabled:opacity-60 sm:col-span-2 sm:w-fit"
        >
          {busy ? "Checking…" : "Check status"}
        </button>
      </form>

      {error ? <p role="alert" className="mt-6 text-sm text-brick">{error}</p> : null}

      {result && !result.found ? (
        <p className="mt-8 text-ink-soft">
          No order matches that number and mobile. Check both, or contact the desk.
        </p>
      ) : null}

      {result && result.found ? (
        <div className="mt-8 border border-line bg-ivory p-6">
          <p className="font-serif text-3xl tabular-nums">{result.id}</p>
          <p className="mt-1 text-sm text-mute">
            {new Date(result.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            {result.city ? " · " + result.city : ""}
          </p>

          <div className="mt-6 border-t border-line pt-5">
            <p className="text-xs tracking-widest text-gold uppercase">Status</p>
            <p className="mt-2 font-serif text-2xl">{statusCopy[result.status].title}</p>
            <p className="mt-2 text-sm text-ink-soft">{statusCopy[result.status].body}</p>
            {result.status !== "unpaid" && result.status !== "cancelled" ? (
              <p className="mt-3 text-sm">
                Shipping: <strong>{shipCopy[result.fulfillment] ?? "Being prepared"}</strong>
              </p>
            ) : null}
            {result.tracking ? (
              <p className="mt-3 text-sm">
                Tracking number: <span className="font-mono">{result.tracking}</span>
              </p>
            ) : null}
          </div>

          <ul className="mt-6 space-y-1 border-t border-line pt-5 text-sm">
            {result.lines.map((line, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span>{line.name} × {line.qty}</span>
                <span className="tabular-nums">{taka(line.price * line.qty)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-mute">Payment</dt>
              <dd>{payMethods.find((m) => m.id === result.pay)?.name ?? result.pay}</dd>
            </div>
            {result.discount > 0 ? (
              <div className="flex justify-between">
                <dt className="text-mute">Online discount</dt>
                <dd className="tabular-nums">-{taka(result.discount)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between">
              <dt className="text-mute">Total</dt>
              <dd className="tabular-nums">{taka(result.total)}</dd>
            </div>
          </dl>

          <Link
            to="/order/$id"
            params={{ id: result.id }}
            className="mt-5 inline-block text-sm underline underline-offset-4"
          >
            Open the request
          </Link>
        </div>
      ) : null}
    </div>
  );
}
