import mongoose, { Schema, type Document, type Model } from "mongoose";
import { connectToDatabase } from "../mongoose";

/**
 * Interface for User document
 * All monetary values (if any) are assumed to be stored in kobo to avoid floating-point errors.
 */
export interface IUser extends Document {
  _id: mongoose.Schema.Types.ObjectId;
  firstName: string;
  lastName: string;
  otherNames: string;
  email: string;
  password: string;
  phoneNumber: string;
  address: string;
  cityOfResidence: string;
  stateOfResidence: string;
  postalCode: string;
  isVerified: boolean;
  followingStores: mongoose.Schema.Types.ObjectId[];
  stores: {
    storeId: mongoose.Schema.Types.ObjectId;
  }[];
  forgotpasswordToken?: string;
  forgotpasswordTokenExpiry?: Date;
  verifyToken?: string;
  verifyTokenExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Mongoose schema for users
 */
const UserSchema = new Schema<IUser>(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    otherNames: {
      type: String,
      required: [true, "Other names are required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      trim: true,
    },
    address: {
      type: String,
      required: [true, "Address is required"],
    },
    cityOfResidence: {
      type: String,
      required: [true, "City of residence is required"],
    },
    stateOfResidence: {
      type: String,
      required: [true, "State of residence is required"],
    },
    postalCode: {
      type: String,
      required: [true, "Postal code is required"],
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    followingStores: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Store",
      },
    ],
    stores: [
      {
        storeId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Store",
        },
      },
    ],
    forgotpasswordToken: {
      type: String,
    },
    forgotpasswordTokenExpiry: {
      type: Date,
    },
    verifyToken: {
      type: String,
    },
    verifyTokenExpiry: {
      type: Date,
    },
  },
  {
    // Adds createdAt and updatedAt timestamps
    timestamps: true,
  }
);

/**
 * Get the User model
 * Uses a cached model if available to prevent model redefinition during development
 *
 * @returns Mongoose User model
 */
export async function getUserModel(): Promise<Model<IUser>> {
  // Connect to the database
  await connectToDatabase();

  // Use existing model if it exists, otherwise create a new one
  return (
    (mongoose.models.User as Model<IUser>) ||
    mongoose.model<IUser>("User", UserSchema)
  );
}

/**
 * Get a user by email
 * @param email - The user's email
 * @param lean - Whether to return a plain object (lean) or a Mongoose document
 * @returns A single user document or null
 */
export async function getUserByEmail(
  email: string,
  lean: boolean = false
): Promise<IUser | null> {
  await connectToDatabase();
  const User = await getUserModel();

  return lean ? User.findOne({ email }).lean() : User.findOne({ email });
}

/**
 * Get a user by id
 * @param id - The user's id
 * @param lean - Whether to return a plain object (lean) or a Mongoose document
 * @returns A single user document or null
 */
export async function getUserById(
  id: string,
  lean: boolean = false
): Promise<IUser | null> {
  await connectToDatabase();
  const User = await getUserModel();

  return lean
    ? User.findById(id)
        .select(
          "firstName lastName otherNames email phoneNumber address cityOfResidence stateOfResidence postalCode"
        )
        .lean()
    : User.findById(id).select(
        "firstName lastName otherNames email phoneNumber address cityOfResidence stateOfResidence postalCode"
      );
}
