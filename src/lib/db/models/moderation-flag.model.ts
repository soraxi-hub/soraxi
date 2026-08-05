import mongoose, { Schema, type Document, type Model } from "mongoose";

import {
  MessageReportReasonEnum,
  ModerationFlagReasonEnum,
  ModerationReviewStatusEnum,
} from "@/enums";
import { connectToDatabase } from "../mongoose";

/**
 * One entry in a flag's history — either a user report or a machine detection.
 */
export interface IModerationFlagEntry {
  reason: ModerationFlagReasonEnum;
  /** The message that triggered it, when there was one. */
  messageId?: mongoose.Types.ObjectId;
  /** Who reported, for user reports. Absent for machine detections. */
  reportedBy?: {
    kind: string;
    id: mongoose.Types.ObjectId;
  };
  /** User-selected category, for user reports. */
  reportReason?: MessageReportReasonEnum;
  /** Free-text detail supplied by the reporter. */
  note?: string;
  /** Which detector signals fired, for machine detections. */
  signals?: string[];
  createdAt: Date;
}

/**
 * A conversation needing moderator attention.
 *
 * **One document per conversation, not per incident.** A vendor who solicits
 * off-platform payment ten times is one problem to review, not ten queue
 * entries — so repeat flags push onto `entries` rather than creating rows. The
 * unique index on `conversationId` enforces that.
 */
export interface IModerationFlag {
  _id: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  entries: IModerationFlagEntry[];
  status: ModerationReviewStatusEnum;
  /** Sorted on for the queue — most recently offending first. */
  lastFlaggedAt: Date;
  reviewedBy?: {
    adminId: mongoose.Types.ObjectId;
    adminName: string;
  };
  reviewedAt?: Date;
  reviewNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type IModerationFlagDocument = IModerationFlag & Document;

const EntrySchema = new Schema<IModerationFlagEntry>(
  {
    reason: {
      type: String,
      required: true,
      enum: Object.values(ModerationFlagReasonEnum),
    },
    messageId: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
    reportedBy: {
      kind: String,
      id: mongoose.Schema.Types.ObjectId,
    },
    reportReason: {
      type: String,
      enum: Object.values(MessageReportReasonEnum),
    },
    note: { type: String, trim: true, maxlength: 1000 },
    signals: [String],
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const ModerationFlagSchema = new Schema<IModerationFlagDocument>(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      unique: true,
    },
    entries: { type: [EntrySchema], default: [] },
    status: {
      type: String,
      required: true,
      enum: Object.values(ModerationReviewStatusEnum),
      default: ModerationReviewStatusEnum.Pending,
    },
    lastFlaggedAt: { type: Date, required: true, default: Date.now },
    reviewedBy: {
      adminId: mongoose.Schema.Types.ObjectId,
      adminName: String,
    },
    reviewedAt: Date,
    reviewNote: { type: String, trim: true, maxlength: 2000 },
  },
  { timestamps: true },
);

// The moderation queue: pending first, most recent offence at the top.
ModerationFlagSchema.index({ status: 1, lastFlaggedAt: -1 });

export async function getModerationFlagModel(): Promise<
  Model<IModerationFlagDocument>
> {
  await connectToDatabase();

  return (
    (mongoose.models.ModerationFlag as Model<IModerationFlagDocument>) ||
    mongoose.model<IModerationFlagDocument>(
      "ModerationFlag",
      ModerationFlagSchema,
    )
  );
}
