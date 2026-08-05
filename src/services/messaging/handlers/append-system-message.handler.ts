import {
  ConversationStatusEnum,
  MessageOutboxEventEnum,
  MessageScopeKindEnum,
  SystemMessageTypeEnum,
} from "@/enums";
import type { IMessageOutboxEvent } from "@/lib/db/models/message-outbox.model";
import { ConversationRepository } from "@/repositories/conversation.repository";
import { MessageRepository } from "@/repositories/message.repository";

import { messagingService } from "../messaging.service";
import type { OutboxHandler } from "./types";

/**
 * Turns order, dispute and store events into system notices inside threads.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS HANDLER IS WHY THE EVENT BUS EXISTS
 * ─────────────────────────────────────────────────────────────────────────────
 * The order and dispute modules publish plain events and know nothing about
 * messaging. Everything that knows how to write into a conversation lives here.
 * That one-directional dependency is the boundary the whole design rests on —
 * without it, `updateDeliveryStatus` would have to import the messaging service
 * and the modules would be welded together.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * EXISTING THREADS ONLY
 * ─────────────────────────────────────────────────────────────────────────────
 * A notice is appended **only where a conversation already exists**. Creating a
 * thread to announce "your order shipped" would turn the inbox into a
 * notification feed and put an unread badge on a conversation nobody started.
 * Status updates already have a delivery channel: email. This is context for a
 * live conversation, nothing more.
 *
 * Idempotency: the drain guarantees at-least-once delivery, so a redelivered
 * event must not append the notice twice. Each notice is keyed by its event id
 * and skipped if already present.
 */
export class AppendSystemMessageHandler implements OutboxHandler {
  readonly name = "append-system-message";

  readonly handles = [
    MessageOutboxEventEnum.OrderStatusChanged,
    MessageOutboxEventEnum.DisputeOpened,
    MessageOutboxEventEnum.StoreSuspended,
    MessageOutboxEventEnum.StoreReinstated,
  ];

  async handle(event: IMessageOutboxEvent): Promise<void> {
    switch (event.type) {
      case MessageOutboxEventEnum.OrderStatusChanged:
        return this.onOrderStatusChanged(event);
      case MessageOutboxEventEnum.DisputeOpened:
        return this.onDisputeOpened(event);
      case MessageOutboxEventEnum.StoreSuspended:
        return this.onStoreSuspended(event);
      case MessageOutboxEventEnum.StoreReinstated:
        return this.onStoreReinstated(event);
      default:
        // Not ours. Returning normally completes the event rather than
        // retrying something no handler will ever accept.
        return;
    }
  }

  /**
   * Appends a notice to every thread scoped to a reference, skipping any that
   * already carry this event's notice.
   */
  private async appendToExistingThreads({
    scopeRefId,
    eventId,
    systemType,
    body,
  }: {
    scopeRefId: string;
    eventId: string;
    systemType: SystemMessageTypeEnum;
    body: string;
  }): Promise<void> {
    const conversations =
      await ConversationRepository.findByScopeRef(scopeRefId);

    // The common case by far: nobody ever messaged about this order. Nothing
    // to do, and explicitly not a reason to create a thread.
    if (conversations.length === 0) return;

    for (const conversation of conversations) {
      const conversationId = conversation._id.toString();

      const alreadyPosted = await MessageRepository.existsBySourceEvent(
        conversationId,
        eventId,
      );

      if (alreadyPosted) continue;

      await messagingService.appendSystemMessage({
        conversationId,
        systemType,
        body,
        sourceEventId: eventId,
      });
    }
  }

  private async onOrderStatusChanged(
    event: IMessageOutboxEvent,
  ): Promise<void> {
    const { subOrderId, statusLabel } = event.payload as {
      subOrderId: string;
      statusLabel: string;
    };

    await this.appendToExistingThreads({
      scopeRefId: subOrderId,
      eventId: event._id.toString(),
      systemType: SystemMessageTypeEnum.OrderStatusChanged,
      body: `This order is now "${statusLabel}".`,
    });
  }

  private async onDisputeOpened(event: IMessageOutboxEvent): Promise<void> {
    const { subOrderId } = event.payload as { subOrderId: string };

    await this.appendToExistingThreads({
      scopeRefId: subOrderId,
      eventId: event._id.toString(),
      systemType: SystemMessageTypeEnum.DisputeOpened,
      body: "A dispute was opened for this order. Our team is reviewing it.",
    });
  }

  /**
   * Locks the store's **product** threads and posts the notice there.
   *
   * Order threads are left open on purpose — see `setStatusForStore`. The
   * storefront promises that placed orders are unaffected by a suspension, and
   * a customer with money in escrow must keep the channel to chase delivery.
   */
  private async onStoreSuspended(event: IMessageOutboxEvent): Promise<void> {
    const { storeId } = event.payload as { storeId: string };

    await ConversationRepository.setStatusForStore(
      storeId,
      ConversationStatusEnum.Locked,
      "This store is suspended. You can't send new messages until the review is finished.",
      MessageScopeKindEnum.Product,
    );
  }

  private async onStoreReinstated(event: IMessageOutboxEvent): Promise<void> {
    const { storeId } = event.payload as { storeId: string };

    // Mirrors the suspension filter, so reinstatement reopens exactly what
    // suspension closed and nothing an admin locked by hand.
    await ConversationRepository.setStatusForStore(
      storeId,
      ConversationStatusEnum.Open,
      undefined,
      MessageScopeKindEnum.Product,
    );
  }
}
