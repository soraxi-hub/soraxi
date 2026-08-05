import mongoose from "mongoose";

import { ConversationProjector } from "@/domain/messaging/conversation-projector";
import type {
  ConversationInboxView,
  ConversationThreadView,
  MessagingIdentity,
  MessageView,
} from "@/domain/messaging/messaging-types";
import {
  ConversationStatusEnum,
  MessageOutboxEventEnum,
  MessageParticipantKindEnum,
  MessageReportReasonEnum,
  MessageScopeKindEnum,
  ModerationFlagReasonEnum,
  SystemMessageTypeEnum,
} from "@/enums";
import type { IConversation } from "@/lib/db/models/conversation.model";
import { AppError } from "@/lib/errors/app-error";
import { checkRateLimit } from "@/lib/utils/rate-limiter";
import { ConversationRepository } from "@/repositories/conversation.repository";
import { MessageOutboxRepository } from "@/repositories/message-outbox.repository";
import { MessageRepository } from "@/repositories/message.repository";
import { ModerationFlagRepository } from "@/repositories/moderation-flag.repository";
import type { IMessagingService } from "@/services/interfaces/messaging-service.interface";
import { ThreadContextService } from "./boundary/thread-context.service";
import { detectContactDetails } from "./moderation/contact-detector";

/** Message sends allowed per identity per window. */
const SEND_LIMIT = 30;
const SEND_WINDOW_MS = 60 * 1000;

/** Reports allowed per identity per window. A report button is also a
 *  griefing tool, and a burst of them is itself a signal worth throttling. */
const REPORT_LIMIT = 5;
const REPORT_WINDOW_MS = 60 * 60 * 1000;

/** New threads allowed per identity per window — far tighter than replies. */
const OPEN_THREAD_LIMIT = 10;
const OPEN_THREAD_WINDOW_MS = 10 * 60 * 1000;

/**
 * Delay before a `message.sent` event becomes drainable.
 *
 * Holding it briefly lets a burst of rapid messages collapse into one
 * notification instead of three, which is the difference between a useful alert
 * and the reason someone mutes their email.
 */
const NOTIFY_DELAY_MS = 60 * 1000;

const INBOX_PAGE_SIZE = 20;
const THREAD_PAGE_SIZE = 30;
const PREVIEW_LENGTH = 120;

/**
 * The messaging system.
 *
 * Two rules shape everything here:
 *
 * 1. **Reads never leave messaging's own collections.** Products, orders, users
 *    and stores are read exactly once, at thread creation, through
 *    `ThreadContextService` — the single boundary file.
 *
 * 2. **Writes do the minimum on the request path.** `sendMessage` persists the
 *    message and enqueues an outbox event in one transaction, then returns.
 *    Email, moderation and audit work is drained by cron. Running them inline
 *    would bound send latency by the slowest SMTP handshake, and a nodemailer
 *    timeout would lose a message that was already written.
 */
export class MessagingService implements IMessagingService {
  // -------------------------------------------------------------------------
  // Thread creation
  // -------------------------------------------------------------------------

  async openProductThread({
    customerId,
    productId,
  }: {
    customerId: string;
    productId: string;
  }): Promise<{ conversationId: string }> {
    await this.assertCanOpenThread({
      kind: MessageParticipantKindEnum.User,
      id: customerId,
    });

    // Reopen rather than duplicate: a second enquiry about the same product
    // belongs in the thread that already exists.
    const existing = await ConversationRepository.findByScopeForParticipant(
      productId,
      customerId,
    );

    if (existing) return { conversationId: existing._id.toString() };

    const { participants, productRef } = await ThreadContextService.forProduct({
      customerId,
      productId,
    });

    const conversation = await ConversationRepository.create({
      participants,
      scope: {
        kind: MessageScopeKindEnum.Product,
        refId: new mongoose.Types.ObjectId(productId),
        product: productRef,
      },
      status: ConversationStatusEnum.Open,
      lastMessageAt: new Date(),
      lastMessagePreview: "",
    });

    return { conversationId: conversation._id.toString() };
  }

