import mongoose, { Schema, type Document, type Model } from "mongoose";
import { connectToDatabase } from "../mongoose";
import {
  DeliveryProofMethodEnum,
  DeliveryStatus,
  DeliveryType,
  PaymentGateway,
  PaymentStatus,
  StatusHistory,
  CouponTypeEnum,
} from "@/enums";
import { IDiscount } from "@/validators/discount-validation";
import {
  CustomerConfirmedDelivery,
  ISubOrderFinancials,
  ShippingAddress,
} from "@/types/order";
import { ShippingMethod } from "@/types";

/**
 * Interface representing a product snapshot in an order.
 * All monetary values are stored in kobo to avoid floating-point errors.
 */
export interface IOrderProduct {
  productId: mongoose.Types.ObjectId;
  storeId: mongoose.Types.ObjectId;
  productSnapshot: {
    _id: mongoose.Types.ObjectId;
    name: string;
    images: string[];
    quantity: number;
    price: number;
    category?: string;
    subCategory?: string;
    selectedSize?: {
      size: string;
      price: number;
    };
  };
}

/**
 * Proof-of-delivery state carried by every sub-order.
 *
 * Three concerns live here and are deliberately kept separate:
 *
 *  1. The **code** — the 6-digit secret only the customer ever sees.
 *  2. The **token** — the unguessable segment of the rider's confirmation link.
 *     NOT a secret: holding it lets you *attempt* a confirmation, never
 *     complete one, because the code is still required.
 *  3. The **outcome** — how delivery was ultimately proven, which is what an
 *     admin reads when resolving a dispute.
 *
 * Both secrets are stored in plaintext because both must be **retrievable**,
 * not merely verifiable — the customer's order page renders the code on every
 * visit and the vendor re-copies the link for each rider. See
 * `lib/utils/delivery-proof.ts` for why hashing would buy almost nothing here,
 * and why the attempt counter is the control that actually holds.
 *
 * ⚠️ Never project `code` or `token` into a vendor-facing response. A vendor
 * who can see the code can self-confirm, and the entire mechanism collapses.
 */
export interface IDeliveryProof {
  /** The 6-digit code. Customer-visible only. Minted when the sub-order ships. */
  code?: string;
  codeGeneratedAt?: Date;

  /** Link token. Vendor-visible only. Minted when the sub-order ships. */
  token?: string;
  tokenCreatedAt?: Date;
  tokenExpiresAt?: Date;

  /** Failed code attempts. At `MAX_DELIVERY_CODE_ATTEMPTS` the link is dead. */
  attempts: number;
  /** Set when attempts are exhausted. Terminal — no timer, no reset. */
  lockedAt?: Date;

  /** Populated once delivery is established, by whatever route. */
  method?: DeliveryProofMethodEnum;
  confirmedAt?: Date;
  /**
   * Free text typed by whoever delivered. Unverified by design: a record for
   * the customer and the vendor to reason about, not evidence in itself.
   */
  riderName?: string;
}

/**
 * Interface representing a sub-order within an order.
 */
export interface ISubOrder {
  _id: mongoose.Types.ObjectId;
  storeId: mongoose.Types.ObjectId;
  products: IOrderProduct[];
  financials: ISubOrderFinancials;
  shippingMethod?: ShippingMethod;
  deliveryDate?: Date; // The date the product was delivered
  deliveryStatus: DeliveryStatus;
  customerConfirmedDelivery: CustomerConfirmedDelivery;
  /**
   * Proof-of-delivery state for this sub-order.
   *
   * The code is the customer's; the token is a keyboard for whoever delivers.
   * Both are stored hashed — a database leak must not yield a working code or
   * a usable link.
   */
  deliveryProof: IDeliveryProof;
  statusHistory: Array<{
    status: StatusHistory;
    timestamp: Date;
    notes?: string;
  }>;
  storeSnapshot: {
    name: string;
    email?: string;
  };
}

/**
 * Interface representing the main Order document.
 */
export interface IOrder {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userSnapshot: {
    name: string;
    email: string;
    phoneNumber: string;
  };
  stores: mongoose.Types.ObjectId[];
  subOrders: ISubOrder[];
  totalAmount: number;
  shippingAddress: ShippingAddress;
  paymentStatus: PaymentStatus;
  idempotencyKey: string;
  paymentMethod?: string;
  paymentGateway?: PaymentGateway;
  notes?: string;
  couponCode?: string; // Add coupon code reference
  discount?: IDiscount; // Change from simple number to discount object
  createdAt: Date;
  updatedAt: Date;
}

export type IOrderDocument = IOrder & Document;

/**
 * Schema for individual products inside a sub-order.
 */
const OrderProductSchema = new Schema<IOrderProduct>({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: [true, "ProductId is required for reference"],
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Store",
    required: [true, "StoreId is required for reference"],
  },
  productSnapshot: {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Product snapshot ID is required"],
    },
    name: {
      type: String,
      required: [true, "Product name is required for product snapshot"],
    },
    images: [
      {
        type: String,
        required: [true, "Product images are required for product snapshot"],
      },
    ],
    quantity: {
      type: Number,
      required: [true, "Quantity is required for product snapshot"],
    },
    price: {
      type: Number,
      required: [true, "Price is required for product snapshot"],
    },
    category: { type: String },
    subCategory: { type: String },
    selectedSize: {
      size: { type: String },
      price: { type: Number },
    },
  },
});

/**
 * Schema for discount information
 */
