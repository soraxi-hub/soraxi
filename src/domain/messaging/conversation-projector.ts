import type {
  IConversation,
  IOrderRef,
  IProductRef,
} from "@/lib/db/models/conversation.model";
import type { IMessage } from "@/lib/db/models/message.model";
import { ConversationStatusEnum } from "@/enums";
import { formatNaira } from "@/lib/utils/naira";
import { formatOrderNumber } from "@/lib/utils/order-number";
import { ConversationRepository } from "@/repositories/conversation.repository";

import type {
  ConversationInboxView,
  ConversationThreadView,
  CounterpartView,
  MessageView,
  OrderRefView,
  ProductRefView,
} from "./messaging-types";

/** An identity is treated as online if seen within this window. */
const ONLINE_WINDOW_MS = 5 * 60 * 1000;

/**
 * Projects conversation documents into the shapes the client renders.
 *
 * These projections are an **allow-list**, not a filter. A conversation
 * document holds both participants' ids, read state and unread counters; each
 * side must receive only its own, plus the counterpart's public snapshot. New
 * fields added to the model stay private until deliberately projected here.
 *
 * Everything is rendered from the conversation and message documents alone —
 * no lookups into products, orders, users or stores. That is what makes an
 * inbox listing a single indexed query.
 */
export class ConversationProjector {
  static productRef(ref: IProductRef): ProductRefView {
    return {
      productId: ref.productId.toString(),
      name: ref.name,
      image: ref.image,
      formattedPrice: formatNaira(ref.price),
    };
  }

  static orderRef(ref: IOrderRef): OrderRefView {
    return {
      subOrderId: ref.subOrderId.toString(),
      // Derived, never stored — nothing to drift out of sync with the order.
      orderNumber: formatOrderNumber(ref.subOrderId.toString(), ref.placedAt),
      status: ref.status,
      formattedTotal: formatNaira(ref.total),
      itemCount: ref.itemCount,
      placedAt: new Date(ref.placedAt).toISOString(),
      thumbnails: ref.thumbnails,
    };
  }

  private static counterpart(
    conversation: IConversation,
    viewerId: string,
    lastSeenAt?: Date,
  ): CounterpartView {
    const other = ConversationRepository.counterpartOf(conversation, viewerId);

    if (!other) {
      // Should be unreachable: access is checked before projection.
      throw new Error("Conversation has no counterpart for this viewer");
    }

    return {
      kind: other.kind,
      id: other.id.toString(),
      name: other.snapshot.name,
      initials: other.snapshot.initials,
      institution: other.snapshot.institution,
      isVerified: other.snapshot.isVerified,
      isOnline: lastSeenAt
        ? Date.now() - new Date(lastSeenAt).getTime() < ONLINE_WINDOW_MS
        : undefined,
    };
  }

  /**
   * The context chip shown under an inbox row's preview.
   *
   * Order threads show the reference and total, matching what the vendor and
   * customer both search by; product threads show the product name.
   */
  private static contextLabel(conversation: IConversation): string {
    const { product, order } = conversation.scope;

    if (product) return product.name;

    if (order) {
      const ref = formatOrderNumber(order.subOrderId.toString(), order.placedAt);
      return `${ref} · ${formatNaira(order.total)}`;
    }

    return "";
  }

  static toInboxView(
    conversation: IConversation,
    viewerId: string,
    counterpartLastSeenAt?: Date,
  ): ConversationInboxView {
    const me = ConversationRepository.participantOf(conversation, viewerId);

    return {
      conversationId: conversation._id.toString(),
      counterpart: this.counterpart(
        conversation,
        viewerId,
        counterpartLastSeenAt,
      ),
      scopeKind: conversation.scope.kind,
      contextLabel: this.contextLabel(conversation),
      product: conversation.scope.product
        ? this.productRef(conversation.scope.product)
        : undefined,
      order: conversation.scope.order
        ? this.orderRef(conversation.scope.order)
        : undefined,
      lastMessagePreview: conversation.lastMessagePreview,
      lastMessageAt: new Date(conversation.lastMessageAt).toISOString(),
      unreadCount: me?.unreadCount ?? 0,
    };
  }

  /**
   * Projects one message for one viewer.
   *
   * `isRead` is computed from the counterpart's `lastReadAt` rather than read
   * from the message — there is no per-message read state, by design. It is
   * only meaningful for the viewer's own messages: a receipt on a message you
   * received would be telling you what you already know.
   */
  static toMessageView(
    message: IMessage,
    viewerId: string,
    counterpartLastReadAt?: Date,
  ): MessageView {
    const isOwn = message.sender.id.toString() === viewerId;

    const isRead =
      isOwn && counterpartLastReadAt
        ? new Date(counterpartLastReadAt).getTime() >=
          new Date(message.createdAt).getTime()
        : false;

    return {
      messageId: message._id.toString(),
      body: message.body,
      isOwn,
      isRead,
      systemType: message.systemType,
      product: message.ref?.product
        ? this.productRef(message.ref.product)
        : undefined,
      order: message.ref?.order ? this.orderRef(message.ref.order) : undefined,
      createdAt: new Date(message.createdAt).toISOString(),
    };
  }

  static toThreadView({
    conversation,
    messages,
    viewerId,
    counterpartLastSeenAt,
    pageSize,
  }: {
    conversation: IConversation;
    messages: IMessage[];
    viewerId: string;
    counterpartLastSeenAt?: Date;
    pageSize: number;
  }): ConversationThreadView {
    const other = ConversationRepository.counterpartOf(conversation, viewerId);

    // Only a full page implies there may be more; a short page is the end of
    // history, and returning a cursor there would cost an extra empty request.
    const nextCursor =
      messages.length === pageSize && messages.length > 0
        ? messages[messages.length - 1]._id.toString()
        : null;

    return {
      conversationId: conversation._id.toString(),
      counterpart: this.counterpart(
        conversation,
        viewerId,
        counterpartLastSeenAt,
      ),
      scopeKind: conversation.scope.kind,
      product: conversation.scope.product
        ? this.productRef(conversation.scope.product)
        : undefined,
      order: conversation.scope.order
        ? this.orderRef(conversation.scope.order)
        : undefined,
      status: conversation.status,
      lockedReason: conversation.lockedReason,
      canSend: conversation.status === ConversationStatusEnum.Open,
      // Repository returns newest-first for the index; the UI reads oldest-first.
      messages: messages
        .slice()
        .reverse()
        .map((m) => this.toMessageView(m, viewerId, other?.lastReadAt)),
      nextCursor,
    };
  }
}
