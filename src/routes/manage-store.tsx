import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  BadgeCheck,
  Boxes,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Package,
  Plus,
  Pencil,
  Trash2,
  X,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Store,
  Tags,
  Wallet,
} from "lucide-react";
import { getAdminAccess } from "@/lib/admin/access";
import { deleteStoreProduct, listStoreProducts, saveStoreProduct, uploadStoreImage } from "@/lib/admin/products";
import {
  categories,
  houses,
  taka,
  type Product,
} from "@/lib/catalog";
import { listAdminOrders, type StoredOrder } from "@/lib/orders";
import { signOut } from "@/lib/auth/client";

export const Route = createFileRoute("/manage-store")({
  head: () => ({ meta: [{ title: "Store Admin — Raya Mart" }] }),
  component: ManageStore,
});

type Access = {
  signedIn: boolean;
  allowed: boolean;
  emailConfigured: boolean;
};

type Section = "overview" | "products" | "orders" | "store";

const navItems: { id: Section; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "products", label: "Products", icon: Package },
  { id: "orders", label: "Orders", icon: ClipboardList },
  { id: "store", label: "Store details", icon: Store },
];

function ManageStore() {
  const [access, setAccess] = useState<Access | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [section, setSection] = useState<Section>("overview");
  const [search, setSearch] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [managedProducts, setManagedProducts] = useState<Product[]>([]);
  const [managedOrders, setManagedOrders] = useState<StoredOrder[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  async function checkAccess() {
    try {
      const result = await getAdminAccess();
      setAccess(result);
      if (result.allowed) {
        const [currentProducts, currentOrders] = await Promise.all([listStoreProducts(), listAdminOrders()]);
        setManagedProducts(currentProducts);
        setManagedOrders(currentOrders);
      }
    } catch {
      setError("লগইন যাচাই করা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করো।");
    }
  }

  useEffect(() => {
    void checkAccess();
  }, []);

  async function adminLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { authClient } = await import("@/lib/auth/client");
      const result = await authClient.signIn.email({
        email: adminEmail.trim().toLowerCase(),
        password: adminPassword,
      });
      if (result.error) {
        throw new Error(result.error.message || "ইমেইল বা পাসওয়ার্ড সঠিক নয়।");
      }
      setAdminPassword("");
      await checkAccess();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Admin Login করা যায়নি। ইমেইল ও পাসওয়ার্ড পরীক্ষা করো।",
      );
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    try {
      await signOut("/manage-store");
      setAccess(null);
      setError("");
      await checkAccess();
    } catch {
      setError("লগআউট সম্পন্ন হয়নি। আবার চেষ্টা করো।");
    } finally {
      setBusy(false);
    }
  }

  async function refreshDashboard() {
    setRefreshing(true);
    setError("");
    await checkAccess();
    setRefreshing(false);
  }

  async function handleImageFile(file?: File) {
    if (!file) return;
    setError("");
    setUploadingImage(true);
    try {
      const prepared = await compressProductImage(file);
      const result = await uploadStoreImage({ data: prepared });
      setEditingProduct((current) => current ? { ...current, image: result.url } : current);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ছবি আপলোড করা যায়নি। আবার চেষ্টা করো।");
    } finally {
      setUploadingImage(false);
    }
  }

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return managedProducts;
    return managedProducts.filter((p) =>
      [p.name, p.slug, p.origin, p.category, p.house, p.blurb]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [search, managedProducts]);

  const filteredOrders = useMemo(() => {
    const term = orderSearch.trim().toLowerCase();
    if (!term) return managedOrders;
    return managedOrders.filter((o) =>
      [o.id, o.customer.name, o.customer.phone, o.customer.city]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [managedOrders, orderSearch]);

  const grossSales = managedOrders.reduce((sum, order) => sum + order.total, 0);
  const averageOrder = managedOrders.length ? Math.round(grossSales / managedOrders.length) : 0;
  const readyProducts = managedProducts.filter((p) => p.landed).length;

  if (!access || !access.allowed) {
    return (
      <main className="min-h-[80vh] bg-[#f4f1e9] px-4 py-10 text-[#182f28] sm:px-6 sm:py-16">
        <div className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl border border-[#ddd8cc] bg-[#fbfaf6] shadow-[0_24px_70px_rgba(28,61,52,.09)] md:grid-cols-[.95fr_1.05fr]">
          <div className="relative flex min-h-64 flex-col justify-between overflow-hidden bg-[#1c3d34] p-7 text-[#faf8f4] sm:p-10">
            <div className="absolute -right-16 -top-16 size-56 rounded-full border border-white/10" />
            <div className="absolute -right-5 -top-5 size-36 rounded-full border border-white/10" />
            <Link to="/" className="relative inline-flex w-fit items-center gap-3 text-sm font-semibold tracking-[.22em] text-[#faf8f4] no-underline">
              <span className="grid size-10 place-items-center rounded-xl border border-white/25 font-serif text-xl">R</span>
              RAYA MART
            </Link>
            <div className="relative mt-12">
              <p className="text-xs uppercase tracking-[.24em] text-[#c7d8ce]">Private store desk</p>
              <h1 className="mt-4 max-w-sm font-serif text-4xl leading-tight sm:text-5xl">Your store, in good hands.</h1>
              <p className="mt-4 max-w-sm text-sm leading-7 text-white/75">
                Sign in to review the catalogue, store setup and available order information.
              </p>
            </div>
            <div className="relative mt-12 flex items-center gap-2 text-xs text-white/70">
              <ShieldCheck className="size-4" /> Protected administrator access
            </div>
          </div>

          <div className="p-6 sm:p-10 lg:p-12">
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#7c5e3a]">Administrator</p>
            <h2 className="mt-3 font-serif text-3xl sm:text-4xl">Welcome back.</h2>
            <p className="mt-3 text-sm leading-6 text-[#625e54]">তোমার অ্যাডমিন লগইন তথ্য দিয়ে প্রবেশ করো।</p>

            {access?.emailConfigured === false && (
              <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                Admin email সার্ভারে সেট করা নেই। নিরাপত্তার জন্য প্রবেশ বন্ধ রাখা হয়েছে।
              </div>
            )}

            {access?.signedIn && !access.allowed && (
              <div role="alert" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                এই অ্যাকাউন্টে Admin অনুমতি নেই। অনুমোদিত অ্যাকাউন্ট দিয়ে লগইন করো।
              </div>
            )}

            <form onSubmit={adminLogin} className="mt-7 grid gap-4">
              <label className="grid gap-2 text-sm font-medium text-[#373d35]">
                Admin Number
                <input
                  type="text"
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={adminEmail}
                  onChange={(event) => setAdminEmail(event.target.value)}
                  autoComplete="username"
                  placeholder="তোমার admin login ID"
                  required
                  className="h-12 w-full rounded-xl border border-[#d9d4c8] bg-white px-4 text-sm outline-none transition focus:border-[#1c3d34] focus:ring-2 focus:ring-[#1c3d34]/10"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-[#373d35]">
                Admin Password
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(event) => setAdminPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                  className="h-12 w-full rounded-xl border border-[#d9d4c8] bg-white px-4 text-sm outline-none transition focus:border-[#1c3d34] focus:ring-2 focus:ring-[#1c3d34]/10"
                />
              </label>
              <button
                type="submit"
                disabled={busy || access?.emailConfigured === false}
                className="mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#1c3d34] px-5 text-sm font-semibold text-white transition hover:bg-[#102820] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? <RefreshCw className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                {busy ? "যাচাই হচ্ছে…" : "Secure admin login"}
              </button>
            </form>

            {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800">{error}</p>}

            <div className="mt-7 flex items-start gap-3 rounded-xl bg-[#f0eee6] p-4 text-xs leading-5 text-[#625e54]">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#1c3d34]" />
              Admin access is checked on the server. Customer accounts cannot open the dashboard.
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <Link to="/" className="inline-flex items-center gap-2 text-sm text-[#625e54] underline underline-offset-4">
                Back to Raya Mart <ExternalLink className="size-3.5" />
              </Link>
              <Link to="/admin-setup" className="text-sm font-semibold text-[#1c3d34] underline underline-offset-4">
                First-time admin setup
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }


  return (
    <main className="min-h-screen bg-[#f4f1e9] text-[#182f28]">
      <div className="mx-auto max-w-[1440px] px-3 py-4 sm:px-6 sm:py-7 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#e0dbcf] bg-[#fbfaf6] px-4 py-4 shadow-sm sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl bg-[#1c3d34] font-serif text-2xl text-white">R</div>
            <div>
              <p className="text-sm font-bold tracking-[.18em]">RAYA MART</p>
              <p className="mt-0.5 text-xs text-[#777268]">Store administration</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden items-center gap-2 rounded-full border border-[#d9e5db] bg-[#edf4ed] px-3 py-2 text-xs font-medium text-[#235c42] sm:inline-flex">
              <span className="size-2 rounded-full bg-[#34845b]" /> Admin access verified
            </span>
            <button onClick={() => void refreshDashboard()} disabled={refreshing} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#ddd8cc] px-3 text-sm hover:bg-[#f0eee6] disabled:opacity-60" aria-label="Refresh dashboard">
              <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} /><span className="hidden sm:inline">Refresh</span>
            </button>
            <button onClick={() => void logout()} disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#ddd8cc] px-3 text-sm hover:bg-[#f0eee6] disabled:opacity-60">
              <LogOut className="size-4" /><span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </header>

        <div className="mt-5 grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="h-fit rounded-2xl border border-[#e0dbcf] bg-[#fbfaf6] p-3 lg:sticky lg:top-4">
            <p className="px-3 pb-2 pt-3 text-[10px] font-bold uppercase tracking-[.2em] text-[#8a8478]">Workspace</p>
            <nav className="grid grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = section === item.id;
                return (
                  <button key={item.id} onClick={() => setSection(item.id)} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${active ? "bg-[#1c3d34] font-semibold text-white shadow-sm" : "text-[#55574e] hover:bg-[#f0eee6]"}`}>
                    <Icon className="size-4 shrink-0" /> <span>{item.label}</span>
                    {active && <ChevronRight className="ml-auto hidden size-4 lg:block" />}
                  </button>
                );
              })}
            </nav>
            <div className="mt-4 hidden rounded-xl bg-[#f0eee6] p-4 lg:block">
              <div className="flex items-center gap-2 text-xs font-semibold"><ShieldCheck className="size-4 text-[#1c3d34]" /> Private workspace</div>
              <p className="mt-2 text-xs leading-5 text-[#716d63]">Admin-only view. Catalogue information is read from the current site configuration.</p>
            </div>
          </aside>

          <section className="min-w-0">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#7c5e3a]">Raya Mart / {section}</p>
                <h1 className="mt-2 font-serif text-3xl sm:text-4xl">
                  {section === "overview" ? "Good to see you." : section === "products" ? "Your catalogue." : section === "orders" ? "Order desk." : "Store details."}
                </h1>
                <p className="mt-2 text-sm leading-6 text-[#6c6a60]">
                  {section === "overview" ? "A clear view of your shop and the information currently available." : section === "products" ? "Add, edit or delete products saved in the product database." : section === "orders" ? "Review customer orders saved in the shared server database." : "A quick reference for your store configuration and readiness."}
                </p>
              </div>
              <Link to="/" className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#ddd8cc] bg-[#fbfaf6] px-3 text-sm hover:bg-white">View storefront <ExternalLink className="size-3.5" /></Link>
            </div>

            {section === "overview" && (
              <div className="grid gap-5">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Metric icon={Package} label="Catalogue products" value={String(managedProducts.length)} note="Saved in product database" />
                  <Metric icon={Tags} label="Categories" value={String(categories.length)} note="Shop categories" />
                  <Metric icon={ClipboardList} label="Customer orders" value={String(managedOrders.length)} note="Saved in server database" />
                  <Metric icon={Wallet} label="Saved order value" value={taka(grossSales)} note="Based on saved orders" />
                </div>

                <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
                  <div className="rounded-2xl border border-[#e0dbcf] bg-[#fbfaf6] p-4 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="font-serif text-2xl">Catalogue at a glance</h2>
                        <p className="mt-1 text-xs text-[#777268]">Current configured product list</p>
                      </div>
                      <button onClick={() => setSection("products")} className="inline-flex items-center gap-1 text-sm font-semibold underline underline-offset-4">View all <ChevronRight className="size-4" /></button>
                    </div>
                    <div className="mt-5 divide-y divide-[#e9e4da]">
                      {managedProducts.slice(0, 5).map((product) => <ProductRow key={product.slug} product={product} />)}
                    </div>
                  </div>

                  <div className="grid gap-5">
                    <div className="rounded-2xl border border-[#e0dbcf] bg-[#fbfaf6] p-4 sm:p-6">
                      <div className="flex items-center gap-2"><Activity className="size-5 text-[#1c3d34]" /><h2 className="font-serif text-2xl">Store readiness</h2></div>
                      <div className="mt-5 space-y-4">
                        <StatusRow label="Admin email configured" detail="Server-side access rule" ok={access.emailConfigured} />
                        <StatusRow label="Admin session" detail="Signed in to this account" ok={access.allowed} />
                        <StatusRow label="Catalogue loaded" detail={`${managedProducts.length} products in database`} ok={managedProducts.length > 0} />
                        <StatusRow label="Order storage" detail="Shared server database" ok={true} />
                      </div>
                    </div>
                    <div className="rounded-2xl border border-[#dfd4bf] bg-[#f0e9dc] p-4 sm:p-6">
                      <div className="flex items-center gap-2"><CircleHelp className="size-5 text-[#7c5e3a]" /><h2 className="font-serif text-xl">Important note</h2></div>
                      <p className="mt-3 text-sm leading-6 text-[#655d50]">এখন কাস্টমারের অর্ডার server database-এ সেভ হবে। তাই অ্যাডমিন হিসেবে অন্য ফোন থেকে লগইন করলেও অর্ডারগুলো এখানে দেখা যাবে।</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <QuickCard icon={ShoppingBag} title="Orders" value={`${managedOrders.length} saved orders`} action="Review orders" onClick={() => setSection("orders")} />
                  <QuickCard icon={Boxes} title="Ready in Dhaka" value={`${readyProducts} products`} action="Browse catalogue" onClick={() => setSection("products")} />
                  <QuickCard icon={Store} title="Brand houses" value={String(houses.length)} action="Store details" onClick={() => setSection("store")} />
                </div>
              </div>
            )}

            {section === "products" && (
              <div className="rounded-2xl border border-[#e0dbcf] bg-[#fbfaf6] p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><h2 className="font-serif text-2xl">Product catalogue</h2><p className="mt-1 text-xs text-[#777268]">{filteredProducts.length} of {managedProducts.length} saved products</p></div>
                  <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                    <label className="relative block min-w-0 flex-1 sm:w-56">
                      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#858073]" />
                      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…" className="h-10 w-full rounded-xl border border-[#ddd8cc] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#1c3d34]" />
                    </label>
                    <button onClick={() => setEditingProduct(blankProduct())} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#1c3d34] px-4 text-sm font-semibold text-white"><Plus className="size-4" /> Add product</button>
                  </div>
                </div>

                {editingProduct && (
                  <form className="mt-5 grid gap-3 rounded-2xl border border-[#d9d4c8] bg-white p-4 sm:p-5" onSubmit={async (event) => {
                    event.preventDefault(); setSavingProduct(true); setError("");
                    try {
                      const result = await saveStoreProduct({ data: { product: editingProduct } });
                      setManagedProducts((current) => [...current.filter((p) => p.slug !== result.product.slug), result.product].sort((a,b) => a.featured-b.featured));
                      setEditingProduct(null);
                    } catch (err) { setError(err instanceof Error ? err.message : "Product save failed."); }
                    finally { setSavingProduct(false); }
                  }}>
                    <div className="flex items-center justify-between gap-3"><h3 className="font-serif text-xl">{managedProducts.some(p => p.slug === editingProduct.slug) ? "Edit product" : "Add a new product"}</h3><button type="button" onClick={() => setEditingProduct(null)} aria-label="Close product form"><X className="size-5" /></button></div>
                    <p className="text-xs leading-5 text-[#777268]">ফোনের Gallery থেকে ছবি বেছে নাও। ছবিটি স্বয়ংক্রিয়ভাবে আপলোড হবে এবং প্রোডাক্টের সঙ্গে সেভ হবে।</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <AdminField label="Product name" value={editingProduct.name} onChange={v => setEditingProduct({...editingProduct,name:v,slug: (!editingProduct.slug || editingProduct.slug === slugify(editingProduct.name)) ? slugify(v) : editingProduct.slug})} required />
                      <AdminField label="Slug (unique URL)" value={editingProduct.slug} onChange={v => setEditingProduct({...editingProduct,slug:slugify(v)})} required />
                      <AdminField label="Price (৳)" type="number" value={String(editingProduct.price || "")} onChange={v => setEditingProduct({...editingProduct,price:Number(v)})} required />
                      <AdminField label="Compare-at price (optional)" type="number" value={String(editingProduct.compareAt || "")} onChange={v => setEditingProduct({...editingProduct,compareAt:v ? Number(v) : undefined})} />
                      <label className="grid gap-1.5 text-xs font-medium text-[#55574e]">Product category<select value={editingProduct.category} onChange={e => setEditingProduct({...editingProduct,category:e.target.value})} required className="h-10 min-w-0 rounded-lg border border-[#ddd8cc] bg-[#fbfaf6] px-3 text-sm text-[#182f28] outline-none focus:border-[#1c3d34]">{categories.map(category => <option key={category.slug} value={category.slug}>{category.name}</option>)}</select><span className="text-[11px] font-normal leading-5 text-[#777268]">এই প্রোডাক্টটি কোন ক্যাটাগরিতে দেখাবে, এখান থেকে বেছে নাও।</span></label>
                      <AdminField label="Brand house slug (e.g. lumiere)" value={editingProduct.house} onChange={v => setEditingProduct({...editingProduct,house:slugify(v)})} required />
                      <AdminField label="Origin" value={editingProduct.origin} onChange={v => setEditingProduct({...editingProduct,origin:v})} required />
                      <AdminField label="Size / quantity" value={editingProduct.size} onChange={v => setEditingProduct({...editingProduct,size:v})} required />
                      <div className="grid gap-2 rounded-xl border border-dashed border-[#cfc8b9] bg-[#fbfaf6] p-3"><label className="grid gap-2 text-xs font-medium text-[#55574e]">Product photo — ফোনের Gallery থেকে বেছে নাও<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e => void handleImageFile(e.target.files?.[0])} disabled={uploadingImage} className="block w-full min-w-0 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[#1c3d34] file:px-3 file:py-2 file:font-semibold file:text-white disabled:opacity-60" /></label><p className="text-xs leading-5 text-[#777268]">{uploadingImage ? "ছবি ছোট করা ও আপলোড হচ্ছে…" : editingProduct.image ? "ছবি আপলোড হয়েছে। চাইলে নতুন ছবি বেছে বদলাতে পারো।" : "JPG, PNG, WEBP বা GIF। বড় ছবি স্বয়ংক্রিয়ভাবে ছোট করা হবে।"}</p>{editingProduct.image && <img src={editingProduct.image} alt={editingProduct.alt || editingProduct.name || "Product preview"} className="max-h-48 w-full rounded-lg bg-white object-contain" />}<input type="hidden" value={editingProduct.image} required readOnly aria-label="Uploaded image URL" /></div>
                      <AdminField label="Image alt text" value={editingProduct.alt} onChange={v => setEditingProduct({...editingProduct,alt:v})} required />
                      <AdminField label="Rating (0–5)" type="number" value={String(editingProduct.rating)} onChange={v => setEditingProduct({...editingProduct,rating:Number(v)})} />
                      <AdminField label="Review count" type="number" value={String(editingProduct.reviews)} onChange={v => setEditingProduct({...editingProduct,reviews:Number(v)})} />
                      <AdminField label="Display order" type="number" value={String(editingProduct.featured)} onChange={v => setEditingProduct({...editingProduct,featured:Number(v)})} />
                      <AdminField label="Notes (comma-separated)" value={editingProduct.notes.join(", ")} onChange={v => setEditingProduct({...editingProduct,notes:v.split(",").map(n=>n.trim()).filter(Boolean)})} />
                      <div className="sm:col-span-2"><AdminField label="Short description" value={editingProduct.blurb} onChange={v => setEditingProduct({...editingProduct,blurb:v})} required /></div>
                      <div className="sm:col-span-2"><AdminField label="Full description" value={editingProduct.story} onChange={v => setEditingProduct({...editingProduct,story:v})} required /></div>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <label className="flex items-center gap-2"><input type="checkbox" checked={editingProduct.landed} onChange={e=>setEditingProduct({...editingProduct,landed:e.target.checked})} /> Ready in Dhaka</label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(editingProduct.flash)} onChange={e=>setEditingProduct({...editingProduct,flash:e.target.checked})} /> Feature as flash deal</label>
                    </div>
                    <div className="flex flex-wrap gap-2"><button disabled={savingProduct || uploadingImage || !editingProduct.image} className="h-11 rounded-xl bg-[#1c3d34] px-5 text-sm font-semibold text-white disabled:opacity-60">{uploadingImage ? "Uploading photo…" : savingProduct ? "Saving…" : "Save product"}</button><button type="button" onClick={() => setEditingProduct(null)} className="h-11 rounded-xl border border-[#ddd8cc] px-4 text-sm">Cancel</button></div>
                  </form>
                )}

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredProducts.map(product => (
                    <div key={product.slug} className="overflow-hidden rounded-xl border border-[#e8e2d7] bg-white">
                      <img src={product.image} alt={product.alt} className="aspect-[4/3] w-full object-cover" />
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3"><div><h3 className="font-serif text-xl">{product.name}</h3><p className="mt-1 text-xs text-[#777268]">{product.category} · {product.slug}</p></div><strong className="shrink-0 text-sm">{taka(product.price)}</strong></div>
                        <p className="mt-2 line-clamp-2 text-sm text-[#6c6a60]">{product.blurb}</p>
                        <div className="mt-4 flex gap-2"><button onClick={() => setEditingProduct({...product})} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#ddd8cc] px-3 text-sm"><Pencil className="size-3.5" /> Edit</button><button onClick={async () => { if (!window.confirm(`“${product.name}” ডিলিট করবে?`)) return; setError(""); try { await deleteStoreProduct({data:{slug:product.slug}}); setManagedProducts(current=>current.filter(p=>p.slug!==product.slug)); } catch(err) { setError(err instanceof Error ? err.message : "Delete failed."); } }} className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 px-3 text-sm text-red-700"><Trash2 className="size-3.5" /> Delete</button></div>
                      </div>
                    </div>
                  ))}
                  {filteredProducts.length === 0 && <div className="rounded-xl border border-dashed border-[#d8d1c4] px-4 py-12 text-center sm:col-span-2 xl:col-span-3"><Package className="mx-auto size-8 text-[#8a8478]" /><h3 className="mt-3 font-serif text-xl">No products yet</h3><p className="mt-2 text-sm text-[#777268]">“Add product” চাপ দিয়ে প্রথম প্রোডাক্ট যোগ করো।</p></div>}
                </div>
              </div>
            )}

            {section === "orders" && (
              <div className="rounded-2xl border border-[#e0dbcf] bg-[#fbfaf6] p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><h2 className="font-serif text-2xl">Saved orders</h2><p className="mt-1 text-xs text-[#777268]">Orders submitted by customers and saved on the server</p></div>
                  <label className="relative block w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#858073]" />
                    <input value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} placeholder="Search order or customer…" className="h-10 w-full rounded-xl border border-[#ddd8cc] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#1c3d34]" />
                  </label>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <MiniMetric label="Orders saved on server" value={String(managedOrders.length)} />
                  <MiniMetric label="Order value" value={taka(grossSales)} />
                  <MiniMetric label="Average order" value={taka(averageOrder)} />
                </div>
                {filteredOrders.length === 0 ? (
                  <div className="mt-5 rounded-xl border border-dashed border-[#d8d1c4] px-4 py-12 text-center">
                    <ClipboardList className="mx-auto size-8 text-[#8a8478]" />
                    <h3 className="mt-3 font-serif text-xl">No customer orders yet</h3>
                    <p className="mt-2 text-sm leading-6 text-[#777268]">এখনো কোনো অনলাইন অর্ডার পাওয়া যায়নি, অথবা সার্চে মেলেনি।</p>
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
                    {filteredOrders.map((order) => <OrderCard key={order.id} order={order} />)}
                  </div>
                )}
              </div>
            )}

            {section === "store" && (
              <div className="grid gap-5 xl:grid-cols-2">
                <div className="rounded-2xl border border-[#e0dbcf] bg-[#fbfaf6] p-5 sm:p-6">
                  <h2 className="font-serif text-2xl">Store profile</h2>
                  <div className="mt-5 divide-y divide-[#e9e4da]">
                    <InfoRow label="Store name" value="Raya Mart" />
                    <InfoRow label="Live website" value="rayamart.vercel.app" link="https://rayamart.vercel.app" />
                    <InfoRow label="Admin route" value="/manage-store" />
                    <InfoRow label="Currency" value="Bangladeshi Taka (৳)" />
                    <InfoRow label="Product count" value={String(managedProducts.length)} />
                    <InfoRow label="Categories" value={String(categories.length)} />
                    <InfoRow label="Brand houses" value={String(houses.length)} />
                  </div>
                </div>
                <div className="rounded-2xl border border-[#e0dbcf] bg-[#fbfaf6] p-5 sm:p-6">
                  <h2 className="font-serif text-2xl">Delivery & pricing rules</h2>
                  <div className="mt-5 divide-y divide-[#e9e4da]">
                    <InfoRow label="Standard delivery fee" value={taka(120)} />
                    <InfoRow label="Free delivery threshold" value="৳3,500+" />
                    <InfoRow label="Online payment discount" value="3% on ৳3,000+" />
                    <InfoRow label="Payment methods" value="bKash, Nagad, Card, COD" />
                    <InfoRow label="Order persistence" value="Server database" />
                  </div>
                  <div className="mt-5 rounded-xl border border-[#dfd4bf] bg-[#f0e9dc] p-4 text-sm leading-6 text-[#655d50]">
                    <strong>Operational note:</strong> নতুন অর্ডারগুলো এই ড্যাশবোর্ডে দেখা যাবে। কাস্টমারকে ফোন করে পেমেন্ট ও ডেলিভারি নিশ্চিত করো।
                  </div>
                </div>
                <div className="rounded-2xl border border-[#e0dbcf] bg-[#fbfaf6] p-5 sm:p-6 xl:col-span-2">
                  <h2 className="font-serif text-2xl">Brand houses</h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {houses.map((house) => <div key={house.slug} className="rounded-xl border border-[#e8e2d7] bg-white p-4"><p className="font-serif text-xl">{house.name}</p><p className="mt-1 text-xs text-[#7c5e3a]">{house.origin}</p><p className="mt-2 text-sm leading-5 text-[#777268]">{house.line}</p></div>)}
                  </div>
                </div>
              </div>
            )}

            {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800">{error}</p>}
            <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-[#898477]">
              <span>Raya Mart · Store desk</span>
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-3.5" /> Admin session active</span>
            </footer>
          </section>
        </div>
      </div>
    </main>
  );
}

function Metric({ icon: Icon, label, value, note }: { icon: typeof Package; label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-[#e0dbcf] bg-[#fbfaf6] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3"><span className="text-xs text-[#777268]">{label}</span><span className="grid size-9 place-items-center rounded-xl bg-[#edf1e8] text-[#1c3d34]"><Icon className="size-4" /></span></div>
      <p className="mt-4 break-words font-serif text-3xl">{value}</p>
      <p className="mt-1 text-xs text-[#898477]">{note}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-[#f0eee6] p-3"><p className="text-xs text-[#777268]">{label}</p><p className="mt-1 font-serif text-xl">{value}</p></div>;
}

function StatusRow({ label, detail, ok }: { label: string; detail: string; ok: boolean }) {
  return <div className="flex items-start gap-3"><span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ${ok ? "bg-[#e2f0e5] text-[#2d754c]" : "bg-[#f7e9d9] text-[#98632c]"}`}>{ok ? <BadgeCheck className="size-4" /> : <CircleHelp className="size-4" />}</span><div className="min-w-0 flex-1"><p className="text-sm font-medium">{label}</p><p className="mt-0.5 text-xs leading-5 text-[#898477]">{detail}</p></div><span className={`text-[10px] font-bold uppercase tracking-wider ${ok ? "text-[#2d754c]" : "text-[#98632c]"}`}>{ok ? "Ready" : "Note"}</span></div>;
}

function QuickCard({ icon: Icon, title, value, action, onClick }: { icon: typeof Package; title: string; value: string; action: string; onClick: () => void }) {
  return <button onClick={onClick} className="rounded-2xl border border-[#e0dbcf] bg-[#fbfaf6] p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md sm:p-5"><div className="flex items-center gap-2 text-xs text-[#777268]"><Icon className="size-4 text-[#1c3d34]" />{title}</div><p className="mt-3 font-serif text-2xl">{value}</p><span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold underline underline-offset-4">{action} <ChevronRight className="size-3.5" /></span></button>;
}

function ProductRow({ product }: { product: Product }) {
  const category = categories.find((c) => c.slug === product.category)?.name ?? product.category;
  const house = houses.find((h) => h.slug === product.house)?.name ?? product.house;
  return <div className="flex items-center gap-3 py-3"><img src={product.image} alt="" className="size-14 shrink-0 rounded-xl bg-[#f0eee6] object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{product.name}</p><p className="mt-1 truncate text-xs text-[#898477]">{house} · {category}</p></div><div className="text-right"><p className="text-sm font-semibold">{taka(product.price)}</p><p className={`mt-1 text-[10px] ${product.landed ? "text-[#2d754c]" : "text-[#98632c]"}`}>{product.landed ? "Ready in Dhaka" : "Order from house"}</p></div></div>;
}

function ProductCard({ product }: { product: Product }) {
  const category = categories.find((c) => c.slug === product.category)?.name ?? product.category;
  const house = houses.find((h) => h.slug === product.house)?.name ?? product.house;
  const saving = product.compareAt && product.compareAt > product.price ? product.compareAt - product.price : 0;
  return <article className="overflow-hidden rounded-xl border border-[#e8e2d7] bg-white">
    <div className="relative bg-[#f0eee6]"><img src={product.image} alt={product.alt} className="aspect-[4/3] w-full object-cover" /><span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-semibold ${product.landed ? "bg-[#e2f0e5] text-[#2d754c]" : "bg-[#f7e9d9] text-[#98632c]"}`}>{product.landed ? "Ready in Dhaka" : "From house"}</span></div>
    <div className="p-4"><p className="text-[10px] uppercase tracking-[.16em] text-[#7c5e3a]">{house}</p><h3 className="mt-1 font-serif text-xl leading-tight">{product.name}</h3><p className="mt-1 text-xs text-[#898477]">{category} · {product.origin} · {product.size}</p><div className="mt-3 flex items-baseline gap-2"><span className="text-sm font-bold">{taka(product.price)}</span>{saving > 0 && <span className="text-xs text-[#898477] line-through">{taka(product.compareAt!)}</span>}</div><p className="mt-2 text-xs leading-5 text-[#777268]">{product.blurb}</p><div className="mt-3 flex flex-wrap gap-1.5">{product.notes.slice(0, 3).map((note) => <span key={note} className="rounded-full bg-[#f0eee6] px-2 py-1 text-[10px] text-[#625e54]">{note}</span>)}</div></div>
  </article>;
}

function OrderCard({ order }: { order: StoredOrder }) {
  const created = new Date(order.createdAt);
  const date = Number.isNaN(created.getTime()) ? order.createdAt : created.toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" });
  return <article className="rounded-xl border border-[#e8e2d7] bg-white p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold tracking-wide">{order.id}</p><p className="mt-1 text-xs text-[#898477]">{date}</p></div><p className="font-serif text-xl">{taka(order.total)}</p></div>
    <div className="mt-4 grid gap-3 border-t border-[#eee9df] pt-4 sm:grid-cols-2">
      <div><p className="text-[10px] uppercase tracking-wider text-[#898477]">Customer</p><p className="mt-1 text-sm font-semibold">{order.customer.name}</p><p className="mt-1 text-sm text-[#625e54]">{order.customer.phone}</p><p className="text-xs text-[#898477]">{order.customer.city}</p><p className="mt-1 text-xs leading-5 text-[#777268]">{order.customer.address}</p></div>
      <div><p className="text-[10px] uppercase tracking-wider text-[#898477]">Items</p><div className="mt-1 space-y-1">{order.lines.map((line) => <p key={line.slug} className="text-sm">{line.name} <span className="text-xs text-[#898477]">× {line.qty}</span></p>)}</div><p className="mt-2 text-xs text-[#625e54]">Payment: {order.customer.pay.toUpperCase()}</p>{order.customer.note && <p className="mt-2 text-xs leading-5 text-[#777268]">Note: {order.customer.note}</p>}</div>
    </div>
  </article>;
}

function InfoRow({ label, value, link }: { label: string; value: string; link?: string }) {
  return <div className="flex flex-wrap items-start justify-between gap-2 py-3"><span className="text-sm text-[#777268]">{label}</span>{link ? <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-right text-sm font-semibold underline underline-offset-4">{value} <ExternalLink className="size-3" /></a> : <span className="text-right text-sm font-semibold">{value}</span>}</div>;
}

function compressProductImage(file: File): Promise<{ fileName: string; contentType: string; base64: string }> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) { reject(new Error("একটি ছবি বেছে নাও।")); return; }
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxSide = 1400;
      const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) { reject(new Error("ছবি প্রস্তুত করা যায়নি।")); return; }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error("ছবি ছোট করা যায়নি।")); return; }
        if (blob.size > 2_000_000) { reject(new Error("ছবিটি এখনও ২ MB-এর বেশি। ছোট ছবি বেছে নাও।")); return; }
        const reader = new FileReader();
        reader.onload = () => {
          const value = String(reader.result ?? "");
          const base64 = value.split(",")[1];
          if (!base64) { reject(new Error("ছবির ডেটা পড়া যায়নি।")); return; }
          const extension = blob.type === "image/png" ? "png" : blob.type === "image/jpeg" ? "jpg" : "webp";
          resolve({ fileName: `raya-product-${Date.now()}.${extension}`, contentType: blob.type || "image/webp", base64 });
        };
        reader.onerror = () => reject(new Error("ছবির ডেটা পড়া যায়নি।"));
        reader.readAsDataURL(blob);
      }, "image/webp", 0.82);
    };
    image.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("ছবিটি খোলা যায়নি। অন্য ছবি বেছে নাও।")); };
    image.src = objectUrl;
  });
}

function blankProduct(): Product { return { slug: "", name: "", house: "lumiere", category: "skincare", origin: "Bangladesh", price: 0, rating: 0, reviews: 0, image: "", alt: "", landed: false, featured: 0, size: "1 piece", blurb: "", story: "", notes: [] }; }
function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function AdminField({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) { return <label className="grid gap-1.5 text-xs font-medium text-[#55574e]">{label}<input type={type} value={value} onChange={e => onChange(e.target.value)} required={required} className="h-10 min-w-0 rounded-lg border border-[#ddd8cc] bg-[#fbfaf6] px-3 text-sm text-[#182f28] outline-none focus:border-[#1c3d34]" /></label>; }
