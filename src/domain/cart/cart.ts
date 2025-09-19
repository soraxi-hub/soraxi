/**
 * Interface for a single item in the cart
 * Each item holds a product reference, quantity, and optional size details.
 */
export interface CartItem {
  productId: string;
  storeId: string;
  quantity: number;
  productType: "Product" | "digitalproducts";
}

/**
 * Interface for the Cart document
 * Represents a user's shopping cart with polymorphic product support.
 */
export interface CartInterface {
  userId: string;
  items: CartItem[];
  idempotencyKey?: string;
}

export class Cart {
  constructor(
    protected userId: CartInterface[`userId`],
    protected items: CartInterface[`items`],
    protected idempotencyKey: CartInterface[`idempotencyKey`]
  ) {
    this.userId = userId;
    this.items = items;
    this.idempotencyKey = idempotencyKey;
  }

  getIdempotencyKey() {
    return this.idempotencyKey;
  }
}
