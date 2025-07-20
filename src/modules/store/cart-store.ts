import { create } from "zustand";
import { persist } from "zustand/middleware";
// import type { ICart } from "@/lib/db/models/cart.model"; // Optional for full cart shape

type CartItem = {
  productId: string;
  quantity: number;
  size?: string;
  // selectedSize?: {
  //   size: string;
  //   price: number;
  //   quantity: number;
  // }; TODO: check this letter. I need to know if size should be a string on an object.
};

interface CartState {
  items: CartItem[];
  totalQuantity: number;

  setCart: (items: CartItem[]) => void;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, size?: string) => void;
  updateQuantity: (productId: string, quantity: number, size?: string) => void;
  resetCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      totalQuantity: 0,

      setCart: (items) => {
        set({
          items,
          totalQuantity: items.reduce((sum, i) => sum + i.quantity, 0),
        });
      },

      addItem: (item) => {
        const existing = get().items.find(
          (i) => i.productId === item.productId && i.size === item.size
        );

        let updatedItems;
        if (existing) {
          updatedItems = get().items.map((i) =>
            i.productId === item.productId && i.size === item.size
              ? { ...i, quantity: i.quantity + item.quantity }
              : i
          );
        } else {
          updatedItems = [...get().items, item];
        }

        set({
          items: updatedItems,
          totalQuantity: updatedItems.reduce((sum, i) => sum + i.quantity, 0),
        });
      },

      removeItem: (productId, size) => {
        const updatedItems = get().items.filter(
          (i) => !(i.productId === productId && (size ? i.size === size : true))
        );
        set({
          items: updatedItems,
          totalQuantity: updatedItems.reduce((sum, i) => sum + i.quantity, 0),
        });
      },

      updateQuantity: (productId, quantity, size) => {
        const updatedItems = get().items.map(
          (i) =>
            i.productId === productId && i.size === size
              ? { ...i, quantity }
              : i
          // i.productId === productId ? { ...i, quantity } : i
        );
        set({
          items: updatedItems,
          totalQuantity: updatedItems.reduce((sum, i) => sum + i.quantity, 0),
        });
      },

      resetCart: () => set({ items: [], totalQuantity: 0 }),
    }),
    {
      name: "cart-storage", // for localStorage
    }
  )
);
