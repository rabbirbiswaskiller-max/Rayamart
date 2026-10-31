import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { AdminNav } from "@/components/admin-nav";
import { listAdminProducts, updateProductMeta } from "@/lib/admin/products";
import { taka, type Product } from "@/lib/catalog";

export const Route = createFileRoute("/admin-pricing")({
  head: () => ({ meta: [{ title: "দাম ও লাভ — Raya Mart admin" }] }),
  loader: () => listAdminProducts(),
  component: AdminPricing,
});

function AdminPricing() {
  const products = Route.useLoaderData();
  const router = useRouter();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <p className="text-xs tracking-widest text-mute uppercase">Admin</p>
      <h1 className="mt-2 font-serif text-4xl">দাম ও লাভ</h1>
      <p className="mt-3 max-w-2xl text-sm text-ink-soft">
        কস্ট প্রাইস মানে হাউসকে কত টাকা দিচ্ছ। বিক্রয় মূল্য থেকে কস্ট বাদ দিলে লাভ দেখাবে। বন্ধ (Off) করা প্রোডাক্ট দোকানে দেখাবে না এবং নতুন অর্ডারও নেওয়া হবে না।
      </p>
      <AdminNav />

      {products.length === 0 ? (
        <p className="mt-8 text-sm text-mute">এখনো কোনো প্রোডাক্ট নেই।</p>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs tracking-widest text-mute uppercase">
              <tr>
                <th className="py-3 pr-4">প্রোডাক্ট</th>
                <th className="py-3 pr-4">বিক্রয় মূল্য</th>
                <th className="py-3 pr-4">কস্ট প্রাইস</th>
                <th className="py-3 pr-4">লাভ / পিস</th>
                <th className="py-3 pr-4">স্ট্যাটাস</th>
                <th className="py-3"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <PriceRow key={p.slug} product={p} onSaved={() => router.invalidate()} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PriceRow({ product, onSaved }: { product: Product; onSaved: () => void }) {
  const [cost, setCost] = useState(product.cost !== undefined ? String(product.cost) : "");
  const [active, setActive] = useState(product.active !== false);
  const [busy, setBusy] = useState(false);

  const costNumber = Number(cost);
  const hasCost = cost.trim() !== "" && Number.isFinite(costNumber) && costNumber >= 0;
  const profit = hasCost ? product.price - costNumber : null;
  const dirty =
    cost.trim() !== (product.cost !== undefined ? String(product.cost) : "") ||
    active !== (product.active !== false);

  async function save() {
    if (!hasCost) {
      toast.error("কস্ট প্রাইস সঠিকভাবে লিখো।");
      return;
    }
    setBusy(true);
    try {
      await updateProductMeta({ data: { slug: product.slug, cost: Math.round(costNumber), active } });
      toast.success(`${product.name} সেভ হয়েছে`);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "সেভ হয়নি। আবার চেষ্টা করো।");
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr className="border-b border-line align-middle">
      <td className="py-3 pr-4">
        {product.name}
        <br />
        <span className="font-mono text-xs text-mute">{product.slug}</span>
      </td>
      <td className="py-3 pr-4 tabular-nums">{taka(product.price)}</td>
      <td className="py-3 pr-4">
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          placeholder="যেমন 800"
          className="h-10 w-28 border border-line bg-white px-2 text-sm tabular-nums"
        />
      </td>
      <td className="py-3 pr-4 tabular-nums">
        {profit === null ? <span className="text-mute">—</span> : <span className={profit < 0 ? "text-red-700" : ""}>{taka(profit)}</span>}
      </td>
      <td className="py-3 pr-4">
        <button
          type="button"
          onClick={() => setActive((v) => !v)}
          className={active ? "h-9 border border-pine bg-pine px-3 text-xs text-ivory" : "h-9 border border-line bg-white px-3 text-xs text-mute"}
        >
          {active ? "On" : "Off"}
        </button>
      </td>
      <td className="py-3">
        <button
          type="button"
          onClick={save}
          disabled={!dirty || busy}
          className="h-9 border border-ink bg-ink px-4 text-xs text-ivory disabled:opacity-40"
        >
          {busy ? "সেভ হচ্ছে…" : "সেভ"}
        </button>
      </td>
    </tr>
  );
}
