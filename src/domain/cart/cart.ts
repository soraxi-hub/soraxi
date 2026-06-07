import { ICart } from "@/lib/db/models/cart.model";
import { ICartInfo, ICartItemInfo } from "./cart-interface";
import mongoose from "mongoose";

export type BaseCartProps = Omit<ICart, "_id" | "userId"> & {
  _id?: string;
  userId: string;
};

export class Cart implements ICartInfo {
  constructor(protected props: BaseCartProps) {}

  get cartId(): string | undefined {
    return this.props._id?.toString();
  }

  get userId(): string {
    return this.props.userId.toString();
  }

  get items(): ICartItemInfo[] {
    if (!this.props.items) {
      this.props.items = [];
    }

    return this.props.items.map((s) => {
      return {
        ...s,
        storeId: s.storeId.toString(),
        productId: s.productId.toString(),
      };
    });
  }

  /**
   * Total number of individual units in the cart
   */
  get totalItems(): number {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  /**
   * Number of unique product entries
   */
  get totalUniqueItems(): number {
    return this.items.length;
  }

  get idempotencyKey(): string | undefined {
    return this.props.idempotencyKey;
  }

  get createdAt(): Date | undefined {
    return this.props.createdAt;
  }

  get updatedAt(): Date | undefined {
    return this.props.updatedAt;
  }

  addToCart(newItem: ICartItemInfo): void {
    if (!this.props.items) {
      this.props.items = [];
    }

    const itemIndex = this.props.items.findIndex(
      (item) =>
        item.productId.toString() === newItem.productId &&
        item.selectedSize?.size === newItem.selectedSize?.size,
    );

    if (itemIndex > -1) {
      this.props.items[itemIndex].quantity += newItem.quantity;
      return;
    }

    this.props.items.push({
      ...newItem,
      productId: new mongoose.Types.ObjectId(newItem.productId),
      storeId: new mongoose.Types.ObjectId(newItem.storeId),
    });
  }

  removeFromCart(productId: string): void {
    this.props.items = (this.props.items || []).filter(
      (item) => item.productId.toString() !== productId,
    );
  }

  updateItemQuantity(productId: string, quantity: number, size?: string): void {
    const itemIndex = (this.props.items || []).findIndex(
      (item) =>
        item.productId.toString() === productId &&
        item.selectedSize?.size === size,
    );

    if (itemIndex > -1) {
      this.props.items![itemIndex].quantity = quantity;
    }
  }

  clearCart(): void {
    this.props.items = [];
  }
}
