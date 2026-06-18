import mongoose, { Document, Schema } from "mongoose";
import {
  VendorApplicationStatus,
  InventorySize,
} from "@/domain/vendor-application";

export interface IVendorApplication {
  _id: mongoose.Types.ObjectId;
  referenceId: string;
  status: VendorApplicationStatus;

  businessName: string;
  ownerName: string;
  email: string;
  phone: string;

  categoryId: string;
  subCategory?: string;

  productSamples: string[];

  cacNumber?: string;
  instagramHandle?: string;
  otherProofUrl?: string;

  estimatedInventorySize: InventorySize;
  estimatedPriceRange: { min: number; max: number };

  isDropshipper: boolean;

  reviewedBy?: mongoose.Types.ObjectId;
  reviewNote?: string;
  rejectionReason?: string;
  inviteToken?: string;
  inviteExpiresAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export type IVendorApplicationDocument = IVendorApplication & Document;

const VendorApplicationSchema = new Schema<IVendorApplicationDocument>(
  {
    referenceId: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "invited"],
      default: "pending",
    },

    businessName: { type: String, required: true },
    ownerName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },

    categoryId: {
      type: String,
      required: true,
    },
    subCategory: { type: String },

    productSamples: [String],

    cacNumber: { type: String },
    instagramHandle: { type: String },
    otherProofUrl: { type: String },

    estimatedInventorySize: {
      type: String,
      enum: ["small", "medium", "large"],
      required: true,
    },
    estimatedPriceRange: {
      min: { type: Number, required: true },
      max: { type: Number, required: true },
    },

    isDropshipper: { type: Boolean, required: true },

    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewNote: { type: String },
    rejectionReason: { type: String },
    inviteToken: { type: String },
    inviteExpiresAt: { type: Date },
  },
  { timestamps: true },
);

// Indexes for common lookups
VendorApplicationSchema.index({ email: 1 });
VendorApplicationSchema.index({ status: 1 });
VendorApplicationSchema.index({ categoryId: 1, status: 1 });

export const VendorApplicationModel =
  mongoose.models.VendorApplication ||
  mongoose.model<IVendorApplicationDocument>(
    "VendorApplication",
    VendorApplicationSchema,
  );
