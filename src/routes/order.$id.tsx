import { createFileRoute, Link } from "@tanstack/react-router";
import { payMethods, taka } from "@/lib/catalog";
import { useCart } from "@/lib/store";

export const Route = createFileRoute("/order/$id")({
  head: () => ({ meta: [{ title: "Order received — Raya Mart" }] }),
  component: OrderPage,
});

function OrderPage() {
  const { id } = Route.useParams();
  const order = useCart((s) => s.orders.find((o) => o.id === id));
  const pay = payMethods.find((m) => m.id === order?.customer.pay);

  if (!order) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20">
        <h1 className="font-serif text-5xl">We cannot see that order on this device.</h1>
        <p className="mt-3 text-ink-soft">
          Orders stay on the phone or computer that placed them. If this is a different device, the desk still has the request.
        </p>
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <p className="text-xs tracking-widest text-gold uppercase">Request received</p>
      <h1 className="mt-3 font-serif text-5xl leading-none sm:text-6xl">The desk has it.</h1>
      <p className="mt-4 text-ink-soft">
        {order.customer.name}, we will call {order.customer.phone} to confirm before anything is charged. Keep this number.
      </p>
      <p className="mt-8 font-serif text-4xl tabular-nums">{order.id}</p>
      <p className="mt-1 text-sm text-mute">{when} · {order.customer.city}</p>

      <ul className="mt-8 divide-y divide-line border-y border-line">
        {order.lines.map((line) => (
          <li key={line.slug} className="flex items-center gap-4 py-4">
            <img src={line.image} alt="" className="size-16 object-cover" />
            <div className="flex-1">
              <p className="font-serif text-2xl leading-tight">{line.name}</p>
              <p className="text-xs text-mute">× {line.qty}</p>
            </div>
            <p className="text-sm tabular-nums">{taka(line.price * line.qty)}</p>
          </li>
        ))}
      </ul>
      <dl className="mt-4 space-y-2 text-sm">
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
