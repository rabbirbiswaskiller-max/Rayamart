import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Menu, Search, ShoppingBag, X } from "lucide-react";
import { Toaster } from "sonner";
import { categories, houses } from "@/lib/catalog";
import { useCartCount } from "@/lib/store";
import type { ShopQuery } from "@/lib/catalog";

const emptySearch: ShopQuery = {};

export function Shell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const quiet = path.startsWith("/checkout") || path.startsWith("/order");
  const [open, setOpen] = useState(false);
  const count = useCartCount();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen">
      {!quiet ? (
        <div className="bg-pine px-4 py-2 text-center text-xs tracking-wide text-ivory">
          Sealed at origin · Confirmed by phone before you pay · Complimentary delivery over ৳3,500
        </div>
      ) : null}
      <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <Link to="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
            <Mark />
            <span className="font-serif text-3xl leading-none tracking-tight">Raya</span>
            <span className="hidden text-xs tracking-widest text-mute uppercase sm:inline">
              Mart
            </span>
          </Link>
          <nav className="ml-6 hidden items-center gap-6 text-sm lg:flex">
            <Link to="/shop" search={emptySearch} className="hover:text-pine">
              The edit
            </Link>
            <Link to="/house" className="hover:text-pine">
              The house
            </Link>
            <Link to="/track" className="hover:text-pine">
              Track
            </Link>
            <Link to="/partner" className="hover:text-pine">
              Partner
            </Link>
          </nav>
          <div className="ml-auto hidden min-w-0 flex-1 justify-end md:flex">
            <SearchForm className="w-full max-w-xs" />
          </div>
          <Link
            to="/manage-store"
            className="hidden h-10 items-center border border-line px-3 text-xs tracking-wide hover:border-ink sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            to="/bag"
            className="ml-auto inline-flex h-11 items-center gap-2 px-2 md:ml-3"
            aria-label="Open bag"
          >
            <ShoppingBag className="size-5" />
            <span className="text-sm tabular-nums">{mounted ? count : 0}</span>
          </Link>
        </div>
        {!quiet ? (
          <div className="border-t border-line md:hidden">
            <div className="px-4 py-2">
              <SearchForm />
            </div>
          </div>
        ) : null}
        {!quiet ? (
          <div className="no-scrollbar flex gap-2 overflow-x-auto border-t border-line px-4 py-2 sm:px-6">
            <Chip to="/shop" search={emptySearch} label="All" />
            {categories.map((cat) => (
              <Chip
                key={cat.slug}
                to="/shop"
                search={{ cat: cat.slug }}
                label={cat.name}
              />
            ))}
            <Chip to="/shop" search={{ ready: "1" }} label="Ready in Dhaka" />
          </div>
        ) : null}
      </header>

      {open ? (
        <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-paper lg:hidden">
          <div className="sticky top-0 flex h-16 items-center justify-between bg-paper px-4">
            <span className="font-serif text-3xl">Raya</span>
            <button
              type="button"
              className="inline-flex size-11 items-center justify-center"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            >
              <X className="size-5" />
            </button>
          </div>
          <nav className="flex flex-col px-6 py-4 pb-16">
            <MobileLink to="/" onClick={() => setOpen(false)}>
              Home
            </MobileLink>
            <MobileLink to="/shop" search={emptySearch} onClick={() => setOpen(false)}>
              The edit
            </MobileLink>
            {categories.map((cat) => (
              <MobileLink
                key={cat.slug}
                to="/shop"
                search={{ cat: cat.slug }}
                onClick={() => setOpen(false)}
              >
                {cat.name}
              </MobileLink>
            ))}
            <MobileLink to="/house" onClick={() => setOpen(false)}>
              The house
            </MobileLink>
            <MobileLink to="/track" onClick={() => setOpen(false)}>
              Track an order
            </MobileLink>
            <MobileLink to="/partner" onClick={() => setOpen(false)}>
              Become a partner
            </MobileLink>
            <MobileLink to="/bag" onClick={() => setOpen(false)}>
              Bag
            </MobileLink>
            <MobileLink to="/manage-store" onClick={() => setOpen(false)}>
              Sign in
            </MobileLink>
          </nav>
        </div>
      ) : null}

      <main>{children}</main>
      {!quiet ? <Footer /> : <QuietFoot />}
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "var(--color-ink)",
            color: "var(--color-ivory)",
            border: "none",
            borderRadius: "2px",
          },
        }}
      />
    </div>
  );
}

