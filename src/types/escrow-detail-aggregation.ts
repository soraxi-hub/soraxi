import type mongoose from "mongoose";
import type { IOrder, ISubOrder } from "@/lib/db/models/order.model";
import {
  StoreBusinessInfo,
  StoreVerificationStatus,
} from "@/lib/db/models/store.model";

/**
 * Interface for populated user details in escrow detail aggregation result
 *
 * This represents the user data that gets populated via $lookup in the aggregation pipeline
 * for the escrow detail view. Contains essential customer information for admin review.
 */
interface PopulatedUserDetailsForDetail {
  _id: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
}

/**
 * Interface for populated store details in escrow detail aggregation result
 *
 * This represents the store data that gets populated via $lookup in the aggregation pipeline
 * for the escrow detail view. Includes additional verification and business information
 * not needed in the queue view but important for detailed review.
 */
interface PopulatedStoreDetailsForDetail {
  _id: mongoose.Types.ObjectId;
  name: string;
  storeEmail: string;
  logoUrl?: string;
  verification?: {
    isVerified: boolean;
    method: StoreVerificationStatus;
    verifiedAt?: Date;
    notes?: string;
  };
  businessInfo?: {
    businessName?: string;
    registrationNumber?: string;
    taxId?: string;
    type: StoreBusinessInfo;
    documentUrls?: string[];
  };
}

/**
 * Interface for populated product details in escrow detail aggregation result
 *
 * This represents the product data that gets populated via $lookup in the aggregation pipeline
 * for the escrow detail view. Contains more comprehensive product information than the queue view
 * including category and product type information for better admin understanding.
 */
interface PopulatedProductDetailsForDetail {
  _id: mongoose.Types.ObjectId;
  name: string;
  images: string[];
  price: number;
  category: string[];
  subCategory: string[];
  productType: string;
}

/**
 * Interface for the aggregation result from escrow release detail query
 *
 * This interface represents the exact shape of the document returned by the MongoDB
 * aggregation pipeline in the getEscrowReleaseDetail procedure.
 *
 * Key transformations from the original IOrder:
 * 1. subOrders becomes a single object (not array) due to $unwind operation
 * 2. Additional populated fields are added via $lookup operations with more detailed projections
 * 3. Computed fields are added via $addFields operation
 * 4. More comprehensive data is included compared to the queue view for detailed analysis
 *
 * This typing ensures type safety when processing the single sub-order detail and prevents
 * runtime errors from accessing undefined properties during detailed formatting.
 */
export interface EscrowReleaseDetailAggregationResult
  extends Omit<IOrder, "subOrders"> {
  /**
   * Single sub-order (unwound from the original subOrders array)
   *
   * The $unwind stage in the aggregation pipeline converts the subOrders array
   * into individual documents. Since we're matching a specific sub-order ID,
   * we get exactly one sub-order in the result.
   */
  subOrders: ISubOrder;

  /**
   * Populated user details (single object, not array due to $arrayElemAt)
   *
   * The $lookup stage populates user data with the same fields as the queue view,
   * and $arrayElemAt extracts the first element from the resulting array.
   */
  userDetails: PopulatedUserDetailsForDetail;

  /**
   * Populated store details (single object, not array due to $arrayElemAt)
   *
   * Similar to userDetails, but includes additional verification and business
   * information that's useful for detailed escrow release review.
   */
  storeDetails: PopulatedStoreDetailsForDetail;

  /**
   * Populated product details (array of products)
   *
   * This remains an array because a sub-order can contain multiple products.
   * Each product includes more detailed information than the queue view,
   * including category and product type data.
   */
  productDetails: PopulatedProductDetailsForDetail[];

  /**
   * Computed field: days since return window passed
   *
   * This field is calculated in the aggregation pipeline using $addFields.
   * It represents how many days have passed since the return window expired,
   * providing context for the urgency of the escrow release.
   */
  daysSinceReturnWindow: number;
}

/**
 * Interface for the formatted sub-order response
 *
 * This interface defines the structure of the final response sent to the client
 * after all data transformation and formatting is complete. It provides a clean,
 * consistent API surface for the frontend to consume.
 */
export interface FormattedEscrowReleaseDetail {
  id: string;
  subOrderNumber: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  store: {
    id: string;
    name: string;
    email: string;
    logo: string | null;
    verification: {
      isVerified: boolean;
      method: string | null;
      verifiedAt: Date | null;
    };
    businessInfo: {
      type?: StoreBusinessInfo;
      businessName: string | null;
      registrationNumber: string | null;
    };
  };
  products: Array<{
    id: string;
    name: string;
    images: string[];
    quantity: number;
    price: number;
    selectedSize: {
      size: string;
      price: number;
    } | null;
    // category: string[];
    // subCategory: string[];
    // productType: string;
    totalPrice: number;
  }>;
  escrowInfo: {
    held: boolean;
    released: boolean;
    releasedAt: Date | null;
    refunded: boolean;
    refundReason: string | null;
    settlementDetails: {
      settleAmount: number;
      releaseAmount: number;
      commission: number;
      appliedPercentageFee: number;
      appliedFlatFee: number;
      totalAmount: number;
      totalOrderValue: number;
    };
  };
  deliveryInfo: {
    status: string;
    deliveredAt: Date | undefined;
    returnWindow: Date;
    daysSinceReturnWindow: number;
    customerConfirmation: {
      confirmed: boolean;
      confirmedAt: Date | null;
      autoConfirmed: boolean;
    };
    shippingMethod: {
      name: string;
      price: number;
      estimatedDeliveryDays?: string;
      description?: string;
    } | null;
  };
  orderContext: {
    id: string;
    orderNumber: string;
    totalAmount: number;
    shippingAddress:
      | {
          postalCode: string;
          address: string;
        }
      | undefined;
    paymentMethod: string | null;
    paymentStatus: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
  };
  eligibilityCheck: {
    isEligible: boolean;
    reasons: string[];
  };
}
