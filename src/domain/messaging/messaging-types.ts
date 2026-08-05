import type { MessageParticipantKindEnum } from "@/enums";

/**
 * An actor in the messaging system.
 *
 * Always a `(kind, id)` pair, never a bare id: a vendor on this platform is
 * also a user, and the tRPC context resolves user, store and admin identities
 * from three separate cookies. Passing a lone id anywhere in messaging would
 * make "who is this?" ambiguous.
 */
export interface MessagingIdentity {
  kind: MessageParticipantKindEnum;
  id: string;
}

/** Client-facing product reference card. */
export interface ProductRefView {
  productId: string;
  name: string;
  image?: string;
  /** Preformatted — the client never does money arithmetic. */
  formattedPrice: string;
}

/** Client-facing order reference card. */
export interface OrderRefView {
  subOrderId: string;
  /** Derived display reference, e.g. `ORD-2026-68A76`. */
  orderNumber: string;
  status: string;
  formattedTotal: string;
  itemCount: number;
  placedAt: string;
  thumbnails: string[];
}

/** The other party, as shown in an inbox row and thread header. */
export interface CounterpartView {
  kind: MessageParticipantKindEnum;
  id: string;
  name: string;
  initials: string;
  institution?: string;
  isVerified?: boolean;
  /** Approximate — derived from `lastSeenAt` within a few minutes. */
  isOnline?: boolean;
}

/** One row in the inbox list. */
export interface ConversationInboxView {
  conversationId: string;
  counterpart: CounterpartView;
  scopeKind: string;
  /** Context chip under the preview — the product name or order reference. */
  contextLabel: string;
  product?: ProductRefView;
  order?: OrderRefView;
  lastMessagePreview: string;
  lastMessageAt: string;
  unreadCount: number;
}

/** One message in a thread. */
export interface MessageView {
  messageId: string;
  body: string;
  /** True when the viewer sent it — drives bubble side and colour. */
  isOwn: boolean;
  /**
   * Whether the counterpart has read it. Derived from their `lastReadAt`, not
   * stored per message. Always false for messages the viewer received.
   */
  isRead: boolean;
  systemType?: string;
  product?: ProductRefView;
  order?: OrderRefView;
  createdAt: string;
}

/** A thread, as delivered to one side. */
export interface ConversationThreadView {
  conversationId: string;
  counterpart: CounterpartView;
  scopeKind: string;
  product?: ProductRefView;
  order?: OrderRefView;
  status: string;
  /** Present when locked; rendered in place of the composer. */
  lockedReason?: string;
  /** False when the thread is locked or archived. */
  canSend: boolean;
  messages: MessageView[];
  /** `_id` of the oldest message returned, or null when history is exhausted. */
  nextCursor: string | null;
}
