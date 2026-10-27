import { createFileRoute, Link } from "@tanstack/react-router";
import { FREE_OVER, taka } from "@/lib/catalog";
import { Qty, Price } from "@/components/commerce";
import { useCart, useCartDetailed } from "@/lib/store";

export const Route = createFileRoute("/bag")({
  head: () => ({ meta: [{ title: "Your bag — Raya Mart" }] }),
  component: BagPage,
});

function BagPage() {
  const { lines, subtotal, shipping, total } = useCartDetailed();
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const remain = Math.max(0, FREE_OVER - subtotal);
  const progress = Math.min(100, Math.round((subtotal / FREE_OVER) * 100));

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 sm:px-6">
        <p className="text-xs tracking-widest text-mute uppercase">Bag</p>
        <h1 className="mt-3 font-serif text-5xl">Your bag is empty.</h1>
        <p className="mt-3 text-ink-soft">The edit is short on purpose. Start with one piece you will actually use.</p>
        <Link to="/shop" search={{}} className="mt-8 inline-flex h-12 items-center bg-pine px-6 text-sm text-ivory">
          Shop the edit
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <h1 className="font-serif text-5xl">Your bag</h1>
        <div className="mt-6">
          <div className="h-1 bg-line">
            <div className="h-1 bg-pine" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-sm text-mute">
            {remain === 0
              ? "Complimentary delivery is on this order."
              : `${taka(remain)} more for complimentary delivery.`}
          </p>
        </div>
        <ul className="mt-6 divide-y divide-line border-y border-line">
          {lines.map((line) => (
            <li key={line.slug} className="flex gap-4 py-5">
              <Link to="/product/$slug" params={{ slug: line.slug }} className="block w-24 shrink-0 bg-paper-2 sm:w-28">
                <img src={line.product.image} alt="" className="aspect-square w-full object-cover" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <Link to="/product/$slug" params={{ slug: line.slug }} className="font-serif text-2xl leading-tight">
                  {line.product.name}
                </Link>
                <p className="mt-1 text-xs text-mute">
                  {line.product.size}
                  {" · "}
                  {line.product.landed ? "Ready in Dhaka" : "From the house"}
                </p>
                <div className="mt-3">
                  <Price price={line.product.price} compareAt={line.product.compareAt} />
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <Qty value={line.qty} onChange={(n) => setQty(line.slug, n)} />
                  <button type="button" className="text-xs tracking-widest text-mute uppercase" onClick={() => remove(line.slug)}>
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <aside className="h-fit border border-line bg-ivory p-6 lg:col-span-5">
        <h2 className="font-serif text-3xl">Summary</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <Row label="Pieces" value={taka(subtotal)} />
          <Row label="Delivery" value={shipping === 0 ? "Complimentary" : taka(shipping)} />
          <div className="flex justify-between border-t border-line pt-3 text-base">
            <dt>Total</dt>
            <dd className="tabular-nums">{taka(total)}</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-ink-soft">
          This is a request. The desk confirms stock, then takes payment the way you choose.
        </p>
        <Link
          to="/checkout"
          className="mt-6 inline-flex h-12 w-full items-center justify-center bg-pine text-sm text-ivory hover:bg-pine-deep"
        >
          Continue to the desk
        </Link>
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-ink-soft">
      <dt>{label}</dt>
      <dd className="tabular-nums text-ink">{value}</dd>
    </div>
  );
}
