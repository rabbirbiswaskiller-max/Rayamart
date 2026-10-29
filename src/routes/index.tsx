import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { categories, houses, products } from "@/lib/catalog";
import { ProductCard } from "@/components/product-card";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const flash = products.filter((p) => p.flash);
  const edit = products.filter((p) => p.category !== "sets").slice(0, 8);

  return (
    <div>
      <section className="grid lg:min-h-[82vh] lg:grid-cols-12">
        <div className="order-2 flex flex-col justify-end px-4 py-10 sm:px-6 lg:order-1 lg:col-span-5 lg:px-10 lg:py-16">
          <p className="text-xs tracking-widest text-gold uppercase">The import house</p>
          <h1 className="mt-4 font-serif text-5xl leading-none sm:text-6xl lg:text-7xl">
            Brought from abroad.{" "}
            <em className="text-pine italic">Kept honest.</em>
          </h1>
          <p className="mt-6 max-w-md text-base text-ink-soft">
            Raya Mart is a small buying desk. We choose beauty, wellness and objects from houses in France, Korea, Japan and the Nordics — then send them, sealed, to your door.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/shop"
              search={{}}
              className="inline-flex h-12 items-center bg-pine px-6 text-sm text-ivory hover:bg-pine-deep"
            >
              Shop the edit
            </Link>
            <Link
              to="/house"
              className="inline-flex h-12 items-center border border-ink px-6 text-sm hover:bg-ink hover:text-ivory"
            >
              Why it feels different
            </Link>
          </div>
          <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-line pt-6 text-xs">
            <div>
              <dt className="text-mute uppercase tracking-widest">Houses</dt>
              <dd className="mt-1 font-serif text-2xl">6</dd>
            </div>
            <div>
              <dt className="text-mute uppercase tracking-widest">Districts</dt>
              <dd className="mt-1 font-serif text-2xl">64</dd>
            </div>
            <div>
              <dt className="text-mute uppercase tracking-widest">Returns</dt>
              <dd className="mt-1 font-serif text-2xl">7 days</dd>
            </div>
          </dl>
        </div>
        <div className="order-1 lg:order-2 lg:col-span-7">
          <img
            src="/media/hero.jpg"
            alt="Dawn serum, rice veil and neroli water arranged on travertine in morning light"
            className="h-[52vh] w-full object-cover sm:h-[64vh] lg:h-full lg:min-h-[82vh]"
          />
        </div>
      </section>

      <section className="border-y border-line bg-ivory">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <Promise icon={<ShieldCheck className="size-5" />} title="Sealed at origin" body="Bottles arrive as the house packed them. We do not refill, rebottle or relabel." />
          <Promise icon={<BadgeCheck className="size-5" />} title="Named houses" body="Every piece belongs to a maker you can read about. No mystery listings." />
          <Promise icon={<Truck className="size-5" />} title="Tracked to you" body="Dhaka in a day or three if it is already here. Longer, and we say so." />
          <Promise icon={<RotateCcw className="size-5" />} title="Quiet returns" body="Unopened pieces come back within 7 days. We arrange the pickup." />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs tracking-widest text-mute uppercase">All you need</p>
            <h2 className="mt-2 font-serif text-4xl">Six rooms, not six thousand.</h2>
          </div>
          <Link to="/shop" search={{}} className="hidden text-sm underline underline-offset-4 sm:inline">
            See the full edit
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              to="/shop"
              search={{ cat: cat.slug }}
              className="group relative block overflow-hidden bg-paper-2"
            >
              <img
                src={cat.image}
                alt=""
                className="aspect-[4/5] w-full object-cover motion-safe:transition motion-safe:duration-500 motion-safe:group-hover:scale-[1.03]"
              />
              <div className="absolute inset-x-0 bottom-0 bg-ink/75 p-4">
                <p className="font-serif text-3xl text-ivory">{cat.name}</p>
                <p className="text-sm text-ivory">{cat.line}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

{flash.length > 0 && (
      <section className="bg-pine text-ivory">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs tracking-widest text-foam uppercase">Limited arrival</p>
              <h2 className="mt-2 font-serif text-4xl text-ivory">Small batches, brought in once.</h2>
            </div>
            <p className="text-sm text-ivory/80">
              Available while stock lasts
            </p>
          </div>
          <div className="no-scrollbar mt-8 flex gap-4 overflow-x-auto pb-2">
            {flash.map((product) => (
              <div key={product.slug} className="w-64 shrink-0 sm:w-72">
                <div className="bg-ivory p-3 text-ink">
                  <ProductCard product={product} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {edit.length > 0 && (
      <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs tracking-widest text-mute uppercase">The edit</p>
            <h2 className="mt-2 font-serif text-4xl">What the desk is sending.</h2>
          </div>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
          {edit.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </section>
      )}

      {products.length > 0 && (
      <section className="grid lg:grid-cols-2">
        <img
          src="/media/arrival.jpg"
          alt="A cream gift box opened on linen, tissue pulled back from a glass bottle"
          className="h-80 w-full object-cover lg:h-full"
        />
        <div className="flex flex-col justify-center bg-paper-2 px-4 py-12 sm:px-10 lg:px-16">
          <p className="text-xs tracking-widest text-gold uppercase">The arrival</p>
          <h2 className="mt-3 font-serif text-4xl sm:text-5xl">
            Wrapped here. Chosen there.
          </h2>
          <p className="mt-4 max-w-md text-ink-soft">
            We do not keep a warehouse of everything. A piece is requested from the house that makes it, or taken from what has already landed in Dhaka. Either way, you know which — before you pay.
          </p>
          <Link
            to="/product/$slug"
            params={{ slug: "the-arrival" }}
            className="mt-8 inline-flex h-12 w-fit items-center bg-ink px-6 text-sm text-ivory"
          >
            See the gift box
          </Link>
        </div>
      </section>
      )}

      <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <p className="text-xs tracking-widest text-mute uppercase">The houses</p>
        <h2 className="mt-2 font-serif text-4xl">Six names. No one else’s logos.</h2>
        <ul className="mt-8 divide-y divide-line border-y border-line">
          {houses.map((house) => (
            <li key={house.slug}>
              <Link
                to="/shop"
                search={{ house: house.slug }}
                className="flex flex-col gap-1 py-5 sm:flex-row sm:items-baseline sm:justify-between"
              >
                <span className="font-serif text-3xl">{house.name}</span>
                <span className="text-sm text-mute">
                  {house.origin} — {house.line}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Promise({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 text-pine">{icon}</div>
      <div>
        <h3 className="text-sm tracking-wide">{title}</h3>
        <p className="mt-1 text-sm text-ink-soft">{body}</p>
      </div>
    </div>
  );
}
