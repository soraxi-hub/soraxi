import type {
  ConversationInboxView,
  ConversationThreadView,
  MessagingIdentity,
  MessageView,
} from "@/domain/messaging/messaging-types";
import type { MessageScopeKindEnum } from "@/enums";

/**
 * The messaging system's public surface.
 *
 * Everything outside the messaging module — tRPC procedures, other services,
 * event handlers — talks to messaging through this interface and nothing else.
 * Callers never touch the repositories or the models directly.
 *
 * Keeping the surface this narrow is what makes the module replaceable: a
 * different storage engine, or a move to a separate service behind HTTP, is a
 * new implementation of this interface rather than a rewrite of every caller.
 */
export interface IMessagingService {
  /**
   * Opens a product enquiry thread, or returns the existing one.
   *
   * Idempotent per (customer, product): enquiring twice about the same item
   * lands the customer back in the conversation they already have rather than
   * fragmenting it.
   */
  openProductThread(input: {
    customerId: string;
    productId: string;
  }): Promise<{ conversationId: string }>;

  /**
   * Opens an order thread, or returns the existing one. Either party may
   * initiate, since both have a legitimate reason to raise an order.
   */
  openOrderThread(input: {
    subOrderId: string;
    initiator: MessagingIdentity;
  }): Promise<{ conversationId: string }>;

  /**
   * Appends a message and enqueues its side effects in one transaction.
   *
   * Returns as soon as the write commits — notification, moderation and audit
   * work happen off the request path via the outbox.
   */
  sendMessage(input: {
    conversationId: string;
    sender: MessagingIdentity;
    body: string;
    /** Optional product attached to this message alone, not the thread. */
    attachProductId?: string;
  }): Promise<MessageView>;

  /** Appends a platform notice. Never rate-limited; never notifies by email. */
  appendSystemMessage(input: {
    conversationId: string;
    systemType: string;
    body: string;
  }): Promise<void>;

  listInbox(input: {
    viewer: MessagingIdentity;
    scopeKind?: MessageScopeKindEnum;
    unreadOnly?: boolean;
    cursor?: Date;
    limit?: number;
  }): Promise<{ conversations: ConversationInboxView[]; nextCursor: string | null }>;

  getThread(input: {
    conversationId: string;
    viewer: MessagingIdentity;
    cursor?: string;
    limit?: number;
  }): Promise<ConversationThreadView>;

  markRead(input: {
    conversationId: string;
    viewer: MessagingIdentity;
  }): Promise<void>;

  /** Total unread across all threads — the "N new" badge. */
  totalUnread(viewer: MessagingIdentity): Promise<number>;
}
