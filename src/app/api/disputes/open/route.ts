import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { ProductImageUploadService } from "@/lib/utils/cloudinary/cloudinary-server-side-upload";
import { getUserDataFromToken } from "@/lib/helpers/get-user-data-from-token";
import { AppError } from "@/lib/errors/app-error";
import { assertValidImageUpload } from "@/validators/validate-image-files";
import { handleApiError } from "@/lib/utils/handle-api-error";
import { MessagingEvents } from "@/services/messaging/messaging-events";
import { DisputeService } from "@/services/disputes/dispute.service";
import { sendTelegramMessage } from "@/lib/utils/telegram/send-message";
import {
  formatErrorReport,
  isReportableError,
} from "@/lib/utils/telegram/format-error-report";

/** Multipart transport adapter only. Business and financial orchestration live
 * in DisputeService so every caller follows the same transaction boundary. */
export async function POST(req: NextRequest) {
  try {
    const auth = await getUserDataFromToken(req);

    if (!auth)
      throw new AppError(
        "UNAUTHORIZED",
        "Sign in to raise a dispute on your order.",
      );

    const formData = await req.formData();
    const orderId = formData.get("mainOrderId") as string | null;
    const suborderId = formData.get("subOrderId") as string | null;
    const reason = formData.get("reason") as string | null;
    const evidence = formData.getAll("evidence") as File[];

    if (!orderId || !suborderId || !reason)
      throw new AppError(
        "BAD_REQUEST",
        "mainOrderId, subOrderId, and reason are required.",
      );

    if (
      !mongoose.Types.ObjectId.isValid(orderId) ||
      !mongoose.Types.ObjectId.isValid(suborderId)
    )
      throw new AppError(
        "BAD_REQUEST",
        "Invalid mainOrderId or subOrderId format.",
      );

    if (reason.trim().length < 20)
      throw new AppError(
        "BAD_REQUEST",
        "Please provide a detailed reason (at least 20 characters).",
      );

    if (!evidence.length)
      throw new AppError(
        "BAD_REQUEST",
        "At least one evidence image is required.",
      );

    assertValidImageUpload(evidence);
    const evidenceUrls = await ProductImageUploadService.uploadImages(
      evidence,
      "disputes",
    );

    if (!evidenceUrls.length)
      throw new AppError(
        "INTERNAL_SERVER_ERROR",
        "Evidence upload failed. Please try again.",
      );

    const dispute = await DisputeService.openDispute({
      orderId,
      suborderId,
      customerId: auth.id,
      reason,
      evidence: evidenceUrls,
    });

    await MessagingEvents.disputeOpened({
      subOrderId: suborderId,
      disputeId: (dispute._id as mongoose.Types.ObjectId).toString(),
    }).catch((error) =>
      console.error(
        "[POST /api/disputes/open] post-commit event failed:",
        error,
      ),
    );

    return NextResponse.json(
      {
        success: true,
        message: "Dispute opened successfully.",
        data: {
          disputeId: (dispute._id as mongoose.Types.ObjectId).toString(),
          frozenAmount: dispute.frozenAmount,
          deadline: dispute.deadline.toISOString(),
          evidenceUrls,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/disputes/open] Error:", error);
    if (isReportableError(error)) {
      try {
        await sendTelegramMessage(
          formatErrorReport(error, { source: "POST /api/disputes/open" }),
        );
      } catch {}
    }
    return handleApiError(error);
  }
}
