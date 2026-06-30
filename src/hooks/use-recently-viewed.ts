"use client";

import { useEffect } from "react";
import {
  useRecentlyViewedStore,
  type RecentlyViewedProduct,
} from "@/modules/store/recently-viewed-store";

/**
 * Single entry point for the recently-viewed feature, backed by localStorage.
 *
 * Pass `productToTrack` from a product detail page to record a view on mount.
 * Call with no arguments anywhere else to just read the list (e.g. a widget).
 */
export function useRecentlyViewed(
  productToTrack?: RecentlyViewedProduct | null
) {
  const items = useRecentlyViewedStore((state) => state.items);
  const addProduct = useRecentlyViewedStore((state) => state.addProduct);
  const clear = useRecentlyViewedStore((state) => state.clear);

  useEffect(() => {
    if (productToTrack) addProduct(productToTrack);
    // Only re-track when the viewed product itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productToTrack?.productId]);

  return { items, trackView: addProduct, clear };
}
