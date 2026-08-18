import mongoose from "mongoose";
import { VendorApplicationCreateInput } from "./vendor-application-types";
import { VendorApplication } from "./vendor-application";

export class VendorApplicationFactory {
  /**
   * Creates a new VendorApplication entity from user-submitted input.
   * Generates a referenceId and sets default status to "pending".
   */
  static create(input: VendorApplicationCreateInput): VendorApplication {
    const id = new mongoose.Types.ObjectId().toString();
    const submittedBy = new mongoose.Types.ObjectId(
      input.submittedBy,
    ).toString();
    const referenceId = VendorApplicationFactory.generateReferenceId();
    const now = new Date();

    return new VendorApplication({
      id,
      referenceId,
      status: "pending",
      submittedBy,
      businessName: input.businessName.trim(),
      ownerName: input.ownerName.trim(),
      email: input.email.toLowerCase().trim(),
      phone: input.phone.trim(),
      institution: input.institution,
      categoryId: input.categoryId,

      productSamples: input.productSamples,

      cacNumber: input.cacNumber?.trim(),
      instagramHandle: input.instagramHandle?.trim(),
      otherProofUrl: input.otherProofUrl?.trim(),

      isDropshipper: input.isDropshipper,

      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Generates a human-readable reference ID for vendor lookups.
   * Format: SRX-YYYY-NNNNN (e.g. SRX-2025-00042)
   */
  private static generateReferenceId(): string {
    const year = new Date().getFullYear();
    const suffix = Math.floor(Math.random() * 99999)
      .toString()
      .padStart(5, "0");
    return `SRX-${year}-${suffix}`;
  }
}
