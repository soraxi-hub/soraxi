import mongoose, { type ClientSession } from "mongoose";

import {
  getMessageOutboxModel,
  type IMessageOutboxEvent,
} from "@/lib/db/models/message-outbox.model";
import { MessageOutboxEventEnum, MessageOutboxStatusEnum } from "@/enums";

/** How long a claimed event may stay claimed before it is considered abandoned. */
const VISIBILITY_TIMEOUT_MS = 5 * 60 * 1000;

/** Backoff between retries, indexed by attempt count. */
const RETRY_BACKOFF_MS = [
  60 * 1000, // 1st retry: 1 minute
  5 * 60 * 1000, // 2nd: 5 minutes
  30 * 60 * 1000, // 3rd: 30 minutes
];

const MAX_ATTEMPTS = RETRY_BACKOFF_MS.length + 1;

/**
 * Persistence for the messaging outbox.
 *
 * The claim/complete/fail cycle here is what makes the outbox safe to drain
 * from a serverless function that might be killed mid-run.
 */
export class MessageOutboxRepository {
  /**
   * Enqueues an event. Always called with the session of the transaction that
   * is writing the message, so the event and the message commit together or
   * not at all.
   */
  static async enqueue(
    {
      type,
      payload,
      availableAt,
    }: {
      type: MessageOutboxEventEnum;
      payload: Record<string, unknown>;
      availableAt?: Date;
    },
    session?: ClientSession,
  ): Promise<void> {
    const Outbox = await getMessageOutboxModel();

    await Outbox.create(
      [
        {
          type,
          payload,
          status: MessageOutboxStatusEnum.Pending,
          availableAt: availableAt ?? new Date(),
          attempts: 0,
        },
      ],
      { session: session ?? undefined },
    );
  }

  /**
   * Atomically claims one due event, or returns null if none are ready.
   *
   * `findOneAndUpdate` means the claim is a single atomic operation: two
   * concurrent drains can never take the same event. Events claimed longer ago
   * than the visibility timeout are eligible again, so an event is never
   * stranded by a function that died between claiming and completing.
   */
  static async claimNext(): Promise<IMessageOutboxEvent | null> {
    const Outbox = await getMessageOutboxModel();
    const now = new Date();
    const abandonedBefore = new Date(now.getTime() - VISIBILITY_TIMEOUT_MS);

    return Outbox.findOneAndUpdate(
      {
        availableAt: { $lte: now },
        $or: [
          { status: MessageOutboxStatusEnum.Pending },
          {
            status: MessageOutboxStatusEnum.Processing,
            claimedAt: { $lt: abandonedBefore },
          },
        ],
      },
      {
        $set: {
          status: MessageOutboxStatusEnum.Processing,
          claimedAt: now,
        },
        $inc: { attempts: 1 },
      },
      { new: true, sort: { availableAt: 1 } },
    ).lean<IMessageOutboxEvent>();
  }

  static async markDone(eventId: string): Promise<void> {
    const Outbox = await getMessageOutboxModel();

    await Outbox.updateOne(
      { _id: new mongoose.Types.ObjectId(eventId) },
      {
        $set: { status: MessageOutboxStatusEnum.Done },
        $unset: { claimedAt: "" },
      },
    );
  }

  /**
   * Records a failed dispatch.
   *
   * Reschedules with backoff while attempts remain, and parks the event as
   * `failed` once they're exhausted — a poison event must not spin forever and
   * starve the queue behind it.
   */
  static async markFailed(
    eventId: string,
    attempts: number,
    error: string,
  ): Promise<void> {
    const Outbox = await getMessageOutboxModel();

    const exhausted = attempts >= MAX_ATTEMPTS;
    const backoff = RETRY_BACKOFF_MS[attempts - 1] ?? 0;

    await Outbox.updateOne(
      { _id: new mongoose.Types.ObjectId(eventId) },
      {
        $set: {
          status: exhausted
            ? MessageOutboxStatusEnum.Failed
            : MessageOutboxStatusEnum.Pending,
          availableAt: new Date(Date.now() + backoff),
          // Truncated: a stack trace should not be able to bloat the document.
          lastError: error.slice(0, 500),
        },
        $unset: { claimedAt: "" },
      },
    );
  }

  /** Counts by status, for the cron run summary. */
  static async pendingCount(): Promise<number> {
    const Outbox = await getMessageOutboxModel();

    return Outbox.countDocuments({
      status: MessageOutboxStatusEnum.Pending,
      availableAt: { $lte: new Date() },
    });
  }
}
