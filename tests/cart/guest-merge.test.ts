import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { startTestDb, stopTestDb, clearAllCollections } from "../helpers/test-db";
import { mergeGuestIntoUser } from "@/services/guest-merge.service";
import { GuestCartRepository } from "@/repositories/guest-cart-repo";
import { GuestWishlistRepository } from "@/repositories/guest-wishlist-repo";
import { CartRepository } from "@/repositories/cart-repo";
import { WishlistRepository } from "@/repositories/wishlist.repository";
import { ProductTypeEnum } from "@/enums";

/**
 * Guest cart/wishlist merge-on-login.
 *
 * Covers the two behaviours the merge step promises:
 *  - quantities sum (not overwrite) when the guest and the real cart both
 *    already have the same product + size (Cart.addToCart's dedupe rule),
 *  - wishlist products dedupe rather than double up (Wishlist.addProduct's
 *    dedupe rule),
 * and that the guest documents are deleted once merged, so a stale guest
 * cookie can't be replayed into the account a second time.
 */
describe("mergeGuestIntoUser", () => {
  beforeAll(async () => {
    await startTestDb();
  }, 180_000);

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    await clearAllCollections();
  });

  it("sums quantity for a cart item the user already has, and adds the rest", async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const guestId = `GST-TEST-${Date.now()}`;

    const sharedProductId = new mongoose.Types.ObjectId().toString();
    const sharedStoreId = new mongoose.Types.ObjectId().toString();
    const guestOnlyProductId = new mongoose.Types.ObjectId().toString();
    const guestOnlyStoreId = new mongoose.Types.ObjectId().toString();

    // The user's real cart already has 2 of the shared product.
    await CartRepository.create({
      userId: new mongoose.Types.ObjectId(userId),
      items: [
        {
          productId: new mongoose.Types.ObjectId(sharedProductId),
          storeId: new mongoose.Types.ObjectId(sharedStoreId),
          quantity: 2,
          productType: ProductTypeEnum.Product,
        },
      ],
    });

    // The guest cart has 3 more of the same product, plus a product the
    // user doesn't have yet.
    await GuestCartRepository.addItem(guestId, {
      productId: sharedProductId,
      storeId: sharedStoreId,
      quantity: 3,
      productType: ProductTypeEnum.Product,
    });
    await GuestCartRepository.addItem(guestId, {
      productId: guestOnlyProductId,
      storeId: guestOnlyStoreId,
      quantity: 1,
      productType: ProductTypeEnum.Product,
    });

    await mergeGuestIntoUser(userId, guestId);

    const mergedCart = await CartRepository.getCartByUserId(userId);
    expect(mergedCart).not.toBeNull();
    expect(mergedCart!.items).toHaveLength(2);

    const sharedItem = mergedCart!.items.find(
      (i) => i.productId.toString() === sharedProductId,
    );
    expect(sharedItem?.quantity).toBe(5); // 2 (existing) + 3 (guest)

    const newItem = mergedCart!.items.find(
      (i) => i.productId.toString() === guestOnlyProductId,
    );
    expect(newItem?.quantity).toBe(1);

    // The guest cart must be gone so a lingering cookie can't be replayed.
    const leftoverGuestCart = await GuestCartRepository.findByGuestId(guestId);
    expect(leftoverGuestCart).toBeNull();
  });

  it("dedupes a wishlist product the user already has, and adds the rest", async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const guestId = `GST-TEST-${Date.now()}`;

    const sharedProductId = new mongoose.Types.ObjectId().toString();
    const guestOnlyProductId = new mongoose.Types.ObjectId().toString();

    await WishlistRepository.create({
      userId,
      products: [
        {
          productId: new mongoose.Types.ObjectId(sharedProductId),
          productType: ProductTypeEnum.Product,
        },
      ],
    });

    await GuestWishlistRepository.addItem(guestId, {
      productId: sharedProductId,
      productType: ProductTypeEnum.Product,
    });
    await GuestWishlistRepository.addItem(guestId, {
      productId: guestOnlyProductId,
      productType: ProductTypeEnum.Product,
    });

    await mergeGuestIntoUser(userId, guestId);

    const mergedWishlist = await WishlistRepository.findByUserId(userId);
    expect(mergedWishlist).not.toBeNull();
    // 2, not 3 — the shared product must not be duplicated.
    expect(mergedWishlist!.products).toHaveLength(2);

    const productIds = mergedWishlist!.products.map((p) =>
      p.productId.toString(),
    );
    expect(productIds).toContain(sharedProductId);
    expect(productIds).toContain(guestOnlyProductId);

    const leftoverGuestWishlist =
      await GuestWishlistRepository.findByGuestId(guestId);
    expect(leftoverGuestWishlist).toBeNull();
  });

  it("is a no-op when the guest never had a cart or wishlist", async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const guestId = `GST-TEST-EMPTY-${Date.now()}`;

    await expect(mergeGuestIntoUser(userId, guestId)).resolves.not.toThrow();

    expect(await CartRepository.getCartByUserId(userId)).toBeNull();
    expect(await WishlistRepository.findByUserId(userId)).toBeNull();
  });
});
