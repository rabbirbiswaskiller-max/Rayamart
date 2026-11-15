import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  getProduct,
  type Product,
  shippingFor,
  onlineDiscountFor,
  SHIP_FEE,
  type PayMethod,
} from "@/lib/catalog";

export type CartLine = { slug: string; qty: number; product?: Product; image?: string; size?: string; color?: string };
export function cartLineKey(line: Pick<CartLine, "slug" | "size" | "color">) { return `${line.slug}|${line.size ?? ""}|${line.color ?? ""}`; }

export type OrderRecord = {
  id: string;
  createdAt: string;
  lines: { slug: string; name: string; qty: number; price: number; image: string; size?: string; color?: string }[];
  subtotal: number;
  discount?: number;
  shipping: number;
  total: number;
  advanceDue?: number;
  dueOnDelivery?: number;
  customer: {
    name: string;
    phone: string;
    city: string;
    address: string;
    pay: PayMethod;
    note: string;
  };
};

type CartState = {
  items: CartLine[];
  orders: OrderRecord[];
  add: (product: Product | string, qty?: number, size?: string, color?: string) => void;
  setQty: (slug: string, qty: number, size?: string, color?: string) => void;
  remove: (slug: string, size?: string, color?: string) => void;
  clear: () => void;
  placeOrder: (customer: OrderRecord["customer"]) => string | null;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      orders: [],
      add: (productOrSlug, qty = 1, size, color) => {
        const product = typeof productOrSlug === "string" ? getProduct(productOrSlug) : productOrSlug;
        if (!product) return;
        const slug = product.slug;
        set((state) => {
          const key = cartLineKey({ slug, size, color });
          const existing = state.items.find((i) => cartLineKey(i) === key);
          if (!existing) return { items: [...state.items, { slug, qty, product, ...(size ? { size } : {}), ...(color ? { color } : {}) }] };
          return { items: state.items.map((i) => cartLineKey(i) === key ? { ...i, qty: Math.min(8, i.qty + qty) } : i) };
        });
      },
      setQty: (slug, qty, size, color) => {
        const key = cartLineKey({ slug, size, color });
        if (qty <= 0) {
          set((state) => ({ items: state.items.filter((i) => cartLineKey(i) !== key) }));
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            cartLineKey(i) === key ? { ...i, qty: Math.min(8, qty) } : i,
          ),
        }));
      },
      remove: (slug, size, color) => {
        const key = cartLineKey({ slug, size, color });
        set((state) => ({ items: state.items.filter((i) => cartLineKey(i) !== key) }));
      },
      clear: () => set({ items: [] }),
      placeOrder: (customer) => {
        const lines = get()
          .items.map((item) => {
            const product = item.product ?? getProduct(item.slug);
            if (!product) return null;
            return {
              slug: product.slug,
              name: product.name,
              qty: item.qty,
              price: product.price,
              image: product.image,
              ...(item.size ? { size: item.size } : {}),
              ...(item.color ? { color: item.color } : {}),
            };
          })
          .filter((line): line is OrderRecord["lines"][number] => line !== null);
        if (lines.length === 0) return null;
        const subtotal = lines.reduce((sum, line) => sum + line.price * line.qty, 0);
        const isCOD = customer.pay === "cod";
        const discount = isCOD ? 0 : onlineDiscountFor(subtotal);
        const shipping = isCOD ? SHIP_FEE : 0;
        const advanceDue = isCOD ? shipping : 0;
        const dueOnDelivery = isCOD ? subtotal : 0;
        const id = `RM-${Date.now().toString(36).toUpperCase()}`;
        const order: OrderRecord = {
          id,
          createdAt: new Date().toISOString(),
          lines,
          subtotal,
          discount,
          shipping,
          total: subtotal - discount + shipping,
          advanceDue,
          dueOnDelivery,
          customer,
        };
        set((state) => ({ orders: [order, ...state.orders], items: [] }));
        return id;
      },
    }),
    {
      name: "raya-mart",
      partialize: (state) => ({ items: state.items, orders: state.orders }),
    },
  ),
);

export function useCartCount() {
  return useCart((s) => s.items.reduce((n, i) => n + i.qty, 0));
}

export function useCartDetailed() {
  const items = useCart((s) => s.items);
  const lines = items
    .map((item) => {
      const product = item.product ?? getProduct(item.slug);
      if (!product) return null;
      return { slug: item.slug, qty: item.qty, product, image: item.image ?? product.image, ...(item.size ? { size: item.size } : {}), ...(item.color ? { color: item.color } : {}) };
    })
    .filter((line): line is NonNullable<typeof line> =>
      line !== null,
    );
  const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.qty, 0);
  const shipping = shippingFor(subtotal);
  return { lines, subtotal, shipping, total: subtotal + shipping };
}
