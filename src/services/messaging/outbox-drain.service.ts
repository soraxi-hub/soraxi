import { MessageOutboxRepository } from "@/repositories/message-outbox.repository";

import { handlersFor } from "./handlers";

/**
 * Upper bound on events processed per run.
 *
 * A serverless invocation has a wall-clock limit, so the drain must stop
 * voluntarily rather than be killed mid-event. Anything left over is picked up
 * by the next run a minute later.
 */
const MAX_EVENTS_PER_RUN = 50;

export interface DrainSummary {
  claimed: number;
  succeeded: number;
  failed: number;
  /** Events still waiting after this run — a persistent backlog signal. */
  remaining: number;
}

/**
 * Drains pending messaging outbox events.
 *
 * The claim/dispatch/complete cycle is designed for a runtime that can vanish
 * mid-run:
 *
 *   - claiming is a single atomic `findOneAndUpdate`, so two concurrent runs
 *     can never take the same event;
 *   - a claim that outlives the visibility timeout is treated as abandoned and
 *     becomes eligible again, so a killed function strands nothing;
 *   - failures reschedule with backoff and park as `failed` once attempts are
 *     exhausted, so one poison event cannot spin forever behind the queue.
 *
 * Delivery is therefore **at-least-once**, and handlers must be idempotent.
 */
export class OutboxDrainService {
  static async run(): Promise<DrainSummary> {
    let claimed = 0;
    let succeeded = 0;
    let failed = 0;

    while (claimed < MAX_EVENTS_PER_RUN) {
      const event = await MessageOutboxRepository.claimNext();

      if (!event) break;

      claimed += 1;

      const handlers = handlersFor(event.type);

      // No consumer for this event type — complete it rather than retrying
      // forever against handlers that do not exist.
      if (handlers.length === 0) {
        await MessageOutboxRepository.markDone(event._id.toString());
        succeeded += 1;
        continue;
      }

      // Handlers are independent: one failing must not deprive the others of
      // their turn, so they are settled rather than raced.
      const results = await Promise.allSettled(
        handlers.map((handler) => handler.handle(event)),
      );

      const errors = results
        .filter(
          (r): r is PromiseRejectedResult => r.status === "rejected",
        )
        .map((r) =>
          r.reason instanceof Error ? r.reason.message : String(r.reason),
        );

      if (errors.length === 0) {
        await MessageOutboxRepository.markDone(event._id.toString());
        succeeded += 1;
      } else {
        await MessageOutboxRepository.markFailed(
          event._id.toString(),
          event.attempts,
          errors.join("; "),
        );
        failed += 1;
      }
    }

    const remaining = await MessageOutboxRepository.pendingCount();

    return { claimed, succeeded, failed, remaining };
  }
}
