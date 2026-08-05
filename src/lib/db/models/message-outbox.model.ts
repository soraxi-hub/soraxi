import mongoose, { Schema, type Document, type Model } from "mongoose";
import { connectToDatabase } from "../mongoose";
import { MessageOutboxEventEnum, MessageOutboxStatusEnum } from "@/enums";

/**
 * Transactional outbox for messaging side effects.
 *
 * Sending a message must do two things on the request path and no more:
 * persist the message, and record the *intent* to notify. Email delivery,
 * moderation scanning and audit logging are consequences of a message, not part
 * of sending one. Run inline, they would bound send latency by the slowest SMTP
 * handshake, and a nodemailer timeout would lose a message already written.
 *
 * The row is inserted **in the same MongoDB transaction as the message**, so
 * the two can never disagree: no message without its notification intent, and
 * no notification for a message that rolled back.
 *
 * A cron job drains pending events and dispatches them to registered handlers
 * (`src/services/messaging/handlers/`). Adding a consumer — push notifications,
 * digests, webhooks — means adding a handler file; the send path is never
 * edited again.
 *
 * Vercel cron is the trigger rather than a hosted queue because the
 * infrastructure already exists here and the drain loop is the same code a
 * queue worker would run. Moving to QStash or Inngest later changes the
 * trigger, not the handlers.
 */
export interface IMessageOutboxEvent {
  _id: mongoose.Types.ObjectId;
  type: MessageOutboxEventEnum;
  /** Event payload — ids only; handlers re-read what they need. */
  payload: Record<string, unknown>;
  status: MessageOutboxStatusEnum;
  /**
   * Earliest time this event may be claimed. Used for retry backoff, and to
   * hold `message.sent` events briefly so a burst of rapid replies can be
   * collapsed into one notification rather than several.
   */
  availableAt: Date;
  attempts: number;
  lastError?: string;
  /**
   * Set when a worker claims the event. A claim older than the visibility
   * timeout is treated as abandoned and may be re-claimed, so an event is never
   * stranded by a function that died mid-dispatch.
   */
  claimedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type IMessageOutboxEventDocument = IMessageOutboxEvent & Document;

const MessageOutboxSchema = new Schema<IMessageOutboxEventDocument>(
  {
    type: {
      type: String,
      required: true,
      enum: Object.values(MessageOutboxEventEnum),
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(MessageOutboxStatusEnum),
      default: MessageOutboxStatusEnum.Pending,
    },
    availableAt: { type: Date, required: true, default: Date.now },
    attempts: { type: Number, required: true, default: 0 },
    lastError: String,
    claimedAt: Date,
  },
  { timestamps: true },
);

// The drain query: pending (or abandoned) events that are due.
MessageOutboxSchema.index({ status: 1, availableAt: 1 });

export async function getMessageOutboxModel(): Promise<
  Model<IMessageOutboxEventDocument>
> {
  await connectToDatabase();
  return (
    (mongoose.models.MessageOutboxEvent as Model<IMessageOutboxEventDocument>) ||
    mongoose.model<IMessageOutboxEventDocument>(
      "MessageOutboxEvent",
      MessageOutboxSchema,
    )
  );
}
