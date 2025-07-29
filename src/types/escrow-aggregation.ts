import type mongoose from "mongoose";
import type { IOrder, ISubOrder } from "@/lib/db/models/order.model";

/**
 * Interface for populated user details in aggregation result
 *
 * This represents the user data that gets populated via $lookup in the aggregation pipeline.
 * Only specific fields are projected to optimize query performance and reduce data transfer.
 */
interface PopulatedUserDetails {
  _id: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
}

/**
 * Interface for populated store details in aggregation result
 *
 * This represents the store data that gets populated via $lookup in the aggregation pipeline.
 * Only essential store information is projected for the escrow release queue display.
 */
interface PopulatedStoreDetails {
  _id: mongoose.Types.ObjectId;
  name: string;
  storeEmail: string;
  logoUrl?: string; // Optional field - some stores may not have logos
}

/**
 * Interface for populated product details in aggregation result
 *
 * This represents the product data that gets populated via $lookup in the aggregation pipeline.
 * Used to display product information in the escrow release queue for admin review.
 */
interface PopulatedProductDetails {
  _id: mongoose.Types.ObjectId;
  name: string;
  images: string[]; // Array of product image URLs
  price: number; // Price in kobo (to avoid floating-point errors)
}

/**
 * Interface for the aggregation result from escrow release queue
 *
 * This interface represents the exact shape of each document returned by the MongoDB
 * aggregation pipeline in the getEscrowReleaseQueue procedure.
 *
 * Key transformations from the original IOrder:
 * 1. subOrders becomes a single object (not array) due to $unwind operation
 * 2. Additional populated fields are added via $lookup operations
 * 3. Computed fields are added via $addFields operation
 *
 * This typing ensures type safety when processing aggregation results and prevents
 * runtime errors from accessing undefined properties.
 */
export interface EscrowReleaseAggregationResult
  extends Omit<IOrder, "subOrders"> {
  /**
   * Single sub-order (unwound from the original subOrders array)
   *
   * The $unwind stage in the aggregation pipeline converts the subOrders array
   * into individual documents, each containing one sub-order. This is why we
   * type it as a single ISubOrder instead of an array.
   */
  subOrders: ISubOrder;

  /**
   * Populated user details (single object, not array due to $arrayElemAt)
   *
   * The $lookup stage populates user data, and $arrayElemAt extracts the first
   * (and only) element from the resulting array, giving us a single user object.
   */
  userDetails: PopulatedUserDetails;

  /**
   * Populated store details (single object, not array due to $arrayElemAt)
   *
   * Similar to userDetails, this is populated via $lookup and extracted as a
   * single object using $arrayElemAt for easier access in the formatting logic.
   */
  storeDetails: PopulatedStoreDetails;

  /**
   * Populated product details (array of products)
   *
   * This remains an array because a sub-order can contain multiple products.
   * Each product in the sub-order gets its details populated from the products collection.
   */
  productDetails: PopulatedProductDetails[];

  /**
   * Computed field: days since return window passed
   *
   * This field is calculated in the aggregation pipeline using $addFields.
   * It represents how many days have passed since the return window expired,
   * helping admins prioritize which escrow releases are most overdue.
   */
  daysSinceReturnWindow: number;
}
