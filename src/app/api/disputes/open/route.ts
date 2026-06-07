import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import { getOrderModel } from "@/lib/db/models/order.model";
import { ProductImageUploadService } from "@/lib/utils/cloudinary/cloudinary-server-side-upload";
import {
  getTransactionRecordByOrderId,
  updateSuborderFinancialStatus,
} from "@/lib/db/models/transaction-record.model";
import {
  createDisputeRecord,
  getActiveDisputeBySuborderId,
} from "@/lib/db/models/dispute-record.model";
import { createLedgerEntry } from "@/lib/db/models/ledger-entry.model";
import { freezeVendorFunds } from "@/lib/db/models/vendor-wallet.model";
import {
  LedgerEntryType,
  LedgerEntryCategory,
  LedgerEntityType,
  LedgerReferenceType,
  SuborderFinancialStatus,
  DisputeStatus,
} from "@/enums/financial.enums";
import { DeliveryStatus } from "@/enums";
import { getUserDataFromToken } from "@/lib/helpers/get-user-data-from-token";
import { DateFormatter } from "@/lib/utils/date-formatter";

const DISPUTE_RESOLUTION_BUSINESS_DAYS = 5;

/**
 * POST /api/disputes/open
 *
 * Opens a dispute for a specific suborder.
 *
 * Handles:
 * - Evidence image upload to Cloudinary
 * - All Stage 3 financial writes (dispute record, ledger entry, wallet update)
 *
 * Expected FormData fields:
 * - mainOrderId: string
 * - subOrderId: string
 * - reason: string
 * - evidence: File[] (one or more image files)
 *
 * NOTE: When this route grows, extract the dispute creation logic
 * into a DisputeService class following the same pattern as ProcessOrder.
 */
