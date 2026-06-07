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
    // ----------------------------------------------------------------
    // STEP 1: Authenticate the student
    // ----------------------------------------------------------------
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

    const disputeId = formData.get("disputeId") as string | null;
    const evidenceFiles = formData.getAll("evidence") as File[];

    if (!disputeId) {
      return NextResponse.json(
        { success: false, error: "disputeId is required." },
        { status: 400 },
      );
    }

    if (!mongoose.Types.ObjectId.isValid(disputeId)) {
      return NextResponse.json(
        { success: false, error: "Invalid dispute ID format." },
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
    // STEP 3: Guards — verify state before uploading or writing anything
    // ----------------------------------------------------------------
    await connectToDatabase();

    // Guard 1: Dispute must exist
    const dispute = await getDisputeRecordById(disputeId);

    if (!dispute) {
      return NextResponse.json(
        { success: false, error: "Dispute not found." },
        { status: 404 },
      );
    }

    // Guard 2: Dispute must belong to this student
    if (dispute.customerId.toString() !== customerId) {
      return NextResponse.json(
        {
          success: false,
          error: "You are not authorised to submit evidence for this dispute.",
        },
        { status: 403 },
      );
    }

    // Guard 3: Dispute must be in AWAITING_EVIDENCE status
    // Only disputes marked inconclusive by the team accept additional evidence
    if (dispute.status !== DisputeStatus.AWAITING_EVIDENCE) {
      const statusMessages: Record<string, string> = {
        [DisputeStatus.OPEN]:
          "This dispute is currently under review. Additional evidence has not been requested yet.",
        [DisputeStatus.RESOLVED]: "This dispute has already been resolved.",
        [DisputeStatus.AUTO_RESOLVED]:
          "This dispute has already been auto-resolved.",
      };

      return NextResponse.json(
        {
          success: false,
          error:
            statusMessages[dispute.status] ??
            "Additional evidence cannot be submitted for this dispute in its current state.",
        },
        { status: 400 },
      );
    }

    // Guard 4: The 48-hour evidence window must not have expired
    // If it has, the background job will handle the rejection shortly
    const now = new Date();
    if (
      dispute.additionalEvidenceDeadline &&
      now > dispute.additionalEvidenceDeadline
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The evidence submission window has expired. The dispute will be resolved shortly.",
        },
        { status: 400 },
      );
    }

    // ----------------------------------------------------------------
    // STEP 4: Upload additional evidence images to Cloudinary
    // Done before any DB writes — same reasoning as open-dispute route
    // ----------------------------------------------------------------
    const additionalEvidenceUrls = await ProductImageUploadService.uploadImages(
      evidenceFiles,
      "disputes",
    );

    if (!additionalEvidenceUrls.length) {
      return NextResponse.json(
        { success: false, error: "Evidence upload failed. Please try again." },
        { status: 500 },
      );
    }

    // ----------------------------------------------------------------
    // STEP 5: Update dispute record
    // No financial writes — funds stay frozen until team re-evaluates
    // submitAdditionalEvidence moves dispute back to OPEN for re-evaluation
    // ----------------------------------------------------------------
    const updatedDispute = await submitAdditionalEvidence(
      disputeId,
      additionalEvidenceUrls,
    );

    if (!updatedDispute) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to update dispute record. Please try again.",
        },
        { status: 500 },
      );
    }

    // NOTE: Notify the platform team that additional evidence has been
    // submitted and the dispute is back to OPEN for re-evaluation.
    // Follow your existing NotificationFactory pattern.

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
  } catch (error: any) {
    console.error("[POST /api/disputes/submit-evidence] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred while submitting evidence.",
      },
      { status: 500 },
    );
  }
}
