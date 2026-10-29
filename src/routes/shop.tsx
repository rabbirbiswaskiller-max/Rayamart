import { createFileRoute, Link } from "@tanstack/react-router";
import {
  categories,
  categoryBy,
  filterProducts,
  houseBy,
  houses,
  type ShopQuery,
} from "@/lib/catalog";
import { ProductCard } from "@/components/product-card";

export const Route = createFileRoute("/shop")({
  validateSearch: (search: Record<string, unknown>): ShopQuery => {
    const out: ShopQuery = {};
    if (typeof search.q === "string" && search.q.trim()) out.q = search.q.trim();
    if (typeof search.cat === "string" && categories.some((c) => c.slug === search.cat)) {
      out.cat = search.cat;
    }
    if (typeof search.house === "string" && houses.some((h) => h.slug === search.house)) {
      out.house = search.house;
    }
    if (
      search.sort === "price-asc" ||
      search.sort === "price-desc" ||
      search.sort === "rating"
    ) {
      out.sort = search.sort;
    }
    if (search.ready === "1") out.ready = "1";
    return out;
  },
  component: ShopPage,
});

function ShopPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const list = filterProducts(search);
  const cat = search.cat ? categoryBy(search.cat) : undefined;
  const house = search.house ? houseBy(search.house) : undefined;

  const title = search.q
    ? `Results for “${search.q}”`
    : house
      ? house.name
      : cat
        ? cat.name
        : search.ready
          ? "Ready in Dhaka"
          : "The edit";

  const line = house
    ? `${house.origin} — ${house.line}`
    : cat
      ? cat.line
      : "A short list. Prices in taka. Delivery to every district.";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <p className="text-xs tracking-widest text-mute uppercase">Raya Mart</p>
      <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-5xl leading-none">{title}</h1>
          <p className="mt-3 max-w-xl text-ink-soft">{line}</p>
        </div>
        <label className="text-xs tracking-widest text-mute uppercase">
          Sort
          <select
            className="mt-2 block h-11 w-full border border-line bg-ivory px-3 text-sm tracking-normal text-ink normal-case sm:w-52"
            value={search.sort ?? "featured"}
            onChange={(e) => {
              const value = e.target.value;
              const next: ShopQuery = { ...search };
              if (value === "featured") delete next.sort;
              else if (
                value === "price-asc" ||
                value === "price-desc" ||
                value === "rating"
              ) {
                next.sort = value;
              }
              navigate({ to: "/shop", search: next });
            }}
          >
            <option value="featured">Desk order</option>
            <option value="price-asc">Price, low</option>
            <option value="price-desc">Price, high</option>
            <option value="rating">Highest noted</option>
          </select>
        </label>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Filter
          active={!search.house && !search.cat && !search.ready && !search.q}
          search={{}}
          label="Everything"
        />
        <Filter active={search.ready === "1"} search={{ ...search, ready: search.ready === "1" ? undefined : "1" }} label="Ready in Dhaka" />
        {houses.map((item) => (
          <Filter
            key={item.slug}
            active={search.house === item.slug}
            search={{
              ...search,
              house: search.house === item.slug ? undefined : item.slug,
            }}
            label={item.name}
          />
        ))}
      </div>

      <p className="mt-6 text-sm text-mute">
        {list.length} {list.length === 1 ? "piece" : "pieces"}
      </p>

      {list.length === 0 ? (
        <div className="mt-10 border border-line bg-ivory px-6 py-16 text-center">
          <h2 className="font-serif text-3xl">New products are coming soon.</h2>
          <p className="mt-2 text-ink-soft">We are preparing a new collection. Please check back soon.</p>
          <Link to="/shop" search={{}} className="mt-6 inline-flex h-12 items-center bg-pine px-6 text-sm text-ivory">
            Browse categories
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
          {list.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

function Filter({
  label,
  search,
  active,
}: {
  label: string;
  search: ShopQuery;
  active: boolean;
}) {
  const navigate = Route.useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate({ to: "/shop", search: clean(search) })}
      className={
        active
          ? "h-9 border border-ink bg-ink px-3 text-xs tracking-wide text-ivory uppercase"
          : "h-9 border border-line bg-ivory px-3 text-xs tracking-wide text-ink-soft uppercase hover:border-ink"
      }
    >
      {label}
    </button>
  );
}

function clean(search: ShopQuery): ShopQuery {
  const next: ShopQuery = {};
  if (search.q) next.q = search.q;
  if (search.cat) next.cat = search.cat;
  if (search.house) next.house = search.house;
  if (search.sort) next.sort = search.sort;
  if (search.ready) next.ready = search.ready;
  return next;
}
