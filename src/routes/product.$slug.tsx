import { useState } from "react";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { BadgeCheck, Heart, Truck } from "lucide-react";
import {
  categoryBy,
  houseBy,
  relatedTo,
} from "@/lib/catalog";
import { useCart } from "@/lib/store";
import { Price, Qty, Stars } from "@/components/commerce";
import { ProductCard } from "@/components/product-card";
import { listStoreProducts } from "@/lib/admin/products";
import { getWishlistSlugs, toggleWishlist } from "@/lib/wishlist";

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ params }) => {
    // Inactive pieces are not shown, so they 404 like a missing product.
    const [all, wishlist] = await Promise.all([listStoreProducts(), getWishlistSlugs()]);
    const products = all.filter((item) => item.active !== false);
    const product = products.find((item) => item.slug === params.slug);
    if (!product) throw notFound();
    return { product, products, wishlist };
  },
  head: ({ loaderData }) => ({
    meta: loaderData?.product
      ? [{ title: `${loaderData.product.name} — Raya Mart` }, { name: "description", content: loaderData.product.blurb }]
      : [],
  }),
  notFoundComponent: Missing,
  component: ProductPage,
});

function ProductPage() {
  const { product, products, wishlist } = Route.useLoaderData();
  const house = houseBy(product.house);
  const category = categoryBy(product.category);
  const add = useCart((s) => s.add);
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [saved, setSaved] = useState(wishlist.slugs.includes(product.slug));
  const [wishBusy, setWishBusy] = useState(false);
  const related = relatedTo(product.slug, products);

  async function toggleSaved() {
    if (!wishlist.signedIn) {
      toast("Log in to save pieces.", {
        action: { label: "Log in", onClick: () => navigate({ to: "/account" }) },
      });
      return;
    }
    setWishBusy(true);
    try {
      await toggleWishlist({ data: { slug: product.slug, on: !saved } });
      setSaved(!saved);
      toast(saved ? "Removed from your saved pieces." : "Saved to your account.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save. Please try again.");
    } finally {
      setWishBusy(false);
    }
  }

  return (
    <div>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:py-12">
        <div className="bg-paper-2">
          <img src={product.image} alt={product.alt} className="aspect-square w-full object-cover" />
        </div>
        <div>
          <p className="text-xs tracking-widest text-mute uppercase">
            <Link to="/shop" search={{ house: product.house }} className="hover:text-ink">
              {house?.name}
            </Link>
            <span> · </span>
            <Link to="/shop" search={{ cat: product.category }} className="hover:text-ink">
              {category?.name}
            </Link>
          </p>
          <h1 className="mt-3 font-serif text-5xl leading-none sm:text-6xl">{product.name}</h1>
          <p className="mt-3 text-sm text-mute">{product.origin} · {product.size}</p>
          <div className="mt-4">
            <Stars value={product.rating} count={product.reviews} />
          </div>
          <div className="mt-6">
            <Price price={product.price} compareAt={product.compareAt} size="lg" />
          </div>
          <p className="mt-5 max-w-md text-ink-soft">{product.blurb}</p>
          <p className="mt-4 flex items-start gap-2 text-sm text-ink-soft">
            <Truck className="mt-0.5 size-4 shrink-0 text-pine" />
            {product.landed
              ? "Already at the Dhaka desk. Leaves in 1–3 days, tracked."
              : "Requested from the house. Allow 7–12 days, tracked the whole way."}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Qty value={qty} onChange={(n) => setQty(Math.max(1, Math.min(8, n)))} />
            <button
              type="button"
              className="inline-flex h-12 flex-1 items-center justify-center bg-pine px-6 text-sm text-ivory hover:bg-pine-deep sm:flex-none"
              onClick={() => {
                add(product, qty);
                toast(product.name, { description: `${qty} placed in your bag.` });
              }}
            >
              Add to bag
            </button>
            <button
              type="button"
              disabled={wishBusy}
              aria-pressed={saved}
              onClick={toggleSaved}
              className="inline-flex h-12 items-center gap-2 border border-ink px-4 text-sm hover:bg-ink hover:text-ivory disabled:opacity-60"
            >
              <Heart className={`size-4 ${saved ? "fill-current" : ""}`} />
              {saved ? "Saved" : "Save"}
            </button>
          </div>
          <p className="mt-4 flex items-center gap-2 text-xs text-mute">
            <BadgeCheck className="size-4 text-pine" />
            Nothing is charged until the desk calls to confirm.
          </p>
          <p className="mt-8 text-ink-soft">{product.story}</p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {product.notes.map((note) => (
              <li key={note} className="border border-line bg-ivory px-3 py-1 text-xs tracking-wide text-ink-soft">
                {note}
              </li>
            ))}
          </ul>
          <div className="mt-8 divide-y divide-line border-y border-line text-sm">
            <details className="group py-4">
              <summary className="cursor-pointer">Shipping</summary>
              <p className="mt-3 text-ink-soft">
                Complimentary over ৳3,500. Otherwise ৳120. Cash on delivery is offered when every piece in the bag is already in Dhaka.
              </p>
            </details>
            <details className="group py-4">
              <summary className="cursor-pointer">Authenticity</summary>
              <p className="mt-3 text-ink-soft">
                Bought from the house, not from a reseller’s photograph. If a seal is broken or a batch looks wrong, we do not send it.
              </p>
            </details>
            <details className="group py-4">
              <summary className="cursor-pointer">Returns</summary>
              <p className="mt-3 text-ink-soft">
                Unopened pieces, within 7 days of delivery. Write your order number on the track page and the desk arranges pickup.
              </p>
            </details>
          </div>
        </div>
      </div>
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="font-serif text-3xl">Alongside it</h2>
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
          {related.map((item) => (
            <ProductCard key={item.slug} product={item} />
          ))}
        </div>
      </section>
    </div>
  );
}

function Missing() {
  return (
    <div className="mx-auto max-w-lg px-6 py-24">
      <h1 className="font-serif text-5xl">That piece is not in the edit.</h1>
      <Link to="/shop" search={{}} className="mt-6 inline-flex h-12 items-center bg-pine px-6 text-sm text-ivory">
        Browse the edit
      </Link>
    </div>
  );
}