  async openOrderThread({
    subOrderId,
    initiator,
  }: {
    subOrderId: string;
    initiator: MessagingIdentity;
  }): Promise<{ conversationId: string }> {
    await this.assertCanOpenThread(initiator);

    const existing = await ConversationRepository.findByScopeForParticipant(
      subOrderId,
      initiator.id,
    );

    if (existing) return { conversationId: existing._id.toString() };

    const { participants, orderRef, customerId, storeId } =
      await ThreadContextService.forSubOrder(subOrderId);

    // Either party may open an order thread, but only those two parties.
    ThreadContextService.assertOrderParticipant(
      { customerId, storeId },
      initiator,
    );

    const conversation = await ConversationRepository.create({
      participants,
      scope: {
        kind: MessageScopeKindEnum.Order,
        refId: new mongoose.Types.ObjectId(subOrderId),
        order: orderRef,
      },
      status: ConversationStatusEnum.Open,
      lastMessageAt: new Date(),
      lastMessagePreview: "",
    });

    return { conversationId: conversation._id.toString() };
  }

  // -------------------------------------------------------------------------
  // Sending
  // -------------------------------------------------------------------------

  async sendMessage({
    conversationId,
    sender,
    body,
    attachProductId,
  }: {
    conversationId: string;
    sender: MessagingIdentity;
    body: string;
    attachProductId?: string;
  }): Promise<MessageView> {
    const trimmed = body.trim();

    if (!trimmed) {
      throw new AppError("BAD_REQUEST", "Message cannot be empty");
    }

    const conversation = await this.loadForParticipant(conversationId, sender.id);

    if (conversation.status !== ConversationStatusEnum.Open) {
      throw new AppError(
        "FORBIDDEN",
        conversation.lockedReason ?? "This conversation is closed",
      );
    }

    const limit = await checkRateLimit(
      `msg:send:${sender.kind}:${sender.id}`,
      SEND_LIMIT,
      SEND_WINDOW_MS,
    );

    if (!limit.allowed) {
      throw new AppError(
        "TOO_MANY_REQUESTS",
        `You're sending messages too quickly. Try again in ${limit.retryAfter}s.`,
      );
    }

    // A message may reference a product other than the thread's scope — the
    // composer's "Asking about …" chip. Snapshotted like any other reference.
    const productRef = attachProductId
      ? (
          await ThreadContextService.forProduct({
            customerId: conversation.participants.find(
              (p) => p.kind === MessageParticipantKindEnum.User,
            )!.id.toString(),
            productId: attachProductId,
          })
        ).productRef
      : undefined;

    const sentAt = new Date();
    const session = await mongoose.startSession();
    session.startTransaction();

    let committed: Awaited<ReturnType<typeof MessageRepository.create>>;

    try {
      const message = await MessageRepository.create(
        {
          conversationId: new mongoose.Types.ObjectId(conversationId),
          sender: {
            kind: sender.kind,
            id: new mongoose.Types.ObjectId(sender.id),
          },
          body: trimmed,
          ref: productRef ? { product: productRef } : undefined,
          createdAt: sentAt,
          updatedAt: sentAt,
        } as never,
        session,
      );

      await ConversationRepository.recordNewMessage(
        {
          conversationId,
          senderId: sender.id,
          preview: trimmed.slice(0, PREVIEW_LENGTH),
          sentAt,
        },
        session,
      );

      // Same transaction as the message: the notification intent cannot
      // survive a rolled-back message, and a committed message cannot lose its
      // notification.
      await MessageOutboxRepository.enqueue(
        {
          type: MessageOutboxEventEnum.MessageSent,
          payload: {
            conversationId,
            messageId: message._id.toString(),
            senderId: sender.id,
            senderKind: sender.kind,
          },
          availableAt: new Date(Date.now() + NOTIFY_DELAY_MS),
        },
        session,
      );

      await session.commitTransaction();
      committed = message;
    } catch (error) {
      // Only abort a transaction that is still open. Aborting a committed one
      // throws its own error and would mask whatever actually went wrong.
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      await session.endSession();
    }

    // Moderation scan. Runs after the commit and never blocks or alters the
    // message: detection is a prior for a human reviewer, not a verdict, and
    // "0803… call when you reach the gate" is a perfectly ordinary thing to
    // send on a campus marketplace. The sender is not told, deliberately — a
    // warning would teach evaders exactly what to avoid.
    //
    // Failures are swallowed: a moderation queue that is briefly incomplete is
    // a much smaller problem than a delivered message reported as failed.
    const detection = detectContactDetails(trimmed);

    if (detection.flagged) {
      try {
        await ModerationFlagRepository.flag(conversationId, {
          reason: ModerationFlagReasonEnum.ContactDetails,
          messageId: committed._id,
          signals: detection.signals,
        });
      } catch (error) {
        console.error("[messaging] failed to record moderation flag", error);
      }
    }

    // Projection happens after the transaction closes, deliberately. It is
    // pure formatting with no database work, and running it inside the try
    // block would let a rendering slip trigger a rollback of a message that
    // was already durably written.
    const counterpart = ConversationRepository.counterpartOf(
      conversation,
      sender.id,
    );

    return ConversationProjector.toMessageView(
      committed,
      sender.id,
      counterpart?.lastReadAt,
    );
  }