export async function POST(req: NextRequest) {
  let session: mongoose.ClientSession | null = null;

  try {
    // ----------------------------------------------------------------
    // STEP 1: Authenticate the student
    // ----------------------------------------------------------------

    // NOTE: Replace this with however you access the session in your
    // Next.js App Router routes e.g. auth(), getServerSession(), etc.
    const authSession = await getUserDataFromToken(req);
    if (!authSession) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const customerId = authSession.id;

    // ----------------------------------------------------------------
    // STEP 2: Parse and validate FormData inputs
    // ----------------------------------------------------------------

    const formData = await req.formData();

    const mainOrderId = formData.get("mainOrderId") as string | null;
    const subOrderId = formData.get("subOrderId") as string | null;
    const reason = formData.get("reason") as string | null;
    const evidenceFiles = formData.getAll("evidence") as File[];

    if (!mainOrderId || !subOrderId || !reason) {
      return NextResponse.json(
        {
          success: false,
          error: "mainOrderId, subOrderId, and reason are required.",
        },
        { status: 400 },
      );
    }

    if (
      !mongoose.Types.ObjectId.isValid(mainOrderId) ||
      !mongoose.Types.ObjectId.isValid(subOrderId)
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid mainOrderId or subOrderId format." },
        { status: 400 },
      );
    }

    if (reason.trim().length < 20) {
      return NextResponse.json(
        {
          success: false,
          error: "Please provide a detailed reason (at least 20 characters).",
        },
        { status: 400 },
      );
    }

    if (!evidenceFiles.length) {
      return NextResponse.json(
        { success: false, error: "At least one evidence image is required." },
        { status: 400 },
      );
    }

    // ----------------------------------------------------------------
    // STEP 3: Run all guards before touching any financial data
    // ----------------------------------------------------------------

    await connectToDatabase();
    const Order = await getOrderModel();

    // Guard 1: Order must exist and belong to this student
    const order = await Order.findOne({
      _id: new mongoose.Types.ObjectId(mainOrderId),
      userId: new mongoose.Types.ObjectId(customerId),
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found." },
        { status: 404 },
      );
    }

    // Guard 2: Suborder must exist within the order
    const subOrder = order.subOrders.find(
      (sub) => sub._id?.toString() === subOrderId,
    );

    if (!subOrder) {
      return NextResponse.json(
        { success: false, error: "Suborder not found within this order." },
        { status: 404 },
      );
    }

    // Guard 3: Suborder must be in a deliverable state to be disputed
    // A student cannot dispute an order that was never marked as delivered. Not even out for delivery.
    // The `disputeableDeliveryStatuses` should not include the "out for delevery" else,
    // the vendor wallet will be in an incorrect state.
    const disputeableDeliveryStatuses = [DeliveryStatus.Delivered];

    if (!disputeableDeliveryStatuses.includes(subOrder.deliveryStatus)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A dispute can only be raised for suborders that are delivered.",
        },
        { status: 400 },
      );
    }

    // Guard 4: Transaction record must exist for this order
    const transactionRecord = await getTransactionRecordByOrderId(mainOrderId);

    if (!transactionRecord) {
      return NextResponse.json(
        {
          success: false,
          error: "Transaction record not found for this order.",
        },
        { status: 404 },
      );
    }

    // Guard 5: A financial breakdown must exist for this specific suborder
    const breakdown = transactionRecord.suborderBreakdowns.find(
      (b) => b.suborderId.toString() === subOrderId,
    );

    if (!breakdown) {
      return NextResponse.json(
        {
          success: false,
          error: "No financial breakdown found for this suborder.",
        },
        { status: 404 },
      );
    }

    // Guard 6: Suborder must be in PENDING financial status
    // SETTLED → funds already released, cannot dispute
    // DISPUTED → already has an open dispute
    // REFUNDED → already resolved in student's favour
    if (breakdown.status !== SuborderFinancialStatus.PENDING) {
      const statusMessages: Record<string, string> = {
        [SuborderFinancialStatus.SETTLED]:
          "This suborder has already been settled and cannot be disputed.",
        [SuborderFinancialStatus.DISPUTED]:
          "A dispute is already open for this suborder.",
        [SuborderFinancialStatus.REFUNDED]:
          "This suborder has already been refunded.",
      };

      return NextResponse.json(
        {
          success: false,
          error:
            statusMessages[breakdown.status] ??
            "This suborder cannot be disputed in its current state.",
        },
        { status: 400 },
      );
    }

    // Guard 7: Double-check at the dispute record level — no active dispute
    // should already exist for this suborder (partial unique index backs this up)
    const existingDispute = await getActiveDisputeBySuborderId(subOrderId);

    if (existingDispute) {
      return NextResponse.json(
        {
          success: false,
          error: "A dispute is already open for this suborder.",
        },
        { status: 409 },
      );
    }

    // ----------------------------------------------------------------
    // STEP 4: Upload evidence images to Cloudinary
    // Done BEFORE the DB session — Cloudinary is a network call and
    // cannot be part of a MongoDB transaction. If the DB writes fail,
    // the uploaded images are orphaned but harmless. If the upload
    // fails, nothing financial has been touched yet.
    // ----------------------------------------------------------------

    const evidenceUrls = await ProductImageUploadService.uploadImages(
      evidenceFiles,
      "disputes",
    );

    if (!evidenceUrls.length) {
      return NextResponse.json(
        { success: false, error: "Evidence upload failed. Please try again." },
        { status: 500 },
      );
    }

    // ----------------------------------------------------------------
    // STEP 5: Run all financial writes atomically within a session
    // ----------------------------------------------------------------

    await connectToDatabase();
    session = await mongoose.startSession();
    session.startTransaction();

    try {
      const now = new Date();
      const deadline = DateFormatter.addBusinessDays(
        now,
        DISPUTE_RESOLUTION_BUSINESS_DAYS,
        [0, 6],
      );

      // --- Create the Dispute Record ---
      const disputeRecord = await createDisputeRecord({
        suborderId: new mongoose.Types.ObjectId(subOrderId),
        orderId: new mongoose.Types.ObjectId(mainOrderId),
        customerId: new mongoose.Types.ObjectId(customerId),
        vendorId: breakdown.vendorId,
        reason: reason.trim(),
        evidence: evidenceUrls,
        status: DisputeStatus.OPEN,
        frozenAmount: breakdown.settleAmount,
        penaltyAmount: 0,
        openedAt: now,
        deadline,
        // NOTE: Pass session once helpers support it
      });

      // --- FUNDS_HELD ledger entry ---
      // Records the movement of this suborder's settle amount
      // from the vendor's pending balance into their disputed balance
      await createLedgerEntry({
        type: LedgerEntryType.DEBIT,
        category: LedgerEntryCategory.FUNDS_HELD,
        amount: breakdown.settleAmount,
        entityType: LedgerEntityType.VENDOR,
        entityId: breakdown.vendorId,
        referenceType: LedgerReferenceType.DISPUTE,
        referenceId: disputeRecord._id as mongoose.Types.ObjectId,
        description: `Funds frozen for open dispute on suborder ${subOrderId}`,
        metadata: {
          orderId: mainOrderId,
          subOrderId,
          frozenAmount: breakdown.settleAmount,
          deadline: deadline.toISOString(),
        },
        // NOTE: Pass session once helpers support it
      });

      // --- Update Transaction Record: suborder status → DISPUTED ---
      await updateSuborderFinancialStatus(
        mainOrderId,
        subOrderId,
        SuborderFinancialStatus.DISPUTED,
        // NOTE: Pass session once helpers support it
      );

      // --- Update Vendor Wallet: pending → disputed ---
      await freezeVendorFunds(
        breakdown.vendorId.toString(),
        breakdown.settleAmount,
        // NOTE: Pass session once helpers support it
      );

      await session.commitTransaction();

      return NextResponse.json(
        {
          success: true,
          message: "Dispute opened successfully.",
          data: {
            disputeId: (
              disputeRecord._id as mongoose.Types.ObjectId
            ).toString(),
            frozenAmount: breakdown.settleAmount,
            deadline: deadline.toISOString(),
            evidenceUrls,
          },
        },
        { status: 201 },
      );
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error: any) {
    console.error("[POST /api/disputes/open] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred while opening the dispute.",
      },
      { status: 500 },
    );
  }
}