const DiscountSchema = new Schema<IDiscount>({
  amount: { type: Number, required: true },
  couponCode: { type: String },
  type: {
    type: String,
    enum: Object.values(CouponTypeEnum),
  },
  description: { type: String },
});

/**
 * Schema for the immutable financial snapshot of a sub-order.
 *
 * All monetary values are stored in kobo to prevent
 * floating-point precision errors.
 */
const SubOrderFinancialsSchema = new Schema<ISubOrderFinancials>(
  {
    subtotal: {
      type: Number,
      required: [true, "Subtotal is required"],
    },

    discount: {
      type: DiscountSchema,
    },

    amountPaid: {
      type: Number,
      required: [true, "Amount paid is required"],
    },

    platformFee: {
      percentage: {
        type: Number,
        required: [true, "Platform fee percentage is required"],
      },

      amount: {
        type: Number,
        required: [true, "Platform fee amount is required"],
      },
    },

    vendorSettlementAmount: {
      type: Number,
      required: [true, "Vendor settlement amount is required"],
    },
  },
  {
    _id: false,
  },
);

/**
 * Schema for sub-orders linked to stores.
 */
const SubOrderSchema = new Schema<ISubOrder>({
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Store",
    required: [true, "StoreId is required for reference"],
  },
  products: [OrderProductSchema],
  financials: {
    type: SubOrderFinancialsSchema,
    required: [true, "Financial breakdown is required"],
  },
  shippingMethod: {
    name: { type: String },
    price: { type: Number },
    estimatedDeliveryDays: { type: String },
    description: { type: String },
  },
  deliveryDate: { type: Date },
  deliveryStatus: {
    type: String,
    enum: Object.values(DeliveryStatus),
    default: DeliveryStatus.OrderPlaced,
  },
  customerConfirmedDelivery: {
    confirmed: { type: Boolean, default: false },
    confirmedAt: { type: Date },
    autoConfirmed: { type: Boolean, default: false },
  },
  deliveryProof: {
    code: { type: String },
    codeGeneratedAt: { type: Date },
    token: { type: String },
    tokenCreatedAt: { type: Date },
    tokenExpiresAt: { type: Date },
    attempts: { type: Number, default: 0 },
    lockedAt: { type: Date },
    method: {
      type: String,
      enum: Object.values(DeliveryProofMethodEnum),
    },
    confirmedAt: { type: Date },
    riderName: { type: String, trim: true, maxlength: 60 },
  },
  storeSnapshot: {
    name: {
      type: String,
      required: [true, "Store name is required for store snapshot"],
    },
    email: {
      type: String,
      // required: [true, "Store email is required for store snapshot"],
    },
  },
  statusHistory: [
    {
      status: {
        type: String,
        enum: Object.values(StatusHistory),
        required: true,
      },
      timestamp: { type: Date, default: Date.now },
      notes: String,
    },
  ],
});

/**
 * Main Order schema
 */
const OrderSchema = new Schema<IOrderDocument>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "UserId is required for reference"],
    },
    userSnapshot: {
      name: {
        type: String,
        required: [true, "Customer's name is required for Customer snapshot"],
      },
      email: {
        type: String,
        required: [true, "Customer's email is required for Customer snapshot"],
      },
      phoneNumber: {
        type: String,
        required: [
          true,
          "Customer's phone number is required for Customer snapshot",
        ],
      },
    },
    stores: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Store",
        required: [true, "StoreId is required for reference"],
      },
    ],
    subOrders: [SubOrderSchema],
    totalAmount: { type: Number, required: [true, "Total amount is required"] },
    shippingAddress: {
      postalCode: { type: String, required: [true, "Postal code is required"] },
      address: { type: String, required: [true, "Address is required"] },
      city: { type: String, required: [true, "City is required"] },
      state: { type: String, required: [true, "State is required"] },
      deliveryType: {
        type: String,
        enum: Object.values(DeliveryType),
        required: [true, "Delivery type is required"],
      },
      campusName: { type: String },
      campusLocation: { type: String },
    },
    paymentMethod: { type: String },
    paymentStatus: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.Pending,
      required: true,
    },
    paymentGateway: {
      type: String,
      enum: Object.values(PaymentGateway),
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
    }, // Only set at creation, cannot be changed even if the order is updated.
    couponCode: { type: String }, // Add couponCode field
    discount: DiscountSchema, // Update discount to object schema
  },
  {
    timestamps: true,
  },
);

/**
 * Indexes
 *
 * - userId + createdAt: powers "my orders" lookups (most frequent query),
 *   sorted newest-first.
 * - stores + createdAt: powers store/admin order listings filtered by store,
 *   sorted newest-first (see OrderRepository.getStoreOrders).
 * - subOrders.deliveryStatus + subOrders.customerConfirmedDelivery.confirmed:
 *   powers the auto-confirm-delivery cron scan.
 */
OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ stores: 1, createdAt: -1 });

/**
 * The rider confirmation page resolves an order from a link token and nothing
 * else — there is no session to narrow the query by. Sparse because only
 * shipped sub-orders carry a token.
 */
OrderSchema.index({ "subOrders.deliveryProof.token": 1 }, { sparse: true });
OrderSchema.index({
  "subOrders.deliveryStatus": 1,
  "subOrders.customerConfirmedDelivery.confirmed": 1,
});

/**
 * Get the Order model
 */
export async function getOrderModel(): Promise<Model<IOrderDocument>> {
  await connectToDatabase();
  return (
    (mongoose.models.Order as Model<IOrderDocument>) ||
    mongoose.model<IOrderDocument>("Order", OrderSchema)
  );
}
