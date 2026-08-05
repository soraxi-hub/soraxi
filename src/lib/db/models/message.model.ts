import mongoose, { Schema, type Document, type Model } from "mongoose";
import { connectToDatabase } from "../mongoose";
import {
  MessageParticipantKindEnum,
  SystemMessageTypeEnum,
} from "@/enums";
import {
  type IOrderRef,
  type IProductRef,
} from "./conversation.model";

/**
 * A single message within a conversation.
 *
 * **Messages live in their own collection, never embedded in the conversation
 * document.** Embedding is the standard mistake here: MongoDB caps a document
 * at 16MB, which turns a long-running thread into a bounded resource that fails
 * in production, and every conversation read would drag the entire history over
 * the wire regardless of how much of it the client needs.
 *
 * **There is no per-message read flag.** Whether a message has been read is
 * derived at projection time from the recipient's `lastReadAt` on the
 * conversation: read if `lastReadAt >= createdAt`. Storing it per message would
 * mean a write per message per read — the most expensive thing a chat schema
 * can do, for information a single timestamp already implies.
 *
 * `_id` doubles as the pagination cursor. ObjectIds are monotonically
 * increasing, so `{ conversationId, _id: { $lt: cursor } }` is an index range
 * scan that costs the same at message 900 as at message 10 — unlike `skip`,
 * which walks every skipped document server-side.
 */
export interface IMessage {
  _id: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  sender: {
    kind: MessageParticipantKindEnum;
    id: mongoose.Types.ObjectId;
  };
  body: string;
  /**
   * Optional reference attached to this specific message.
   *
   * Independent of the conversation's scope: a customer can ask about a
   * different product from inside an order thread, and the composer attaches
   * that product to the message alone.
   */
  ref?: {
    product?: IProductRef;
    order?: IOrderRef;
  };
  /**
   * Set for platform-generated notices. When present, `sender` is the system
   * and the UI renders a centred notice rather than a chat bubble.
   */
  systemType?: SystemMessageTypeEnum;
  /**
   * The outbox event that produced this notice, for system messages only.
   *
   * The drain guarantees at-least-once delivery, so a handler that succeeded
   * but died before marking its event done will run again. This is the
   * idempotency key that stops a redelivered event posting the same notice
   * twice.
   */
  sourceEventId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type IMessageDocument = IMessage & Document;

const MessageSchema = new Schema<IMessageDocument>(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    sender: {
      kind: {
        type: String,
        required: true,
        enum: Object.values(MessageParticipantKindEnum),
      },
      id: { type: mongoose.Schema.Types.ObjectId, required: true },
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: [4000, "Message is too long"],
    },
    ref: {
      product: { type: Schema.Types.Mixed },
      order: { type: Schema.Types.Mixed },
    },
    systemType: {
      type: String,
      enum: Object.values(SystemMessageTypeEnum),
    },
    sourceEventId: {
      type: mongoose.Schema.Types.ObjectId,
    },
  },
  { timestamps: true },
);

// Thread history, newest first — the only way messages are ever read.
MessageSchema.index({ conversationId: 1, _id: -1 });

// Idempotency lookup for redelivered outbox events. Sparse: only system
// notices carry a source event, and they are a small minority of messages.
MessageSchema.index(
  { conversationId: 1, sourceEventId: 1 },
  { sparse: true },
);

export async function getMessageModel(): Promise<Model<IMessageDocument>> {
  await connectToDatabase();
  return (
    (mongoose.models.Message as Model<IMessageDocument>) ||
    mongoose.model<IMessageDocument>("Message", MessageSchema)
  );
}
