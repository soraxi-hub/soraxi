import { create } from "zustand";
import { persist } from "zustand/middleware";

export type RecentlyViewedProduct = {
  productId: string;
  slug: string;
  name: string;
  image: string;
  formattedPrice: string;
  isVerifiedProduct?: boolean;
};

type StoredProduct = RecentlyViewedProduct & { viewedAt: number };

const MAX_ITEMS = 12;

interface RecentlyViewedState {
  items: StoredProduct[];
  addProduct: (product: RecentlyViewedProduct) => void;
  clear: () => void;
}

export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set, get) => ({
      items: [],

      addProduct: (product) => {
        const remaining = get().items.filter(
          (item) => item.productId !== product.productId
        );
        const items = [
          { ...product, viewedAt: Date.now() },
          ...remaining,
        ].slice(0, MAX_ITEMS);
        set({ items });
      },

      clear: () => set({ items: [] }),
    }),
    {
      name: "recently-viewed-storage",
    }
  )
);
