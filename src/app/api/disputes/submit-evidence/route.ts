import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { ProductImageUploadService } from "@/lib/utils/cloudinary/cloudinary-server-side-upload";
import { getUserDataFromToken } from "@/lib/helpers/get-user-data-from-token";
import { AppError } from "@/lib/errors/app-error";
import { assertValidImageUpload } from "@/validators/validate-image-files";
import { handleApiError } from "@/lib/utils/handle-api-error";
import { DisputeService } from "@/services/disputes/dispute.service";

export async function POST(req: NextRequest) {
  try {
    const auth = await getUserDataFromToken(req);

    if (!auth)
      throw new AppError(
        "UNAUTHORIZED",
        "Sign in to submit evidence for your dispute.",
      );

    const form = await req.formData();
    const disputeId = form.get("disputeId") as string | null;
    const evidence = form.getAll("evidence") as File[];

    if (!disputeId || !mongoose.Types.ObjectId.isValid(disputeId))
      throw new AppError("BAD_REQUEST", "Invalid dispute ID format.");

    if (!evidence.length)
      throw new AppError(
        "BAD_REQUEST",
        "At least one evidence image is required.",
      );

    assertValidImageUpload(evidence);
    const urls = await ProductImageUploadService.uploadImages(
      evidence,
      "disputes",
    );

    if (!urls.length)
      throw new AppError(
        "INTERNAL_SERVER_ERROR",
        "Evidence upload failed. Please try again.",
      );

    const dispute = await DisputeService.submitAdditionalEvidence({
      disputeId,
      customerId: auth.id,
      evidence: urls,
    });

    return NextResponse.json({
      success: true,
      message:
        "Additional evidence submitted successfully. The platform team will review your case.",
      data: {
        disputeId,
        status: dispute.status,
        evidenceSubmittedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
