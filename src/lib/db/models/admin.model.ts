import mongoose, { Schema, type Document, type Model } from "mongoose";
import { connectToDatabase } from "../mongoose";
import type { Role } from "@/modules/shared/roles";

/**
 * Interface for Admin document
 * Represents platform administrators with role-based access.
 */
export interface IAdmin extends Document {
  name: string;
  email: string;
  password: string;
  roles: Role[];
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Mongoose schema for Admins
 * Includes role-based access and basic account info.
 */
const AdminSchema = new Schema<IAdmin>(
  {
    name: {
      type: String,
      required: [true, "Admin name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Admin email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Admin password is required"],
    },
    roles: {
      type: [String],
      required: [true, "At least one admin role is required"],
      enum: {
        values: [
          "super_admin",
          "product_admin",
          "order_admin",
          "store_admin",
          "customer_support_admin",
          "finance_admin",
        ],
        message: "Invalid admin role",
      },
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Get the Admin model
 * Uses a cached model if available to prevent model redefinition during development
 *
 * @returns Mongoose Admin model
 */
export async function getAdminModel(): Promise<Model<IAdmin>> {
  await connectToDatabase();

  return (
    (mongoose.models.Admin as Model<IAdmin>) ||
    mongoose.model<IAdmin>("Admin", AdminSchema)
  );
}

/**
 * Get admin by email
 * @param email - Admin email address
 * @param lean - Whether to return a lean object
 * @returns IAdmin document or plain object
 */
export async function getAdminByEmail(
  email: string,
  lean = false
): Promise<IAdmin | null> {
  await connectToDatabase();
  const Admin = await getAdminModel();

  return lean ? Admin.findOne({ email }).lean() : Admin.findOne({ email });
}

/**
 * Get admin by ID
 * @param id - Admin document ID
 * @param lean - Whether to return a lean object
 * @returns IAdmin document or plain object
 */
export async function getAdminById(
  id: string,
  lean = false
): Promise<IAdmin | null> {
  await connectToDatabase();
  const Admin = await getAdminModel();

  return lean ? Admin.findById(id).lean() : Admin.findById(id);
}
