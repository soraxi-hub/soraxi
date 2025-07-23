import mongoose, { Schema, type Document, type Model } from "mongoose";
import { connectToDatabase } from "../mongoose";
import type { Role } from "@/modules/shared/roles";

/**
 * Interface for Admin Audit Logs
 * Tracks admin activities across the platform.
 */
export interface IAuditLog extends Document {
  adminId: mongoose.Types.ObjectId;
  adminName: string;
  adminEmail: string;
  adminRoles: Role[];
  action: string;
  myModule: string; // "module" is reserved in strict mode
  resourceId?: string;
  resourceType?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Schema for Audit Logs
 * Stores metadata for each admin action for traceability and accountability.
 */
const AuditLogSchema = new Schema<IAuditLog>(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      required: [true, "Admin ID is required for audit log"],
    },
    adminName: {
      type: String,
      required: [true, "Admin name is required"],
      trim: true,
    },
    adminEmail: {
      type: String,
      required: [true, "Admin email is required"],
      trim: true,
    },
    adminRoles: {
      type: [String],
      required: [true, "Admin roles are required"],
    },
    action: {
      type: String,
      required: [true, "Action description is required"],
      trim: true,
    },
    myModule: {
      type: String,
      required: [true, "Module name is required"],
      trim: true,
    },
    resourceId: {
      type: String,
    },
    resourceType: {
      type: String,
    },
    details: {
      type: Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for query performance
AuditLogSchema.index({ adminId: 1 });
AuditLogSchema.index({ action: 1 });
AuditLogSchema.index({ myModule: 1 });
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ resourceId: 1, resourceType: 1 });

/**
 * Get or create the AuditLog model
 *
 * Returns the Mongoose model for audit logs, creating it if it doesn't exist.
 */
export async function getAuditLogModel(): Promise<Model<IAuditLog>> {
  await connectToDatabase();
  return (
    (mongoose.models.AuditLog as Model<IAuditLog>) ||
    mongoose.model<IAuditLog>("AuditLog", AuditLogSchema)
  );
}
