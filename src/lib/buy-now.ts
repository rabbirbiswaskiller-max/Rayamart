import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CartLine } from "@/lib/store";

// "Order now" keeps one piece aside for checkout. The shopping bag is not touched.
// Kept in sessionStorage so a refresh on the checkout page still works.
type BuyNowState = {
  line: CartLine | null;
  set: (line: CartLine | null) => void;
};

export const useBuyNow = create<BuyNowState>()(
  persist(
    (set) => ({
      line: null,
      set: (line) => set({ line }),
    }),
    {
      name: "raya-buy-now",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