  /**
   * Appends a platform notice — escrow reminders, dispute updates, status
   * changes.
   *
   * Not rate-limited and never enqueues a notification: these are context, not
   * correspondence, and emailing someone because their order status changed is
   * the job of the order module's own notifications, not messaging's.
   */
  async appendSystemMessage({
    conversationId,
    systemType,
    body,
    sourceEventId,
  }: {
    conversationId: string;
    systemType: string;
    body: string;
    /** Outbox event that produced this notice — the idempotency key. */
    sourceEventId?: string;
  }): Promise<void> {
    const conversation = await ConversationRepository.findById(conversationId);

    if (!conversation) {
      throw new AppError("NOT_FOUND", "Conversation not found");
    }

    const sentAt = new Date();

    await MessageRepository.create({
      conversationId: new mongoose.Types.ObjectId(conversationId),
      // System messages are attributed to the platform, so the sender id is the
      // conversation itself — never a participant, who must not appear to have
      // said something they did not.
      sender: {
        kind: MessageParticipantKindEnum.Admin,
        id: conversation._id,
      },
      body,
      systemType: systemType as SystemMessageTypeEnum,
      ...(sourceEventId
        ? { sourceEventId: new mongoose.Types.ObjectId(sourceEventId) }
        : {}),
      createdAt: sentAt,
      updatedAt: sentAt,
    } as never);

    await ConversationRepository.recordNewMessage({
      conversationId,
      // No sender to exclude: a notice is unread for everyone.
      senderId: new mongoose.Types.ObjectId().toString(),
      preview: body.slice(0, PREVIEW_LENGTH),
      sentAt,
    });
  }

  /**
   * Records a user's report against a conversation.
   *
   * The reporter must be a participant — checked via `loadForParticipant`, so
   * nobody can report a thread they cannot see, and the check doubles as the
   * access guard.
   *
   * Reporting does **not** lock the thread. An accusation is not a finding, and
   * letting one party mute the other by pressing a button would itself be an
   * abuse vector — locking is a moderator's decision.
   *
   * Rate-limited, because a report button is also a griefing tool.
   */
  async reportConversation({
    conversationId,
    reporter,
    reason,
    note,
    messageId,
  }: {
    conversationId: string;
    reporter: MessagingIdentity;
    reason: MessageReportReasonEnum;
    note?: string;
    messageId?: string;
  }): Promise<void> {
    await this.loadForParticipant(conversationId, reporter.id);

    const limit = await checkRateLimit(
      `msg:report:${reporter.kind}:${reporter.id}`,
      REPORT_LIMIT,
      REPORT_WINDOW_MS,
    );

    if (!limit.allowed) {
      throw new AppError(
        "TOO_MANY_REQUESTS",
        "You've reported several conversations recently. Try again shortly.",
      );
    }

    await ModerationFlagRepository.flag(conversationId, {
      reason: ModerationFlagReasonEnum.UserReport,
      reportReason: reason,
      note,
      ...(messageId
        ? { messageId: new mongoose.Types.ObjectId(messageId) }
        : {}),
      reportedBy: {
        kind: reporter.kind,
        id: new mongoose.Types.ObjectId(reporter.id),
      },
    });
  }

