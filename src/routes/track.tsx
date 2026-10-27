import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { taka } from "@/lib/catalog";
import { useCart, type OrderRecord } from "@/lib/store";

export const Route = createFileRoute("/track")({
  head: () => ({ meta: [{ title: "Track — Raya Mart" }] }),
  component: TrackPage,
});

function TrackPage() {
  const orders = useCart((s) => s.orders);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<OrderRecord[] | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim().toLowerCase();
    const found = orders.filter(
      (order) =>
        order.id.toLowerCase() === q ||
        order.customer.phone.replace(/\s/g, "").includes(q.replace(/\s/g, "")),
    );
    setHits(found);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <p className="text-xs tracking-widest text-mute uppercase">Track</p>
      <h1 className="mt-3 font-serif text-5xl">Where is it?</h1>
      <p className="mt-3 text-ink-soft">
        Look up a request with the order number, or the mobile used at checkout. This device remembers orders placed here.
      </p>
      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-3 sm:flex-row">
        <label className="flex-1 text-xs tracking-widest text-mute uppercase">
          Order or mobile
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mt-2 h-12 w-full border border-line bg-ivory px-3 text-sm tracking-normal text-ink normal-case"
            placeholder="RM-… or 01…"
          />
        </label>
        <button type="submit" className="h-12 bg-pine px-6 text-sm text-ivory sm:mt-6">
          Look up
        </button>
      </form>

      {hits && hits.length === 0 ? (
        <p className="mt-8 text-ink-soft">
          Nothing on this device matches. If you ordered from another phone, the desk still has the request — keep an eye on the number you left.
        </p>
      ) : null}

      <ul className="mt-8 space-y-4">
        {(hits ?? orders).map((order) => (
          <li key={order.id} className="border border-line bg-ivory p-5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-serif text-2xl">{order.id}</p>
              <p className="text-sm tabular-nums">{taka(order.total)}</p>
            </div>
            <p className="mt-1 text-sm text-mute">
              {order.customer.city} · {order.lines.map((l) => l.name).join(", ")}
            </p>
            <p className="mt-3 text-sm text-ink-soft">
              Status: with the desk. We confirm by phone, then hand it to the courier. You will get the tracking note on that call.
            </p>
            <Link
              to="/order/$id"
              params={{ id: order.id }}
              className="mt-3 inline-block text-sm underline underline-offset-4"
            >
              Open the request
            </Link>
          </li>
        ))}
      </ul>

      {orders.length === 0 && hits === null ? (
        <p className="mt-8 text-sm text-mute">No requests on this device yet.</p>
      ) : null}
    </div>
  );
}
