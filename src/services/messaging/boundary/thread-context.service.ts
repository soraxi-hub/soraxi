import mongoose from "mongoose";

import {
  MessageParticipantKindEnum,
  MessageScopeKindEnum,
} from "@/enums";
import type {
  IConversationParticipant,
  IOrderRef,
  IProductRef,
} from "@/lib/db/models/conversation.model";
import { getStoreModel } from "@/lib/db/models/store.model";
import { getUserModel } from "@/lib/db/models/user.model";
import { AppError } from "@/lib/errors/app-error";
import { ProductRepository } from "@/repositories/product-repo";
import { OrderRepository } from "@/repositories/order.repository";

/**
 * ⚠️ THE MESSAGING BOUNDARY ⚠️
 *
 * Files in `src/services/messaging/boundary/` are the **only** part of the
 * messaging module permitted to read products, orders, users or stores.
 * Everything else — services, repositories, projections, procedures, UI —
 * renders from messaging's own collections.
 *
 * `scripts/check-messaging-boundary.ts` enforces this mechanically; it fails
 * the moment a messaging file outside this directory imports another domain.
 *
 * This file handles thread creation. Its sibling `identity-contact.service.ts`
 * handles outbound notification contact details, and documents why that one
 * case is read live rather than snapshotted.
 *
 * The rule exists so that:
 *
 *   - listing an inbox or a thread is a single-collection indexed query, with
 *     no `$lookup` and no N+1;
 *   - a vendor renaming, repricing or deleting a product cannot retroactively
 *     change what an existing enquiry was about;
 *   - the messaging module can be lifted into its own service or database
 *     later without a join to untangle.
 *
 * Everything read here is **copied into the conversation as a snapshot** at
 * creation time and never re-read. If you find yourself needing to import a
 * product or order elsewhere in messaging, the snapshot is missing a field —
 * add it here rather than opening a second doorway.
 */
export class ThreadContextService {
  /**
   * Builds the participant entries and product snapshot for a new product
   * enquiry.
   */
  static async forProduct({
    customerId,
    productId,
  }: {
    customerId: string;
    productId: string;
  }): Promise<{
    participants: IConversationParticipant[];
    productRef: IProductRef;
    storeId: string;
  }> {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new AppError("BAD_REQUEST", "Invalid product id");
    }

    const product = await ProductRepository.findSnapshotById(productId);

    if (!product) {
      throw new AppError("NOT_FOUND", "Product not found");
    }

    const storeId = product.storeId.toString();

    const [customer, store] = await Promise.all([
      this.customerParticipant(customerId),
      this.storeParticipant(storeId),
    ]);

    return {
      participants: [customer, store],
      productRef: {
        productId: new mongoose.Types.ObjectId(productId),
        name: product.name,
        image: product.images?.[0],
        price: product.price ?? 0,
      },
      storeId,
    };
  }

  /**
   * Builds the participant entries and order snapshot for a new order thread.
   *
   * The customer is taken from the order rather than from the caller — whoever
   * opens the thread, its participants are the order's owner and the sub-order's
   * store, and neither party gets to nominate the other.
   */
  static async forSubOrder(subOrderId: string): Promise<{
    participants: IConversationParticipant[];
    orderRef: IOrderRef;
    customerId: string;
    storeId: string;
  }> {
    if (!mongoose.Types.ObjectId.isValid(subOrderId)) {
      throw new AppError("BAD_REQUEST", "Invalid order id");
    }

    const found = await OrderRepository.findSubOrderById(subOrderId);

    if (!found) {
      throw new AppError("NOT_FOUND", "Order not found");
    }

    const { order, subOrder } = found;

    const customerId = order.userId.toString();
    const storeId = subOrder.storeId.toString();

    const [customer, store] = await Promise.all([
      this.customerParticipant(customerId),
      this.storeParticipant(storeId),
    ]);

    const thumbnails = subOrder.products
      .map((p) => p.productSnapshot.images?.[0])
      .filter((image): image is string => Boolean(image));

    return {
      participants: [customer, store],
      orderRef: {
        subOrderId: new mongoose.Types.ObjectId(subOrderId),
        status: subOrder.deliveryStatus,
        total: subOrder.financials?.amountPaid ?? 0,
        itemCount: subOrder.products.length,
        placedAt: order.createdAt ?? new Date(),
        // Cap the copy: the card shows three plus a "+N" overflow, so storing
        // more would bloat every conversation document for nothing.
        thumbnails: thumbnails.slice(0, 4),
      },
      customerId,
      storeId,
    };
  }

  /**
   * Confirms an identity may open a thread on a sub-order — they must be the
   * order's customer or the sub-order's store.
   */
  static assertOrderParticipant(
    {
      customerId,
      storeId,
    }: { customerId: string; storeId: string },
    initiator: { kind: MessageParticipantKindEnum; id: string },
  ): void {
    const permitted =
      (initiator.kind === MessageParticipantKindEnum.User &&
        initiator.id === customerId) ||
      (initiator.kind === MessageParticipantKindEnum.Store &&
        initiator.id === storeId);

    if (!permitted) {
      throw new AppError("FORBIDDEN", "You are not part of this order");
    }
  }

  private static async customerParticipant(
    customerId: string,
  ): Promise<IConversationParticipant> {
    const User = await getUserModel();

    const user = await User.findById(customerId)
      .select("_id firstName lastName institution")
      .lean<{
        _id: mongoose.Types.ObjectId;
        firstName: string;
        lastName: string;
        institution?: string;
      }>();

    if (!user) {
      throw new AppError("NOT_FOUND", "Customer not found");
    }

    const name = `${user.firstName} ${user.lastName}`.trim();

    return {
      kind: MessageParticipantKindEnum.User,
      id: user._id,
      unreadCount: 0,
      snapshot: {
        name,
        initials: initialsFrom(name),
        institution: user.institution,
      },
    };
  }

  private static async storeParticipant(
    storeId: string,
  ): Promise<IConversationParticipant> {
    const Store = await getStoreModel();

    const store = await Store.findById(storeId)
      .select("_id name institution verification")
      .lean<{
        _id: mongoose.Types.ObjectId;
        name: string;
        institution?: string;
        verification?: { isVerified?: boolean };
      }>();

    if (!store) {
      throw new AppError("NOT_FOUND", "Store not found");
    }

    return {
      kind: MessageParticipantKindEnum.Store,
      id: store._id,
      unreadCount: 0,
      snapshot: {
        name: store.name,
        initials: initialsFrom(store.name),
        institution: store.institution,
        isVerified: store.verification?.isVerified ?? false,
      },
    };
  }

  static readonly scopeKindForProduct = MessageScopeKindEnum.Product;
  static readonly scopeKindForOrder = MessageScopeKindEnum.Order;
}

/**
 * Avatar initials: first letters of the first two words, or the first two
 * characters of a single-word name.
 */
function initialsFrom(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);

  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

  return (words[0][0] + words[1][0]).toUpperCase();
}
