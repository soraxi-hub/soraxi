import { siteConfig } from "@/config/site";
import { Cart, BaseCartProps } from "../cart";
import { IPopulatedCartInfo, IPopulatedCartItem } from "../cart-interface";
import { IProduct } from "@/lib/db/models/product.model";

export class PopulatedCart extends Cart implements IPopulatedCartInfo {
  // The decorator holds the product map as its "extra" state
  private productMap: Map<string, IProduct>;

  constructor(props: BaseCartProps, products: IProduct[]) {
    super(props); // delegate to the wrapped Cart
    this.productMap = new Map(products.map((p) => [p._id!.toString(), p]));
  }

  // Override items to return enriched items
  get items(): IPopulatedCartItem[] {
    const cartItems = super.items
      .map((item) => {
        const product = this.productMap.get(item.productId.toString());

        if (!product || !product._id || typeof product.price !== "number") {
          console.warn(
            `Product not found or invalid data for cart item: ${item.productId}`,
          );
          return null;
        }

        const productData = {
          productId: product._id.toString(),
          name: product.name,
          price: product.price,
          image:
            (product.images && product.images[0]) || siteConfig.placeHolderImg,
          slug: product.slug,
          storeId: product.storeId.toString(),
          status: product.status,
          sizes: product.sizes ?? [],
          category: product.category ?? [],
          productQuantity: product.productQuantity ?? 0,
          inStock:
            product.productQuantity && product.productQuantity > 0
              ? true
              : false,
          productType: product.productType,
        };

        return {
          ...item,
          productId: item.productId.toString(),
          storeId: item.storeId.toString(),
          product: productData,
        };
      })
      .filter((item) => item !== null);

    return cartItems;
  }

  get subtotal(): number {
    return this.items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0,
    );
  }

  get outOfStockItems(): IPopulatedCartItem[] {
    return this.items.filter((item) => !item.product.inStock);
  }

  get isAnyItemOutOfStock(): boolean {
    if (this.outOfStockItems.length > 0) return true;

    return false;
  }

  get itemCount(): number {
    return this.items.length;
  }

  get productCount(): number {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  /**
   * Groups populated cart items by storeId
   */
  get groupedByStore(): Record<string, IPopulatedCartItem[]> {
    return this.items.reduce(
      (acc, item) => {
        const storeId = item.product.storeId;

        if (!acc[storeId]) acc[storeId] = [];

        acc[storeId].push(item);

        return acc;
      },
      {} as Record<string, IPopulatedCartItem[]>,
    );
  }

  /**
   * Returns grouped cart in array format
   * Useful for API responses and UI rendering
   */
  get groupedCart() {
    return Object.entries(this.groupedByStore).map(([storeId, products]) => ({
      storeId,
      products,
    }));
  }

  /**
   * Returns all unique storeIds in the cart
   */
  get storeIds(): string[] {
    return Object.keys(this.groupedByStore);
  }

  /**
   * Returns total quantity per store
   */
  get groupedProductCountByStore(): Record<string, number> {
    return Object.entries(this.groupedByStore).reduce(
      (acc, [storeId, items]) => {
        acc[storeId] = items.reduce((sum, item) => sum + item.quantity, 0);

        return acc;
      },
      {} as Record<string, number>,
    );
  }

  /**
   * Returns subtotal per store
   */
  get groupedSubtotalByStore(): Record<string, number> {
    return Object.entries(this.groupedByStore).reduce(
      (acc, [storeId, items]) => {
        acc[storeId] = items.reduce(
          (sum, item) => sum + item.product.price * item.quantity,
          0,
        );

        return acc;
      },
      {} as Record<string, number>,
    );
  }

  /**
   * Products that no longer exist
   */
  get missingProducts(): string[] {
    return super.items
      .filter((item) => {
        const product = this.productMap.get(item.productId.toString());

        return !product;
      })
      .map((item) => item.productId.toString());
  }

  /**
   * Whether cart contains deleted products
   */
  get hasMissingProducts(): boolean {
    return this.missingProducts.length > 0;
  }

  /**
   * Validates stock availability
   */
  get stockValidationErrors(): string[] {
    const errors: string[] = [];

    for (const item of this.items) {
      /**
       * Size-based validation
       */
      if (item.selectedSize) {
        const size = item.product.sizes?.find(
          (s) => s.size === item.selectedSize?.size,
        );

        if (!size) {
          errors.push(
            `Size ${item.selectedSize.size} is no longer available for ${item.product.name}.`,
          );

          continue;
        }

        if (size.quantity < item.quantity) {
          errors.push(
            `Insufficient stock for ${item.product.name} (Size: ${item.selectedSize.size}).`,
          );
        }

        continue;
      }

      /**
       * Non-size product validation
       */
      if (
        item.product.productQuantity != null &&
        item.product.productQuantity < item.quantity
      ) {
        errors.push(`Insufficient stock for ${item.product.name}.`);
      }
    }

    return errors;
  }

  /**
   * Products with insufficient stock
   */
  get outOfStockValidationItems(): IPopulatedCartItem[] {
    return this.items.filter((item) => {
      if (item.selectedSize) {
        const size = item.product.sizes?.find(
          (s) => s.size === item.selectedSize?.size,
        );

        if (!size) return true;

        return size.quantity < item.quantity;
      }

      return (
        item.product.productQuantity != null &&
        item.product.productQuantity < item.quantity
      );
    });
  }

  /**
   * Returns all cart validation errors
   */
  get validationErrors(): string[] {
    const errors: string[] = [];

    if (this.hasMissingProducts) {
      errors.push("A product in your cart no longer exists in the catalog.");
    }

    errors.push(...this.stockValidationErrors);

    return errors;
  }

  /**
   * Whether cart is valid at product level
   */
  get isValid(): boolean {
    return this.validationErrors.length === 0;
  }
}
