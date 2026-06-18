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
import { freezeVendorFunds } from "@/lib/db/models/vendor-wallet.model";
import { JournalEntryWriter } from "@/services/journal-entry-writer.service";
import {
  SuborderFinancialStatus,
  DisputeStatus,
} from "@/enums/financial.enums";
import { DeliveryStatus } from "@/enums";
import { getUserDataFromToken } from "@/lib/helpers/get-user-data-from-token";
import { DateFormatter } from "@/lib/utils/date-formatter";
import { AppError } from "@/lib/errors/app-error";
import { handleApiError } from "@/lib/utils/handle-api-error";

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
    // STEP 1: Authenticate the student
    const authSession = await getUserDataFromToken(req);
    if (!authSession) {
      throw new AppError("UNAUTHORIZED", "Unauthorized");
    }
    const customerId = authSession.id;

    // STEP 2: Parse and validate FormData inputs
    const formData = await req.formData();

    const mainOrderId = formData.get("mainOrderId") as string | null;
    const subOrderId = formData.get("subOrderId") as string | null;
    const reason = formData.get("reason") as string | null;
    const evidenceFiles = formData.getAll("evidence") as File[];

    if (!mainOrderId || !subOrderId || !reason) {
      throw new AppError(
        "BAD_REQUEST",
        "mainOrderId, subOrderId, and reason are required.",
        { mainOrderId, subOrderId, reason },
      );
    }

    if (
      !mongoose.Types.ObjectId.isValid(mainOrderId) ||
      !mongoose.Types.ObjectId.isValid(subOrderId)
    ) {
      throw new AppError(
        "BAD_REQUEST",
        "Invalid mainOrderId or subOrderId format.",
        { mainOrderId, subOrderId },
      );
    }

    if (reason.trim().length < 20) {
      throw new AppError(
        "BAD_REQUEST",
        "Please provide a detailed reason (at least 20 characters).",
        { reasonLength: reason.trim().length },
      );
    }

    if (!evidenceFiles.length) {
      throw new AppError(
        "BAD_REQUEST",
        "At least one evidence image is required.",
      );
    }

    // STEP 3: Run all guards before touching any financial data
    await connectToDatabase();
    const Order = await getOrderModel();

    // Guard 1: Order must exist and belong to this student
    const order = await Order.findOne({
      _id: new mongoose.Types.ObjectId(mainOrderId),
      userId: new mongoose.Types.ObjectId(customerId),
    });

    if (!order) {
      throw new AppError("NOT_FOUND", "Order not found.", { mainOrderId });
    }

    // Guard 2: Suborder must exist
    const subOrder = order.subOrders.find(
      (sub) => sub._id?.toString() === subOrderId,
    );

    if (!subOrder) {
      throw new AppError("NOT_FOUND", "Suborder not found within this order.", {
        mainOrderId,
        subOrderId,
      });
    }

    // Guard 3: Suborder must be delivered
    const disputeableDeliveryStatuses = [DeliveryStatus.Delivered];
    if (!disputeableDeliveryStatuses.includes(subOrder.deliveryStatus)) {
      throw new AppError(
        "BAD_REQUEST",
        "A dispute can only be raised for suborders that are delivered.",
        { deliveryStatus: subOrder.deliveryStatus },
      );
    }

    // Guard 4: Transaction record exists
    const transactionRecord = await getTransactionRecordByOrderId(mainOrderId);
    if (!transactionRecord) {
      throw new AppError(
        "NOT_FOUND",
        "Transaction record not found for this order.",
        { mainOrderId },
      );
    }

    // Guard 5: Financial breakdown exists
    const breakdown = transactionRecord.suborderBreakdowns.find(
      (b) => b.suborderId.toString() === subOrderId,
    );
    if (!breakdown) {
      throw new AppError(
        "NOT_FOUND",
        "No financial breakdown found for this suborder.",
        { subOrderId },
      );
    }

    // Guard 6: Financial status must be PENDING
    if (breakdown.status !== SuborderFinancialStatus.PENDING) {
      const statusMessages: Record<string, string> = {
        [SuborderFinancialStatus.SETTLED]:
          "This suborder has already been settled and cannot be disputed.",
        [SuborderFinancialStatus.DISPUTED]:
          "A dispute is already open for this suborder.",
        [SuborderFinancialStatus.REFUNDED]:
          "This suborder has already been refunded.",
      };

      throw new AppError(
        "BAD_REQUEST",
        statusMessages[breakdown.status] ??
          "This suborder cannot be disputed in its current state.",
        { currentStatus: breakdown.status },
      );
    }

    // Guard 7: No existing active dispute
    const existingDispute = await getActiveDisputeBySuborderId(subOrderId);
    if (existingDispute) {
      throw new AppError(
        "CONFLICT",
        "A dispute is already open for this suborder.",
        { subOrderId, existingDisputeId: existingDispute._id },
      );
    }

    // STEP 4: Upload evidence images to Cloudinary
    const evidenceUrls = await ProductImageUploadService.uploadImages(
      evidenceFiles,
      "disputes",
    );

    if (!evidenceUrls.length) {
      throw new AppError(
        "INTERNAL_SERVER_ERROR",
        "Evidence upload failed. Please try again.",
      );
    }

    // STEP 5: Run all financial writes atomically within a session
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

      const disputeRecord = await createDisputeRecord(
        {
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
        },
        session,
      );

      const writer = await JournalEntryWriter.init();

      await writer.writeDisputeOpened({
        vendorId: breakdown.vendorId,
        settleAmount: breakdown.settleAmount,
        disputeId: disputeRecord._id as mongoose.Types.ObjectId,
        session,
      });

      await updateSuborderFinancialStatus(
        mainOrderId,
        subOrderId,
        SuborderFinancialStatus.DISPUTED,
        session,
      );

      await freezeVendorFunds(
        breakdown.vendorId.toString(),
        breakdown.settleAmount,
        session,
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
  } catch (error) {
    console.error("[POST /api/disputes/open] Error:", error);
    return handleApiError(error);
  }
}
