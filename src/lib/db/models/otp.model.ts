import mongoose, { Schema, type Document, type Model } from "mongoose";
import { connectToDatabase } from "../mongoose";
import { OtpEntityType, OtpPurpose } from "@/enums";

/**
 * Interface for OTP document
 * Represents a single OTP session (not permanent user data)
 */
export interface IOTP {
  _id: mongoose.Types.ObjectId;

  entityId: mongoose.Types.ObjectId; // Generic reference ID
  entityType: OtpEntityType; // What this ID refers to
  identifier: string; // Email or phone number (for non-auth flows)

  otpHash: string; // Hashed OTP (never store raw OTP)
  purpose: OtpPurpose; // Why this OTP was created

  attempts: number; // Number of verification attempts made
  maxAttempts: number; // Max allowed attempts before blocking

  expiresAt: Date; // When OTP becomes invalid
  blockedUntil?: Date; // Temporary lock if too many failed attempts

  isUsed: boolean; // Marks OTP as consumed (prevents reuse)

  createdAt: Date;
  updatedAt: Date;
}

export type IOTPDocument = IOTP & Document;

/**
 * Mongoose schema for OTP
 */
const OTPSchema = new Schema<IOTPDocument>(
  {
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    entityType: {
      type: String,
      required: true,
      enum: Object.values(OtpEntityType),
      index: true,
    },

    identifier: {
      type: String,
      required: true,
      index: true, // Fast lookup for OTP verification
    },

    otpHash: {
      type: String,
      required: true,
      index: true,
    },

    purpose: {
      type: String,
      required: true,
      enum: Object.values(OtpPurpose),
      index: true,
    },

    attempts: {
      type: Number,
      default: 0,
    },

    maxAttempts: {
      type: Number,
      default: 3,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    blockedUntil: {
      type: Date,
    },

    isUsed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

/**
 * TTL index to auto-delete expired OTPs
 * MongoDB will automatically remove documents after expiry time
 */
OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

OTPSchema.index({ entityId: 1, entityType: 1, purpose: 1, isUsed: 1 });
OTPSchema.index({ entityId: 1, entityType: 1, isUsed: 1 });
OTPSchema.index({ purpose: 1, entityType: 1, isUsed: 1 });

/**
 * Get the OTP model
 * Prevents model redefinition in development
 */
export async function getOTPModel(): Promise<Model<IOTPDocument>> {
  await connectToDatabase();

  return (
    (mongoose.models.OTP as Model<IOTPDocument>) ||
    mongoose.model<IOTPDocument>("OTP", OTPSchema)
  );
}
