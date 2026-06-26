import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/utils/handle-api-error";
import { AppError } from "@/lib/errors/app-error";
import { VendorApplicationRepository } from "@/repositories/vendor-application-repository";
import { WaitlistService } from "@/services/waitlist-service";
import { z } from "zod";
import { getUserDataFromToken } from "@/lib/helpers/get-user-data-from-token";
import { MAX_WAITLIST_PRODUCT_SAMPLE_IMAGES } from "@/constants/image.constants";

const vendorApplicationRepository = new VendorApplicationRepository();
const waitlistService = new WaitlistService(vendorApplicationRepository);

// Zod schema for validating the application data (same as in procedure.ts, but adapted for FormData input)
const formDataSchema = z.object({
  businessName: z.string().min(2).max(100),
  ownerName: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(7).max(14),
  institution: z.string().min(2).max(150),
  cityOfApplicant: z.string().min(2).max(20),
  stateOfApplicant: z.string().min(2).max(20),
  categoryId: z.string().min(1),
  subCategory: z.string().max(100).optional(),
  estimatedInventorySize: z.enum(["small", "medium", "large"]),
  estimatedPriceMin: z.coerce.number().min(0),
  estimatedPriceMax: z.coerce.number().min(0),
  isDropshipper: z.enum(["true", "false"]).transform((val) => val === "true"),
  cacNumber: z.string().max(50).optional(),
  instagramHandle: z.string().max(60).optional(),
  otherProofUrl: z.string().url().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate the student
    const authSession = await getUserDataFromToken(request);

    if (!authSession) {
      throw new AppError("UNAUTHORIZED", "Login to submit a waitlist");
    }

    const submittedBy = authSession.id;

    // 1. Parse FormData
    const formData = await request.formData();

    // 2. Extract and validate text fields
    const rawFields: Record<string, unknown> = {};

    for (const [key, value] of formData.entries()) {
      // Skip file fields
      if (key !== "productSamples" && typeof value === "string") {
        rawFields[key] = value;
      }
    }

    const validatedFields = formDataSchema.parse(rawFields);

    // Build the price range object expected by the service
    const estimatedPriceRange = {
      min: validatedFields.estimatedPriceMin,
      max: validatedFields.estimatedPriceMax,
    };

    // 3. Extract uploaded product sample files
    const productSampleFiles = formData.getAll("productSamples") as File[];
    if (productSampleFiles.length === 0) {
      throw new AppError(
        "BAD_REQUEST",
        "At least one product sample image is required",
      );
    }
    if (productSampleFiles.length > MAX_WAITLIST_PRODUCT_SAMPLE_IMAGES) {
      throw new AppError("BAD_REQUEST", "Maximum 4 product samples allowed");
    }

    // 4. Prepare input for WaitlistService
    const serviceInput = {
      submittedBy,
      institution: validatedFields.institution,
      cityOfApplicant: validatedFields.cityOfApplicant,
      stateOfApplicant: validatedFields.stateOfApplicant,
      businessName: validatedFields.businessName,
      ownerName: validatedFields.ownerName,
      email: validatedFields.email,
      phone: validatedFields.phone,
      categoryId: validatedFields.categoryId,
      subCategory: validatedFields.subCategory,
      productSamples: productSampleFiles,
      cacNumber: validatedFields.cacNumber,
      instagramHandle: validatedFields.instagramHandle,
      otherProofUrl: validatedFields.otherProofUrl,
      estimatedInventorySize: validatedFields.estimatedInventorySize,
      estimatedPriceRange,
      isDropshipper: validatedFields.isDropshipper,
    };

    const result = await waitlistService.apply(serviceInput);

    return NextResponse.json({
      success: true,
      referenceId: result.referenceId,
      email: validatedFields.email,
      message: `Application received. Your reference ID is ${result.referenceId}. Check your email for confirmation.`,
    });
  } catch (error) {
    console.error("Error submitting waitlist application:", error);
    return handleApiError(error);
  }
}
