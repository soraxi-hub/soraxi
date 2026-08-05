import { MessageOutboxEventEnum } from "@/enums";
import { MessageOutboxRepository } from "@/repositories/message-outbox.repository";

/**
 * The publish side of the messaging event bus.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FOR CALLERS OUTSIDE MESSAGING
 * ─────────────────────────────────────────────────────────────────────────────
 * This is the **only** thing the order, dispute and admin modules import from
 * messaging. They announce that something happened; they do not know whether a
 * conversation exists, what a system notice looks like, or that messaging is
 * even installed. A registered handler decides all of that.
 *
 * Every function here is **fire-and-forget and never throws**. Publishing is a
 * side effect of an already-committed business action — an order really did
 * ship, a dispute really was opened — and a messaging hiccup must never fail
 * or roll back that action. A dropped notice is a cosmetic loss; a failed
 * status update is a real one.
 *
 * Call these *after* the business transaction commits, not inside it: an event
 * for a rolled-back action would announce something that never happened.
 */
async function publish(
  type: MessageOutboxEventEnum,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    await MessageOutboxRepository.enqueue({ type, payload });
  } catch (error) {
    console.error(`[messaging] failed to publish ${type}`, error);
  }
}

export const MessagingEvents = {
  /**
   * A sub-order's delivery status changed.
   *
   * `statusLabel` is passed already humanised so the handler never has to
   * import the order module's formatting — the payload is self-contained.
   */
  orderStatusChanged(input: {
    subOrderId: string;
    orderId: string;
    statusLabel: string;
  }): Promise<void> {
    return publish(MessageOutboxEventEnum.OrderStatusChanged, input);
  },

  disputeOpened(input: {
    subOrderId: string;
    disputeId: string;
  }): Promise<void> {
    return publish(MessageOutboxEventEnum.DisputeOpened, input);
  },

  storeSuspended(input: { storeId: string }): Promise<void> {
    return publish(MessageOutboxEventEnum.StoreSuspended, input);
  },

  storeReinstated(input: { storeId: string }): Promise<void> {
    return publish(MessageOutboxEventEnum.StoreReinstated, input);
  },
};
