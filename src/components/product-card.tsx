import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { categoryBy, discount, houseBy, type Product } from "@/lib/catalog";
import { useCart } from "@/lib/store";
import { Price, Stars } from "@/components/commerce";

export function ProductCard({ product }: { product: Product }) {
  const add = useCart((s) => s.add);
  const navigate = useNavigate();
  const house = houseBy(product.house);
  const cut = discount(product.price, product.compareAt);

  return (
    <article className="group flex flex-col">
      <Link
        to="/product/$slug"
        params={{ slug: product.slug }}
        className="relative block overflow-hidden bg-paper-2"
      >
        <img
          src={product.image}
          alt={product.alt}
          className="aspect-square w-full object-cover motion-safe:transition motion-safe:duration-500 motion-safe:group-hover:scale-[1.03]"
        />
        {cut > 0 ? (
          <span className="absolute left-3 top-3 bg-ivory/95 px-2 py-1 text-xs tracking-widest text-ink uppercase">
            −{cut}%
          </span>
        ) : null}
      </Link>
      <div className="flex flex-1 flex-col pt-3">
        <p className="text-xs tracking-widest text-mute uppercase">
          {house?.name}
          <span className="text-line"> · </span>
          {categoryBy(product.category)?.name}
        </p>
        <Link
          to="/product/$slug"
          params={{ slug: product.slug }}
          className="mt-1 font-serif text-2xl leading-tight text-ink"
        >
          {product.name}
        </Link>
        <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{product.blurb}</p>
        <div className="mt-2">
          <Stars value={product.rating} count={product.reviews} />
        </div>
        <p className="mt-1 text-xs text-mute">
          {product.landed ? "Ready in Dhaka · 1–3 days" : "From the house · 7–12 days"}
        </p>
        <div className="mt-3 flex items-end justify-between gap-3">
          <Price price={product.price} compareAt={product.compareAt} />
          <button
            type="button"
            className="h-11 shrink-0 border border-ink px-4 text-xs tracking-widest text-ink uppercase motion-safe:transition hover:bg-ink hover:text-ivory"
            onClick={() => {
              add(product, 1);
              toast(product.name, {
                description: "Placed in your bag.",
                action: {
                  label: "View bag",
                  onClick: () => navigate({ to: "/bag" }),
                },
              });
            }}
          >
            Add
          </button>
        </div>
      </div>
    </article>
  );
}
