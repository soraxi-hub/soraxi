import mongoose, { Schema, type Document, type Model } from "mongoose";
import { connectToDatabase } from "../mongoose";
import {
  GatewayPaymentStatus,
  SuborderFinancialStatus,
} from "@/enums/financial.enums";
import { PaymentGateway } from "@/enums";

/**
 * Detailed commission breakdown for a single suborder.
 * Mirrors the return value of the calculateCommission utility.
 * All values are in Kobo.
 */
export interface ICommissionDetails {
  percentageFee: number; // The raw 5% portion of the commission
  flatFeeApplied: number; // The flat fee applied — 0, ₦100, or ₦200 in Kobo
}

/**
 * Financial breakdown for a single suborder within a transaction.
 * All monetary values are in Kobo (1 Naira = 100 Kobo).
 */
export interface ISuborderBreakdown {
  suborderId: mongoose.Types.ObjectId;

  /**
   * `vendorId` refers to the storeId this subOrder is assiociated with
   */
  vendorId: mongoose.Types.ObjectId;

  grossAmount: number; // What the customer paid for this suborder
  commission: number; // Platform's total cut
  settleAmount: number; // Vendor's net amount after commission
  commissionDetails: ICommissionDetails; // Breakdown of how commission was calculated
  status: SuborderFinancialStatus; // Current financial state of this suborder
}

/**
 * Transaction record document interface.
 *
 * The transaction record is the bridge between Flutterwave and the internal
 * financial system. It links an external payment reference to the internal
 * suborder breakdowns, commission calculations, and fund allocations it triggered.
 *
 * One transaction record is created per customer order, regardless of how many
 * suborders (vendors) are involved.
 */
export interface ITransactionRecord {
  customerId: mongoose.Types.ObjectId; // The user that placed the order
  orderId: mongoose.Types.ObjectId;

  /** Which gateway collected this payment. */
  paymentProvider: PaymentGateway;

  /**
   * Our own reference for the payment — the cart's idempotency key, echoed
   * back by every gateway. Named for what it is: the Flutterwave-era name
   * described the provider, but the value was never a Flutterwave reference.
   */
  gatewayReference: string;

  /**
   * The provider's transaction id, as a string.
   *
   * A string because that is what providers actually issue — the previous
   * numeric field forced `Number(...)` on every id, which silently produced
   * NaN for any non-numeric one and failed record creation *after* the order
   * had already been marked paid.
   *
   * Unique per provider rather than globally: an id is only meaningful within
   * the gateway that issued it, and two providers can legitimately emit the
   * same value. See the compound index below.
   */
  gatewayTransactionId: string;

  /** Normalised collection outcome — see GatewayPaymentStatus. */
  gatewayStatus: GatewayPaymentStatus;

  totalAmount: number; // Total amount paid by customer in Kobo

  // Per-vendor financial breakdown — one entry per suborder
  suborderBreakdowns: ISuborderBreakdown[];

  createdAt: Date;
  updatedAt: Date;
}

export type ITransactionRecordDocument = ITransactionRecord & Document;

const SuborderBreakdownSchema = new Schema<ISuborderBreakdown>(
  {
    suborderId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    vendorId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    grossAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    commission: {
      type: Number,
      required: true,
      min: 0,
    },
    settleAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    commissionDetails: {
      percentageFee: {
        type: Number,
        required: true,
        min: 0,
      },
      flatFeeApplied: {
        type: Number,
        required: true,
        min: 0,
      },
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(SuborderFinancialStatus),
      default: SuborderFinancialStatus.PENDING,
    },
  },
  { _id: false }, // Subdocuments do not need their own _id
);

const TransactionRecordSchema = new Schema<ITransactionRecordDocument>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true, // One transaction record per order
      index: true,
    },
    paymentProvider: {
      type: String,
      required: true,
      enum: Object.values(PaymentGateway),
      index: true,
    },
    gatewayReference: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    gatewayTransactionId: {
      type: String,
      required: true,
    },
    gatewayStatus: {
      type: String,
      required: true,
      enum: Object.values(GatewayPaymentStatus),
      default: GatewayPaymentStatus.PENDING,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    suborderBreakdowns: {
      type: [SuborderBreakdownSchema],
      required: true,
      validate: {
        validator: (v: ISuborderBreakdown[]) => v.length > 0,
        message:
          "A transaction record must have at least one suborder breakdown.",
      },
    },
  },
  {
    timestamps: true,
  },
);

