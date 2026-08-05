import mongoose, { Schema, type Document, type Model } from "mongoose";
import { connectToDatabase } from "../mongoose";
import {
  ConversationStatusEnum,
  MessageScopeKindEnum,
  MessageParticipantKindEnum,
} from "@/enums";

/**
 * Conversation — a single messaging thread between a customer and a store,
 * scoped to one product enquiry or one sub-order.
 *
 * Design notes that matter:
 *
 * 1. **Snapshots, not references.** Everything needed to render an inbox row or
 *    a thread header lives on this document. Listing a user's inbox is a single
 *    indexed query with no `$lookup` into users, stores, products or orders.
 *    A vendor renaming a product cannot retroactively change what an existing
 *    enquiry was about.
 *
 * 2. **Participants are `(kind, id)` pairs**, never bare user ids. A vendor is
 *    also a user on this platform, and the tRPC context resolves user, store
 *    and admin identities from three separate cookies. A single `userId` would
 *    be ambiguous. It also means an admin can join a thread for dispute
 *    mediation later with no schema change.
 *
 * 3. **Unread counts are denormalised per participant.** Counting unread
 *    messages per conversation on every inbox load is what makes messaging
 *    features fall over. The counter is `$inc`'d for the recipient on write,
 *    so reading it is free.
 *
 * Messages are NOT embedded here — see `message.model.ts` for why.
 */

/** Frozen product details, captured when the reference is attached. */
export interface IProductRef {
  productId: mongoose.Types.ObjectId;
  name: string;
  image?: string;
  /** Kobo, matching the platform-wide money convention. */
  price: number;
}

/** Frozen sub-order details, captured when the reference is attached. */
export interface IOrderRef {
  subOrderId: mongoose.Types.ObjectId;
  /**
   * Delivery status *at the time of attachment*. The pinned header re-renders
   * live status; this preserves what was true when the message was sent.
   */
  status: string;
  /** Kobo. */
  total: number;
  itemCount: number;
  placedAt: Date;
  /** Product images for the card; the UI shows three and a "+N" overflow. */
  thumbnails: string[];
}

/**
 * A participant's own snapshot — name and identity as shown to the other side.
 * Held per participant so either inbox renders from this document alone.
 */
export interface IParticipantSnapshot {
  name: string;
  /** Avatar fallback, e.g. "CT" for "Campus Tech Hub". */
  initials: string;
  /** e.g. "UNICAL". Absent until the identity has an institution set. */
  institution?: string;
  /** Store verification tick. Undefined for customers. */
  isVerified?: boolean;
}

export interface IConversationParticipant {
  kind: MessageParticipantKindEnum;
  id: mongoose.Types.ObjectId;
  lastReadAt?: Date;
  unreadCount: number;
  snapshot: IParticipantSnapshot;
}

export interface IConversation {
  _id: mongoose.Types.ObjectId;
  participants: IConversationParticipant[];
  scope: {
    kind: MessageScopeKindEnum;
    /** productId for product scope, subOrderId for order scope. */
    refId: mongoose.Types.ObjectId;
    product?: IProductRef;
    order?: IOrderRef;
  };
  status: ConversationStatusEnum;
  /** Shown in place of the composer when the thread is locked. */
  lockedReason?: string;
  lastMessageAt: Date;
  /** Denormalised for the inbox row; avoids reading the messages collection. */
  lastMessagePreview: string;
  createdAt: Date;
  updatedAt: Date;
}

export type IConversationDocument = IConversation & Document;

const ProductRefSchema = new Schema<IProductRef>(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    image: String,
    price: { type: Number, required: true },
  },
  { _id: false },
);

const OrderRefSchema = new Schema<IOrderRef>(
  {
    subOrderId: { type: mongoose.Schema.Types.ObjectId, required: true },
    status: { type: String, required: true },
    total: { type: Number, required: true },
    itemCount: { type: Number, required: true },
    placedAt: { type: Date, required: true },
    thumbnails: { type: [String], default: [] },
  },
  { _id: false },
);

const ParticipantSchema = new Schema<IConversationParticipant>(
  {
    kind: {
      type: String,
      required: true,
      enum: Object.values(MessageParticipantKindEnum),
    },
    id: { type: mongoose.Schema.Types.ObjectId, required: true },
    lastReadAt: Date,
    unreadCount: { type: Number, default: 0, min: 0 },
    snapshot: {
      name: { type: String, required: true },
      initials: { type: String, required: true },
      institution: String,
      isVerified: Boolean,
    },
  },
  { _id: false },
);

const ConversationSchema = new Schema<IConversationDocument>(
  {
    participants: {
      type: [ParticipantSchema],
      required: true,
      validate: {
        validator: (p: IConversationParticipant[]) => p.length >= 2,
        message: "A conversation needs at least two participants",
      },
    },
    scope: {
      kind: {
        type: String,
        required: true,
        enum: Object.values(MessageScopeKindEnum),
      },
      refId: { type: mongoose.Schema.Types.ObjectId, required: true },
      product: ProductRefSchema,
      order: OrderRefSchema,
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(ConversationStatusEnum),
      default: ConversationStatusEnum.Open,
    },
    lockedReason: String,
    lastMessageAt: { type: Date, required: true, default: Date.now },
    lastMessagePreview: { type: String, default: "" },
  },
  { timestamps: true },
);

// Inbox listing, newest first — the hot read path.
ConversationSchema.index({ "participants.id": 1, lastMessageAt: -1 });

// The Products / Orders inbox filter tabs.
ConversationSchema.index({
  "participants.id": 1,
  "scope.kind": 1,
  lastMessageAt: -1,
});

// Reopening an existing thread instead of creating a duplicate when a customer
// enquires about the same product twice.
ConversationSchema.index({ "scope.refId": 1, "participants.id": 1 });

export async function getConversationModel(): Promise<
  Model<IConversationDocument>
> {
  await connectToDatabase();
  return (
    (mongoose.models.Conversation as Model<IConversationDocument>) ||
    mongoose.model<IConversationDocument>("Conversation", ConversationSchema)
  );
}
