import { createFileRoute, Link } from "@tanstack/react-router";
import { houses } from "@/lib/catalog";

export const Route = createFileRoute("/house")({
  head: () => ({
    meta: [
      { title: "The house — Raya Mart" },
      {
        name: "description",
        content:
          "How Raya Mart buys, confirms and delivers. A Dhaka desk for a short list of houses abroad.",
      },
    ],
  }),
  component: HousePage,
});

function HousePage() {
  return (
    <article>
      <header className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <p className="text-xs tracking-widest text-gold uppercase">The house</p>
        <h1 className="mt-3 font-serif text-5xl leading-none sm:text-6xl">
          A foreign list. A local desk.
        </h1>
        <p className="mt-6 text-lg text-ink-soft">
          Raya Mart looks the way it does because the things in it come from somewhere specific. The trust is not a slogan. It is a phone call, a seal, and a tracking note.
        </p>
      </header>

      <img
        src="/media/hero.jpg"
        alt="The morning edit arranged on travertine"
        className="max-h-[70vh] w-full object-cover"
      />

      <div className="mx-auto max-w-3xl space-y-12 px-4 py-14 sm:px-6">
        <section id="authenticity">
          <h2 className="font-serif text-4xl">How a piece gets here</h2>
          <p className="mt-4 text-ink-soft">
            We do not stock a warehouse of everything, and we do not pretend to. Some pieces have already landed at the Dhaka desk — those say “Ready in Dhaka” and leave in one to three days. Others are requested from the house that makes them. Those take longer, and the page says so before you add them.
          </p>
          <p className="mt-4 text-ink-soft">
            Either way the bottle, tin or object is the one the house packed. We do not refill, rebottle or put our name over theirs.
          </p>
        </section>

        <section id="shipping">
          <h2 className="font-serif text-4xl">Delivery</h2>
          <p className="mt-4 text-ink-soft">
            We send across all 64 districts. Inside Dhaka, a landed piece is usually with you in one to three days. From the house, allow seven to twelve, including the hop into the country. Delivery is complimentary over ৳3,500. Under that, it is ৳120.
          </p>
        </section>

        <section id="pay">
          <h2 className="font-serif text-4xl">You are not charged on the website</h2>
          <p className="mt-4 text-ink-soft">
            An order here is a request. The desk calls the mobile number you leave, confirms the piece, then takes bKash, Nagad or a card link. Cash on delivery is only for bags where every piece is already in Dhaka. If we cannot get it, we do not invent a substitute.
          </p>
        </section>

        <section id="returns">
          <h2 className="font-serif text-4xl">Returns</h2>
          <p className="mt-4 text-ink-soft">
            Unopened pieces can come back within seven days of delivery. Open the track page, leave the order number, and we arrange the pickup. Fragrance and tea that have been opened stay with you — they cannot be sent on to someone else.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-4xl">The six houses</h2>
          <ul className="mt-6 divide-y divide-line border-y border-line">
            {houses.map((house) => (
              <li key={house.slug} className="py-4">
                <Link to="/shop" search={{ house: house.slug }} className="font-serif text-3xl">
                  {house.name}
                </Link>
                <p className="text-sm text-mute">
                  {house.origin} — {house.line}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-4xl">The desk</h2>
          <p className="mt-4 text-ink-soft">
            Dhaka. Saturday to Thursday, 10 to 7. We answer the number you give us at checkout — we would rather call you than publish a line that rings into nowhere.
          </p>
          <Link to="/shop" search={{}} className="mt-8 inline-flex h-12 items-center bg-pine px-6 text-sm text-ivory">
            Shop the edit
          </Link>
        </section>
      </div>
    </article>
  );
}
