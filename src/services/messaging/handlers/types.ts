import type { MessageOutboxEventEnum } from "@/enums";
import type { IMessageOutboxEvent } from "@/lib/db/models/message-outbox.model";

/**
 * A consumer of messaging outbox events.
 *
 * Handlers are **registered**, never called from the send path. Adding push
 * notifications, digest emails, moderation scanning or an analytics webhook
 * means writing one of these and listing it in the registry — `sendMessage`
 * is never edited again. That is the whole point of the outbox.
 *
 * Handlers must be **idempotent**. The drain guarantees at-least-once delivery,
 * not exactly-once: a function killed after doing its work but before marking
 * the event done will see that event again.
 */
export interface OutboxHandler {
  /** Stable identifier, used in logs and run summaries. */
  readonly name: string;

  /** Event types this handler consumes. */
  readonly handles: MessageOutboxEventEnum[];

  /**
   * Processes one event.
   *
   * Throwing schedules a retry with backoff. Returning normally — including
   * deciding there is nothing to do — completes the event.
   */
  handle(event: IMessageOutboxEvent): Promise<void>;
}
