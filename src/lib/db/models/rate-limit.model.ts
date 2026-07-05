import mongoose, { Schema, type Document, type Model } from "mongoose";
import { connectToDatabase } from "../mongoose";

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface IRateLimit {
  /** Namespaced key, e.g. "ai-desc:<storeId>" */
  key: string;
  /** Number of requests made in the current window */
  count: number;
  /** When this window opened — useful for debugging */
  windowStart: Date;
  /** MongoDB TTL index: document is auto-deleted when this date is reached */
  expiresAt: Date;
}

export interface IRateLimitDocument extends IRateLimit, Document {}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const RateLimitSchema = new Schema<IRateLimitDocument>(
  {
    key: {
      type: String,
      required: true,
      index: true,
    },
    count: {
      type: Number,
      required: true,
      default: 0,
    },
    windowStart: {
      type: Date,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: false },
);

// TTL index: MongoDB automatically removes documents once expiresAt is reached.
// expireAfterSeconds: 0 means "delete at the exact date stored in the field".
RateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ---------------------------------------------------------------------------
// Model accessor
// ---------------------------------------------------------------------------

export async function getRateLimitModel(): Promise<Model<IRateLimitDocument>> {
  await connectToDatabase();

  return (
    (mongoose.models.RateLimit as Model<IRateLimitDocument>) ||
    mongoose.model<IRateLimitDocument>("RateLimit", RateLimitSchema)
  );
}