function Mark() {
  return (
    <svg viewBox="0 0 24 24" className="size-6 text-pine" aria-hidden>
      <circle cx="12" cy="12" r="9.25" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M12 6.5 V12" stroke="currentColor" strokeWidth="1" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

function SearchForm({ className }: { className?: string }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const query = q.trim();
    navigate({
      to: "/shop",
      search: query ? { q: query } : {},
    });
  }

  return (
    <form onSubmit={onSubmit} className={className} role="search">
      <label className="relative block">
        <span className="sr-only">Search the edit</span>
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-mute" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search serum, matcha, Velora…"
          className="h-11 w-full border border-line bg-ivory pr-3 pl-10 text-sm text-ink outline-none placeholder:text-mute focus:border-pine"
        />
      </label>
    </form>
  );
}

function Chip({
  to,
  search,
  label,
}: {
  to: "/shop";
  search: ShopQuery;
  label: string;
}) {
  return (
    <Link
      to={to}
      search={search}
      className="inline-flex h-9 shrink-0 items-center border border-line bg-ivory px-3 text-xs tracking-wide text-ink-soft uppercase hover:border-ink hover:text-ink"
    >
      {label}
    </Link>
  );
}

function MobileLink({
  children,
  onClick,
  to,
  search,
}: {
  children: ReactNode;
  onClick: () => void;
  to: "/" | "/shop" | "/house" | "/track" | "/partner" | "/bag" | "/manage-store";
  search?: ShopQuery;
}) {
  if (to === "/shop") {
    return (
      <Link
        to="/shop"
        search={search ?? {}}
        onClick={onClick}
        className="border-b border-line py-3 font-serif text-3xl"
      >
        {children}
      </Link>
    );
  }
  return (
    <Link to={to} onClick={onClick} className="border-b border-line py-3 font-serif text-3xl">
      {children}
    </Link>
  );
}

function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-ivory">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="font-serif text-6xl leading-none sm:text-7xl">Raya</p>
          <p className="mt-3 max-w-sm text-sm text-ink-soft">
            A buying desk in Dhaka. We choose a short list from houses abroad and send it, sealed, to your door.
          </p>
        </div>
        <div>
          <p className="text-xs tracking-widest text-mute uppercase">Visit</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link to="/shop" search={{}}>
                The edit
              </Link>
            </li>
            <li>
              <Link to="/house">The house</Link>
            </li>
            <li>
              <Link to="/track">Track an order</Link>
            </li>
            <li>
              <Link to="/partner">Become a partner</Link>
            </li>
            <li>
              <Link to="/bag">Your bag</Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs tracking-widest text-mute uppercase">Houses</p>
          <ul className="mt-3 space-y-2 text-sm">
            {houses.map((house) => (
              <li key={house.slug}>
                <Link to="/shop" search={{ house: house.slug }}>
                  {house.name}
                  <span className="text-mute"> · {house.origin}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-mute sm:flex-row sm:justify-between sm:px-6">
          <p>Dhaka desk · Sat–Thu, 10–7</p>
          <p>bKash · Nagad · Card · Cash on delivery</p>
        </div>
      </div>
    </footer>
  );
}

function QuietFoot() {
  return (
    <footer className="border-t border-line px-4 py-6 text-center text-xs text-mute">
      Raya Mart · The desk confirms before anything is charged
    </footer>
  );
}
