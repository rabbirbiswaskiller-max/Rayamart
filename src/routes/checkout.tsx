import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { cities, payMethods, taka, onlineDiscountFor, SHIP_FEE, type PayMethod } from "@/lib/catalog";
import { useCartDetailed } from "@/lib/store";
import { createCustomerOrder } from "@/lib/orders";
import { readRef } from "@/lib/referral";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — Raya Mart" }] }),
  component: CheckoutPage,
});

type Draft = {
  name: string;
  phone: string;
  city: string;
  address: string;
  pay: PayMethod;
  note: string;
};

const empty: Draft = {
  name: "",
  phone: "",
  city: "Dhaka",
  address: "",
  pay: "bkash",
  note: "",
};

function CheckoutPage() {
  const { lines, subtotal } = useCartDetailed();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Draft>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isCOD = draft.pay === "cod";
  const discountAmount = isCOD ? 0 : onlineDiscountFor(subtotal);
  const shippingAmount = isCOD ? SHIP_FEE : 0;
  const totalAmount = subtotal - discountAmount + shippingAmount;

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20">
        <h1 className="font-serif text-5xl">Nothing to confirm.</h1>
        <Link to="/shop" search={{}} className="mt-6 inline-flex h-12 items-center bg-pine px-6 text-sm text-ivory">
          Shop the edit
        </Link>
      </div>
    );
  }

  const allLanded = lines.every((line) => line.product.landed);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Partial<Record<keyof Draft, string>> = {};
    if (draft.name.trim().length < 2) next.name = "Please leave your name.";
    const phone = draft.phone.replace(/\s/g, "");
    if (!/^01\d{9}$/.test(phone)) next.phone = "Use an 11-digit mobile, starting with 01.";
    if (!draft.city) next.city = "Choose a city.";
    if (draft.address.trim().length < 8) next.address = "Add a full address the courier can find.";
    if (draft.pay === "cod" && !allLanded) {
      next.pay = "Cash on delivery is only for pieces already in Dhaka.";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setSubmitError("");
    setSubmitting(true);
    try {
      const result = await createCustomerOrder({ data: {
        customer: { ...draft, phone, name: draft.name.trim(), address: draft.address.trim() },
        items: lines.map((line) => ({ slug: line.slug, qty: line.qty })),
        ref: readRef(),
      } });
      navigate({ to: "/order/$id", params: { id: result.id } });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "অর্ডার জমা হয়নি। আবার চেষ্টা করো।");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-12">
      <form onSubmit={onSubmit} className="lg:col-span-7" noValidate>
        <p className="text-xs tracking-widest text-mute uppercase">The desk</p>
        <h1 className="mt-2 font-serif text-5xl">Where shall we send it?</h1>
        <p className="mt-3 max-w-lg text-sm text-ink-soft">
          We call this number to confirm the piece is in hand. You are not charged on this page.
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <Field label="Name" error={errors.name}>
            <input className={input} value={draft.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" />
          </Field>
          <Field label="Mobile" error={errors.phone}>
            <input className={input} value={draft.phone} onChange={(e) => set("phone", e.target.value)} inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" />
          </Field>
          <Field label="City" error={errors.city}>
            <select className={input} value={draft.city} onChange={(e) => set("city", e.target.value)}>
              {cities.map((city) => (
                <option key={city}>{city}</option>
              ))}
            </select>
          </Field>
          <Field label="Address" error={errors.address} className="sm:col-span-2">
            <textarea
              className={`${input} h-28 py-3`}
              value={draft.address}
              onChange={(e) => set("address", e.target.value)}
              autoComplete="street-address"
              placeholder="House, road, area"
            />
          </Field>
        </div>

        <fieldset className="mt-8">
          <legend className="text-xs tracking-widest text-mute uppercase">Pay after confirmation</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {payMethods.map((method) => {
              const disabled = method.id === "cod" && !allLanded;
              const active = draft.pay === method.id;
              return (
                <label
                  key={method.id}
                  className={`border px-4 py-3 ${active ? "border-ink bg-ivory" : "border-line"} ${disabled ? "opacity-50" : ""}`}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="pay"
                      checked={active}
                      disabled={disabled}
                      onChange={() => set("pay", method.id)}
                    />
                    <span className="text-sm">{method.name}</span>
                  </span>
                  <span className="mt-1 block pl-6 text-xs text-mute">{method.line}</span>
                </label>
              );
            })}
          </div>
          {errors.pay ? <p className="mt-2 text-sm text-brick">{errors.pay}</p> : null}
        </fieldset>

        <Field label="Note for the desk" className="mt-6">
          <textarea
            className={`${input} h-24 py-3`}
            value={draft.note}
            onChange={(e) => set("note", e.target.value)}
            placeholder="A gift name, a preferred call time"
          />
        </Field>

        {submitError ? <p role="alert" className="mt-4 text-sm text-brick">{submitError}</p> : null}
        <button type="submit" disabled={submitting} className="mt-8 inline-flex h-12 w-full items-center justify-center bg-pine text-sm text-ivory hover:bg-pine-deep disabled:opacity-60 sm:w-auto sm:px-10">
          {submitting ? "Saving order…" : "Request this order"}
        </button>
      </form>

      <aside className="h-fit border border-line bg-ivory p-6 lg:col-span-5">
        <h2 className="font-serif text-3xl">In this request</h2>
        <ul className="mt-4 divide-y divide-line">
          {lines.map((line) => (
            <li key={line.slug} className="flex gap-3 py-3">
              <img src={line.product.image} alt="" className="size-16 object-cover" />
              <div className="min-w-0 flex-1">
                <p className="font-serif text-xl leading-tight">{line.product.name}</p>
                <p className="text-xs text-mute">× {line.qty}</p>
              </div>
              <p className="text-sm tabular-nums">{taka(line.product.price * line.qty)}</p>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between"><dt className="text-mute">Pieces</dt><dd className="tabular-nums">{taka(subtotal)}</dd></div>
          {discountAmount > 0 ? <div className="flex justify-between"><dt className="text-mute">Online discount (3%)</dt><dd>-{taka(discountAmount)}</dd></div> : null}
          <div className="flex justify-between"><dt className="text-mute">Delivery</dt><dd>{shippingAmount === 0 ? "Complimentary" : taka(shippingAmount)}</dd></div>
          <div className="flex justify-between text-base"><dt>Total</dt><dd className="tabular-nums">{taka(totalAmount)}</dd></div>
          {isCOD ? <div className="border-t border-line pt-3 text-sm"><p>Advance delivery fee: <strong>{taka(SHIP_FEE)}</strong></p><p className="mt-1">Pay for products on delivery: <strong>{taka(subtotal)}</strong></p></div> : null}
        </dl>
      </aside>
    </div>
  );
}

const input =
  "mt-2 w-full border border-line bg-ivory px-3 text-sm text-ink outline-none focus:border-pine h-12";

function Field({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block text-xs tracking-widest text-mute uppercase ${className ?? ""}`}>
      {label}
      {children}
      {error ? <span className="mt-1 block text-sm tracking-normal text-brick normal-case">{error}</span> : null}
    </label>
  );
}
