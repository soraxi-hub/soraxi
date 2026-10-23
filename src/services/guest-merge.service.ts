import { CartService } from "@/services/cart/cart.service";
import { WishlistService } from "@/services/wishlist.service";
import { GuestCartRepository } from "@/repositories/guest-cart-repo";
import { GuestWishlistRepository } from "@/repositories/guest-wishlist-repo";

/**
 * Replays a guest's cart/wishlist items into their real account's cart/
 * wishlist on sign-in or sign-up, then deletes the guest documents.
 *
 * Goes through the existing, unmodified `CartService.addToCart` /
 * `WishlistService.addProduct` — both already de-dupe and sum quantity
 * correctly (see `Cart.addToCart` / `Wishlist.addProduct`), so merging is
 * just replaying adds through the same path a logged-in user's own
 * add-to-cart/wishlist clicks go through.
 */
export async function mergeGuestIntoUser(
  userId: string,
  guestId: string,
): Promise<void> {
  const guestCart = await GuestCartRepository.findByGuestId(guestId);
  if (guestCart) {
    for (const item of guestCart.items) {
      await CartService.addToCart(userId, {
        productId: item.productId.toString(),
        storeId: item.storeId.toString(),
        quantity: item.quantity,
        productType: item.productType,
        selectedSize: item.selectedSize,
      });
    }
    await GuestCartRepository.deleteByGuestId(guestId);
  }

  const guestWishlist = await GuestWishlistRepository.findByGuestId(guestId);
  if (guestWishlist) {
    for (const product of guestWishlist.products) {
      await WishlistService.addProduct(userId, {
        productId: product.productId.toString(),
        productType: product.productType,
      });
    }
    await GuestWishlistRepository.deleteByGuestId(guestId);
  }
}
