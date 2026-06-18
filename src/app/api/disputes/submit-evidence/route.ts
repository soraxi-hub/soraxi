import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import { ProductImageUploadService } from "@/lib/utils/cloudinary/cloudinary-server-side-upload";
import {
  getDisputeRecordById,
  submitAdditionalEvidence,
} from "@/lib/db/models/dispute-record.model";
import { DisputeStatus } from "@/enums/financial.enums";
import { getUserDataFromToken } from "@/lib/helpers/get-user-data-from-token";
import { AppError } from "@/lib/errors/app-error";
import { handleApiError } from "@/lib/utils/handle-api-error";

/**
 * POST /api/disputes/submit-evidence
 *
 * Allows a student to submit additional evidence for an inconclusive dispute.
 * Only valid when dispute status is AWAITING_EVIDENCE and the student's
 * 48-hour evidence window has not yet expired.
 *
 * Handles:
 * - Additional evidence image upload to Cloudinary
 * - Moves dispute back to OPEN status for re-evaluation by platform team
 *
 * No financial writes — funds remain frozen until team re-evaluates.
 *
 * Expected FormData fields:
 * - disputeId: string
 * - evidence: File[] (one or more image files)
 */
export async function POST(req: NextRequest) {
  try {
    // STEP 1: Authenticate the student
    const authSession = await getUserDataFromToken(req);
    if (!authSession) {
      throw new AppError("UNAUTHORIZED", "Unauthorized");
    }
    const customerId = authSession.id;

    // STEP 2: Parse and validate FormData inputs
    const formData = await req.formData();

    const disputeId = formData.get("disputeId") as string | null;
    const evidenceFiles = formData.getAll("evidence") as File[];

    if (!disputeId) {
      throw new AppError("BAD_REQUEST", "disputeId is required.");
    }

    if (!mongoose.Types.ObjectId.isValid(disputeId)) {
      throw new AppError("BAD_REQUEST", "Invalid dispute ID format.", {
        disputeId,
      });
    }

    if (!evidenceFiles.length) {
      throw new AppError(
        "BAD_REQUEST",
        "At least one evidence image is required.",
      );
    }

    // STEP 3: Guards — verify state before uploading or writing anything
    await connectToDatabase();

    // Guard 1: Dispute must exist
    const dispute = await getDisputeRecordById(disputeId);

    if (!dispute) {
      throw new AppError("NOT_FOUND", "Dispute not found.", { disputeId });
    }

    // Guard 2: Dispute must belong to this student
    if (dispute.customerId.toString() !== customerId) {
      throw new AppError(
        "FORBIDDEN",
        "You are not authorised to submit evidence for this dispute.",
        { disputeId, customerId, disputeCustomerId: dispute.customerId },
      );
    }

    // Guard 3: Dispute must be in AWAITING_EVIDENCE status
    if (dispute.status !== DisputeStatus.AWAITING_EVIDENCE) {
      const statusMessages: Record<string, string> = {
        [DisputeStatus.OPEN]:
          "This dispute is currently under review. Additional evidence has not been requested yet.",
        [DisputeStatus.RESOLVED]: "This dispute has already been resolved.",
        [DisputeStatus.AUTO_RESOLVED]:
          "This dispute has already been auto-resolved.",
      };

      throw new AppError(
        "BAD_REQUEST",
        statusMessages[dispute.status] ??
          "Additional evidence cannot be submitted for this dispute in its current state.",
        { currentStatus: dispute.status },
      );
    }

    // Guard 4: The 48-hour evidence window must not have expired
    const now = new Date();
    if (
      dispute.additionalEvidenceDeadline &&
      now > dispute.additionalEvidenceDeadline
    ) {
      throw new AppError(
        "BAD_REQUEST",
        "The evidence submission window has expired. The dispute will be resolved shortly.",
        { deadline: dispute.additionalEvidenceDeadline },
      );
    }

    // STEP 4: Upload additional evidence images to Cloudinary
    const additionalEvidenceUrls = await ProductImageUploadService.uploadImages(
      evidenceFiles,
      "disputes",
    );

    if (!additionalEvidenceUrls.length) {
      throw new AppError(
        "INTERNAL_SERVER_ERROR",
        "Evidence upload failed. Please try again.",
      );
    }

    // STEP 5: Update dispute record
    const updatedDispute = await submitAdditionalEvidence(
      disputeId,
      additionalEvidenceUrls,
    );

    if (!updatedDispute) {
      throw new AppError(
        "INTERNAL_SERVER_ERROR",
        "Failed to update dispute record. Please try again.",
        { disputeId },
      );
    }

    // NOTE: Notify the platform team that additional evidence has been
    // submitted and the dispute is back to OPEN for re-evaluation.

    return NextResponse.json(
      {
        success: true,
        message:
          "Additional evidence submitted successfully. The platform team will review your case.",
        data: {
          disputeId,
          status: updatedDispute.status,
          evidenceSubmittedAt: now.toISOString(),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[POST /api/disputes/submit-evidence] Error:", error);
    return handleApiError(error);
  }
}