/**
 * A gateway transaction id is unique only within the gateway that issued it,
 * so uniqueness is enforced per provider rather than globally. A single-field
 * unique index would reject a legitimate payment the day two providers happen
 * to emit the same id.
 *
 * This is also what keeps a payment from being recorded twice — the guarantee
 * the retired numeric `flutterwaveTransactionId` unique index used to provide.
 */
TransactionRecordSchema.index(
  { paymentProvider: 1, gatewayTransactionId: 1 },
  { unique: true },
);

/**
 * Get the TransactionRecord model.
 * Uses a cached model if available to prevent model redefinition during development.
 *
 * @returns Mongoose TransactionRecord model
 */
export async function getTransactionRecordModel(): Promise<
  Model<ITransactionRecordDocument>
> {
  await connectToDatabase();

  return (
    (mongoose.models.TransactionRecord as Model<ITransactionRecordDocument>) ||
    mongoose.model<ITransactionRecordDocument>(
      "TransactionRecord",
      TransactionRecordSchema,
    )
  );
}

/**
 * Create a new transaction record when a customer's payment is confirmed.
 *
 * @param data - Transaction record data including suborder breakdowns
 * @returns The created transaction record document
 */
export async function createTransactionRecord(
  data: Omit<ITransactionRecord, "createdAt" | "updatedAt">,
  session: mongoose.ClientSession,
): Promise<ITransactionRecordDocument> {
  await connectToDatabase();
  const TransactionRecord = await getTransactionRecordModel();

  const record = new TransactionRecord(data);
  return await record.save({ session });
}

/**
 * Get a transaction record by its associated order ID.
 *
 * @param orderId - The _id of the order
 * @returns Transaction record document or null
 */
export async function getTransactionRecordByOrderId(
  orderId: string,
): Promise<ITransactionRecord | null> {
  await connectToDatabase();
  const TransactionRecord = await getTransactionRecordModel();

  return TransactionRecord.findOne<ITransactionRecord>({ orderId });
}

/**
 * Get a transaction record by our own payment reference (the cart idempotency
 * key). Works for any gateway — every provider echoes this value back.
 *
 * @param gatewayReference - Our payment reference
 * @returns Transaction record document or null
 */
export async function getTransactionRecordByGatewayReference(
  gatewayReference: string,
): Promise<ITransactionRecord | null> {
  await connectToDatabase();
  const TransactionRecord = await getTransactionRecordModel();

  return TransactionRecord.findOne<ITransactionRecord>({
    gatewayReference,
  });
}

/**
 * Update the collection outcome on a transaction record.
 * Called when a webhook confirms the final payment outcome.
 *
 * @param gatewayReference - Our payment reference
 * @param status - The new normalised payment status
 * @returns Updated transaction record document or null
 */
export async function updateTransactionGatewayStatus(
  gatewayReference: string,
  status: GatewayPaymentStatus,
  session: mongoose.ClientSession,
): Promise<ITransactionRecord | null> {
  await connectToDatabase();
  const TransactionRecord = await getTransactionRecordModel();

  return TransactionRecord.findOneAndUpdate<ITransactionRecord>(
    { gatewayReference },
    { $set: { gatewayStatus: status } },
    { new: true, session },
  );
}

/**
 * Update the financial status of a specific suborder within a transaction record.
 * Called at every stage transition — confirmation, dispute, settlement, refund.
 *
 * @param orderId - The _id of the order
 * @param suborderId - The _id of the suborder to update
 * @param status - The new suborder financial status
 * @returns Updated transaction record document or null
 */
export async function updateSuborderFinancialStatus(
  orderId: string,
  suborderId: string,
  status: SuborderFinancialStatus,
  session: mongoose.ClientSession,
): Promise<ITransactionRecord | null> {
  await connectToDatabase();
  const TransactionRecord = await getTransactionRecordModel();

  return TransactionRecord.findOneAndUpdate<ITransactionRecord>(
    {
      orderId,
      "suborderBreakdowns.suborderId": new mongoose.Types.ObjectId(suborderId),
    },
    {
      $set: { "suborderBreakdowns.$.status": status },
    },
    { new: true, session },
  );
}
