import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  getProduct,
  shippingFor,
  onlineDiscountFor,
  SHIP_FEE,
  type PayMethod,
} from "@/lib/catalog";

export type CartLine = { slug: string; qty: number };

export type OrderRecord = {
  id: string;
  createdAt: string;
  lines: { slug: string; name: string; qty: number; price: number; image: string }[];
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
  add: (slug: string, qty?: number) => void;
  setQty: (slug: string, qty: number) => void;
  remove: (slug: string) => void;
  clear: () => void;
  placeOrder: (customer: OrderRecord["customer"]) => string | null;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      orders: [],
      add: (slug, qty = 1) => {
        const product = getProduct(slug);
        if (!product) return;
        set((state) => {
          const existing = state.items.find((i) => i.slug === slug);
          if (!existing) return { items: [...state.items, { slug, qty }] };
          return {
            items: state.items.map((i) =>
              i.slug === slug ? { ...i, qty: Math.min(8, i.qty + qty) } : i,
            ),
          };
        });
      },
      setQty: (slug, qty) => {
        if (qty <= 0) {
          set((state) => ({ items: state.items.filter((i) => i.slug !== slug) }));
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.slug === slug ? { ...i, qty: Math.min(8, qty) } : i,
          ),
        }));
      },
      remove: (slug) =>
        set((state) => ({ items: state.items.filter((i) => i.slug !== slug) })),
      clear: () => set({ items: [] }),
      placeOrder: (customer) => {
        const lines = get()
          .items.map((item) => {
            const product = getProduct(item.slug);
            if (!product) return null;
            return {
              slug: product.slug,
              name: product.name,
              qty: item.qty,
              price: product.price,
              image: product.image,
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
      const product = getProduct(item.slug);
      if (!product) return null;
      return { ...item, product };
    })
    .filter((line): line is { slug: string; qty: number; product: NonNullable<ReturnType<typeof getProduct>> } =>
      line !== null,
    );
  const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.qty, 0);
  const shipping = shippingFor(subtotal);
  return { lines, subtotal, shipping, total: subtotal + shipping };
}
