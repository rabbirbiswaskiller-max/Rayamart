import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { payMethods, taka } from "@/lib/catalog";
import { getCustomerOrder, submitPaymentTrx } from "@/lib/orders";

const PAY_NUMBER = "01974414564";

export const Route = createFileRoute("/order/$id")({
  head: () => ({ meta: [{ title: "Order received — Raya Mart" }] }),
  loader: async ({ params }) => ({ order: await getCustomerOrder({ data: { id: params.id } }) }),
  component: OrderPage,
});

// Short, readable track number taken from the stored order ID (10 characters).
// The full ID is still kept and used for tracking and payment checks.
function shortTrackNumber(id: string) {
  return id.replace(/^RM-/, "").slice(0, 10);
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex h-9 shrink-0 items-center border border-ink px-4 text-xs tracking-widest uppercase hover:bg-ink hover:text-ivory"
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}

function OrderPage() {
  const { order } = Route.useLoaderData();
  const [trx, setTrx] = useState("");
  const [paid, setPaid] = useState(Boolean(order?.paid));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const pay = payMethods.find((m) => m.id === order?.customer.pay);
  const isCOD = order?.customer.pay === "cod";
  const needsTrx = order?.customer.pay === "bkash" || order?.customer.pay === "nagad" || isCOD;
  const amountDue = order ? (isCOD ? order.advanceDue : order.total) : 0;

  if (!order) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20">
        <h1 className="font-serif text-5xl">We cannot see that order on this device.</h1>
        <p className="mt-3 text-ink-soft">
          The order is stored on Raya Mart’s server, so it can be checked from another device too.
        </p>
        <p className="mt-2 text-sm text-mute">এই ডিভাইসে অর্ডারটি পাওয়া যাচ্ছে না। অর্ডার সার্ভারে সংরক্ষিত আছে, অন্য ডিভাইসেও ট্র্যাক করা যাবে।</p>
        <Link to="/track" className="mt-6 inline-flex h-12 items-center border border-ink px-6 text-sm">
          Try tracking
        </Link>
      </div>
    );
  }

  const when = new Date(order.createdAt).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const trackNumber = shortTrackNumber(order.id);

  async function onSubmitTrx(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    setBusy(true);
    try {
      const result = await submitPaymentTrx({ data: { id: order!.id, trx } });
      setMessage(result.message);
      if (result.ok) setPaid(true);
    } catch {
      setMessage("Could not verify the payment. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <p className="text-xs tracking-widest text-gold uppercase">Request received</p>
      <h1 className="mt-3 font-serif text-5xl leading-none sm:text-6xl">The desk has it.</h1>
      <p className="mt-2 font-serif text-xl text-ink-soft">আপনার অর্ডার আমাদের কাছে পৌঁছেছে।</p>
      <p className="mt-5 text-ink-soft">
        {order.customer.name}, we will call {order.customer.phone} to confirm before anything is charged. Keep this number.
      </p>
      <p className="mt-1 text-sm text-mute">
        {order.customer.name}, কিছু চার্জ করার আগে আমরা {order.customer.phone} নম্বরে কল করে নিশ্চিত করব। এই নম্বরটি সংরক্ষণ করুন।
      </p>

      <section className="mt-8 border border-line bg-ivory p-6">
        <p className="text-xs tracking-widest text-gold uppercase">Track number · ট্র্যাক নম্বর</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <p className="font-serif text-4xl tracking-wide tabular-nums">{trackNumber}</p>
          <CopyButton value={trackNumber} label="Copy" />
        </div>
        <p className="mt-2 text-sm text-mute">{when} · {order.customer.city}</p>
        <div className="mt-5 border-t border-line pt-4">
          <p className="text-xs tracking-widest text-mute uppercase">Full order ID (for tracking) · সম্পূর্ণ অর্ডার আইডি</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <p className="break-all font-mono text-xs text-ink-soft">{order.id}</p>
            <CopyButton value={order.id} label="Copy ID" />
          </div>
        </div>
      </section>

      {needsTrx ? (
        <section className="mt-6 border border-line bg-ivory p-6">
          <p className="text-xs tracking-widest text-gold uppercase">
            {isCOD ? "Delivery fee · ডেলিভারি ফি" : "Send money · টাকা পাঠান"}
          </p>
          {paid ? (
            <>
              <p className="mt-3 font-serif text-3xl">Payment confirmed.</p>
              <p className="mt-1 text-sm text-mute">পেমেন্ট নিশ্চিত হয়েছে। ধন্যবাদ।</p>
            </>
          ) : (
            <>
              <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
                <div>
                  <p className="text-xs tracking-widest text-mute uppercase">Amount · পরিমাণ</p>
                  <p className="mt-1 font-serif text-3xl tabular-nums">{taka(amountDue)}</p>
                </div>
                <div>
                  <p className="text-xs tracking-widest text-mute uppercase">{pay?.name} number · নম্বর</p>
                  <div className="mt-1 flex items-center gap-3">
                    <p className="font-serif text-2xl tabular-nums">{PAY_NUMBER}</p>
                    <CopyButton value={PAY_NUMBER} label="Copy" />
                  </div>
                </div>
              </div>

              <ol className="mt-5 space-y-3 text-sm text-ink-soft">
                <li className="flex gap-3">
                  <span className="font-serif text-lg text-pine">1</span>
                  <span>
                    {pay?.name} app থেকে “Send Money” বেছে নিন, আর উপরের নম্বরে পাঠান।
                    <span className="block text-xs text-mute">Choose “Send Money” in the {pay?.name} app, and use the number above.</span>
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="font-serif text-lg text-pine">2</span>
                  <span>
                    ঠিক {taka(amountDue)} পাঠান{isCOD ? " (এটি অগ্রিম ডেলিভারি ফি। পণ্যের দাম কুরিয়ারকে দেবেন)" : ""}।
                    <span className="block text-xs text-mute">
                      Send exactly {taka(amountDue)}.{isCOD ? " This is the advance delivery fee. The products are paid to the courier on delivery." : ""}
                    </span>
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="font-serif text-lg text-pine">3</span>
                  <span>
                    প্রাপ্ত TrxID নিচে বসিয়ে “Confirm payment” চাপুন।
                    <span className="block text-xs text-mute">Paste the TrxID you receive below and confirm.</span>
                  </span>
                </li>
              </ol>

              <form onSubmit={onSubmitTrx} className="mt-6 flex flex-col gap-3 sm:flex-row">
                <input
                  className="h-12 flex-1 border border-line bg-paper px-3 text-sm uppercase outline-none focus:border-pine"
                  placeholder="TrxID, e.g. DJQ4KXX961U"
                  value={trx}
                  onChange={(e) => setTrx(e.target.value)}
                  required
                />
                <button
                  type="submit"
                  disabled={busy || trx.trim().length < 6}
                  className="h-12 bg-pine px-6 text-sm text-ivory hover:bg-pine-deep disabled:opacity-60"
                >
                  {busy ? "Checking…" : "Confirm payment"}
                </button>
              </form>
              {message ? <p role="alert" className="mt-3 text-sm text-brick">{message}</p> : null}
            </>
          )}
        </section>
      ) : null}

      <ul className="mt-10 divide-y divide-line border-y border-line">
        {order.lines.map((line) => (
          <li key={`${line.slug}|${line.size ?? ""}`} className="flex items-center gap-4 py-4">
            <img src={line.image} alt="" className="size-16 object-cover" />
            <div className="flex-1">
              <p className="font-serif text-2xl leading-tight">{line.name}</p>
              <p className="text-xs text-mute">{line.size ? `Size: ${line.size} · ` : ""}× {line.qty}</p>
            </div>
            <p className="text-sm tabular-nums">{taka(line.price * line.qty)}</p>
          </li>
        ))}
      </ul>
      <dl className="mt-5 space-y-2 text-sm">
        <div className="flex justify-between"><dt className="text-mute">Delivery</dt><dd>{order.shipping === 0 ? "Complimentary" : taka(order.shipping)}</dd></div>
        <div className="flex justify-between text-base"><dt>Total to confirm</dt><dd className="tabular-nums">{taka(order.total)}</dd></div>
        <div className="flex justify-between"><dt className="text-mute">Payment</dt><dd>{pay?.name}</dd></div>
      </dl>
      <p className="mt-6 text-sm text-ink-soft">{order.customer.address}</p>
      {order.customer.note ? <p className="mt-2 text-sm text-mute">Note: {order.customer.note}</p> : null}
      <div className="mt-10 flex flex-wrap gap-3">
        <Link to="/track" className="inline-flex h-12 items-center border border-ink px-6 text-sm">
          Track
        </Link>
        <Link to="/shop" search={{}} className="inline-flex h-12 items-center bg-pine px-6 text-sm text-ivory">
          Continue browsing
        </Link>
      </div>
    </div>
  );
}
