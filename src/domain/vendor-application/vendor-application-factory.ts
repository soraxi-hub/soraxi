import { randomBytes } from "crypto";
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
    const referenceId = VendorApplicationFactory.generateReferenceId();
    const now = new Date();

    return new VendorApplication({
      id,
      referenceId,
      status: "pending",

      businessName: input.businessName.trim(),
      ownerName: input.ownerName.trim(),
      email: input.email.toLowerCase().trim(),
      phone: input.phone.trim(),

      categoryId: input.categoryId,
      subCategory: input.subCategory?.trim(),

      productSamples: input.productSamples,

      cacNumber: input.cacNumber?.trim(),
      instagramHandle: input.instagramHandle?.trim(),
      otherProofUrl: input.otherProofUrl?.trim(),

      estimatedInventorySize: input.estimatedInventorySize,
      estimatedPriceRange: input.estimatedPriceRange,

      isDropshipper: input.isDropshipper,

      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Generates a secure one-time invite token with a 14-day expiry.
   */
  static generateInviteToken(): { token: string; expiresAt: Date } {
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);
    return { token, expiresAt };
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
