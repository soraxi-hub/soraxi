import { Cart } from "../cart/cart";

export class Order {
  constructor(protected idempotencyKey: string) {
    this.idempotencyKey = idempotencyKey;
  }

  placeOrder() {}

  existingOrder(cart: Cart) {
    return cart.getIdempotencyKey() === this.idempotencyKey;
  }
}
