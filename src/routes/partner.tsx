import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { applyAsPartner, getMyPartner } from "@/lib/partners";

export const Route = createFileRoute("/partner")({
  head: () => ({ meta: [{ title: "Partner হোন — Raya Mart" }] }),
  loader: () => getMyPartner(),
  component: PartnerPage,
});

const field = "mt-1 w-full border border-line bg-ivory px-3 py-3 text-sm outline-none focus:border-pine";

function PartnerPage() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [handle, setHandle] = useState("");
  const [audience, setAudience] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await applyAsPartner({ data: { name, phone, handle, audience } });
      await router.invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "আবেদন জমা হয়নি। আবার চেষ্টা করো।");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <p className="text-xs tracking-widest text-mute uppercase">Partner</p>
      <h1 className="mt-3 font-serif text-5xl">আমাদের partner হোন</h1>
      <p className="mt-4 text-ink-soft">
        তোমার লিংকে কেউ কিনলে তুমি প্রতিটি ডেলিভার হওয়া অর্ডারের ১০% কমিশন পাবে। আবেদন অনুমোদনের পর তোমাকে একটি নিজস্ব লিংক দেওয়া হবে।
      </p>

      {!data.signedIn ? (
        <div className="mt-8 border border-line bg-ivory p-6">
          <p className="text-ink-soft">আবেদন করতে আগে একটি অ্যাকাউন্ট খুলে লগইন করো।</p>
          <Link to="/account" className="mt-5 inline-flex h-12 items-center bg-pine px-6 text-sm text-ivory">
            অ্যাকাউন্ট খোলো / লগইন
          </Link>
        </div>
      ) : data.partner === null ? (
        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <label className="block text-sm">
            তোমার নাম
            <input className={field} value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
          </label>
          <label className="block text-sm">
            মোবাইল নম্বর
            <input className={field} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="01XXXXXXXXX" required />
          </label>
          <label className="block text-sm">
            Facebook পেজ বা Instagram-এর লিংক
            <input className={field} value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="https://facebook.com/..." required />
          </label>
          <label className="block text-sm">
            তোমার দর্শক সম্পর্কে ছোট করে লেখো (ঐচ্ছিক)
            <textarea className={field + " h-24"} value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="যেমন: ঢাকার মহিলা, ৫ হাজার ফলোয়ার, সৌন্দর্য বিষয়ক পেজ" />
          </label>
          {error ? <p role="alert" className="text-sm text-brick">{error}</p> : null}
          <button type="submit" disabled={busy} className="h-12 bg-pine px-6 text-sm text-ivory disabled:opacity-60">
            {busy ? "জমা হচ্ছে…" : "আবেদন জমা দাও"}
          </button>
        </form>
      ) : data.partner.status === "pending" ? (
        <div className="mt-8 border border-line bg-ivory p-6">
          <p className="font-serif text-2xl">তোমার আবেদন পর্যালোচনায় আছে</p>
          <p className="mt-2 text-sm text-ink-soft">আমরা যাচাই করে জানাব। অনুমোদন পেলে এখানে তোমার লিংক দেখাবে।</p>
        </div>
      ) : data.partner.status === "approved" ? (
        <div className="mt-8 border border-line bg-ivory p-6">
          <p className="font-serif text-2xl">তুমি অনুমোদিত partner</p>
          <p className="mt-3 text-sm text-ink-soft">তোমার লিংক:</p>
          <p className="mt-1 break-all font-mono text-sm">https://rayamart.vercel.app/?ref={data.partner.code}</p>
          <Link to="/partner-dashboard" className="mt-5 inline-flex h-12 items-center bg-pine px-6 text-sm text-ivory">
            ড্যাশবোর্ড খোলো
          </Link>
        </div>
      ) : (
        <div className="mt-8 border border-line bg-ivory p-6">
          <p className="text-ink-soft">দুঃখিত, এই আবেদনটি অনুমোদন পায়নি।</p>
        </div>
      )}
    </div>
  );
}