  // -------------------------------------------------------------------------
  // Reading
  // -------------------------------------------------------------------------

  async listInbox({
    viewer,
    scopeKind,
    unreadOnly = false,
    cursor,
    limit = INBOX_PAGE_SIZE,
  }: {
    viewer: MessagingIdentity;
    scopeKind?: MessageScopeKindEnum;
    unreadOnly?: boolean;
    cursor?: Date;
    limit?: number;
  }): Promise<{
    conversations: ConversationInboxView[];
    nextCursor: string | null;
  }> {
    const conversations = await ConversationRepository.listForParticipant({
      participantId: viewer.id,
      scopeKind,
      unreadOnly,
      cursor,
      limit,
    });

    const views = conversations.map((c) =>
      ConversationProjector.toInboxView(c, viewer.id),
    );

    // Only a full page implies more; a short page is the end of the list.
    const nextCursor =
      conversations.length === limit && conversations.length > 0
        ? new Date(
            conversations[conversations.length - 1].lastMessageAt,
          ).toISOString()
        : null;

    return { conversations: views, nextCursor };
  }

  async getThread({
    conversationId,
    viewer,
    cursor,
    limit = THREAD_PAGE_SIZE,
  }: {
    conversationId: string;
    viewer: MessagingIdentity;
    cursor?: string;
    limit?: number;
  }): Promise<ConversationThreadView> {
    const conversation = await this.loadForParticipant(
      conversationId,
      viewer.id,
    );

    const messages = await MessageRepository.listByConversation({
      conversationId,
      cursor,
      limit,
    });

    return ConversationProjector.toThreadView({
      conversation,
      messages,
      viewerId: viewer.id,
      pageSize: limit,
    });
  }

  async markRead({
    conversationId,
    viewer,
  }: {
    conversationId: string;
    viewer: MessagingIdentity;
  }): Promise<void> {
    await this.loadForParticipant(conversationId, viewer.id);
    await ConversationRepository.markRead(conversationId, viewer.id);
  }

  async totalUnread(viewer: MessagingIdentity): Promise<number> {
    return ConversationRepository.totalUnreadForParticipant(viewer.id);
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  /**
   * Loads a conversation and confirms the caller is in it.
   *
   * Returns NOT_FOUND rather than FORBIDDEN for a conversation the caller is
   * not part of: telling a stranger that a specific conversation exists is
   * itself a disclosure.
   */
  private async loadForParticipant(
    conversationId: string,
    participantId: string,
  ): Promise<IConversation> {
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      throw new AppError("BAD_REQUEST", "Invalid conversation id");
    }

    const conversation = await ConversationRepository.findById(conversationId);

    if (!conversation) {
      throw new AppError("NOT_FOUND", "Conversation not found");
    }

    if (!ConversationRepository.participantOf(conversation, participantId)) {
      throw new AppError("NOT_FOUND", "Conversation not found");
    }

    return conversation;
  }

  private async assertCanOpenThread(
    identity: MessagingIdentity,
  ): Promise<void> {
    const limit = await checkRateLimit(
      `msg:open:${identity.kind}:${identity.id}`,
      OPEN_THREAD_LIMIT,
      OPEN_THREAD_WINDOW_MS,
    );

    if (!limit.allowed) {
      throw new AppError(
        "TOO_MANY_REQUESTS",
        `You've started too many conversations. Try again in ${limit.retryAfter}s.`,
      );
    }
  }
}

export const messagingService = new MessagingService();
