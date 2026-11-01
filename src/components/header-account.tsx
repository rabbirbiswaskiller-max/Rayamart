import { useEffect, useRef, useState } from "react";
import { Link, useLoaderData, useRouter } from "@tanstack/react-router";
import { Heart, LogOut, MapPin, Package, UserRound } from "lucide-react";
import { toast } from "sonner";
import { getBearerToken, signOut } from "@/lib/auth/client";

/**
 * Header account control. Signed out: a "Sign in" link. Signed in: an initials
 * avatar that opens a small menu. The identity comes from the root loader
 * (`getHeaderUser`), so it is correct on first paint and after a refresh.
 */
export function HeaderAccount() {
  const user = useLoaderData({ from: "__root__" });
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // The session may exist only as a stored bearer token (the cookie did not reach
  // the server on this load). Re-run the root loader in the browser so it carries the token.
  useEffect(() => {
    if (!user.signedIn && getBearerToken()) router.invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close on outside click and Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user.signedIn) {
    return (
      <Link
        to="/account"
        className="inline-flex h-10 items-center border border-line px-3 text-xs tracking-wide hover:border-ink"
      >
        Sign in
      </Link>
    );
  }

  const item = "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink hover:bg-pine/5";
  const icon = "size-4 text-pine";

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="আমার অ্যাকাউন্ট"
        onClick={() => setOpen((v) => !v)}
        className="flex size-10 items-center justify-center rounded-full bg-pine font-serif text-sm tracking-wide text-ivory shadow-sm ring-2 ring-paper transition hover:brightness-110"
      >
        {user.initials}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-line bg-paper p-2 shadow-[0_18px_40px_-12px_rgba(28,61,52,0.25)]"
        >
          <div className="border-b border-line px-3 pt-2 pb-3">
            <p className="font-serif text-lg leading-tight">{user.name || "স্বাগতম"}</p>
            <p className="text-xs text-mute">আপনার অ্যাকাউন্ট</p>
          </div>
          <div className="mt-2 flex flex-col">
            <Link to="/account" className={item} role="menuitem" onClick={() => setOpen(false)}>
              <UserRound className={icon} /> আমার অ্যাকাউন্ট
            </Link>
            <Link to="/account" hash="orders" className={item} role="menuitem" onClick={() => setOpen(false)}>
              <Package className={icon} /> আমার অর্ডার
            </Link>
            <Link to="/account" hash="addresses" className={item} role="menuitem" onClick={() => setOpen(false)}>
              <MapPin className={icon} /> ডেলিভারি ঠিকানা
            </Link>
            <Link to="/account" hash="wishlist" className={item} role="menuitem" onClick={() => setOpen(false)}>
              <Heart className={icon} /> পছন্দের প্রোডাক্ট
            </Link>
            <button
              type="button"
              role="menuitem"
              disabled={busy}
              className={`${item} mt-1 w-full border-t border-line rounded-none pt-3 disabled:opacity-50`}
              onClick={async () => {
                setBusy(true);
                try {
                  await signOut("/");
                } catch (err) {
                  setBusy(false);
                  toast.error(err instanceof Error ? err.message : "লগআউট করা যায়নি। আবার চেষ্টা করো।");
                }
              }}
            >
              <LogOut className={icon} /> লগআউট
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}