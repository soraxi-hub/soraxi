import { VendorApplicationRepository } from "../repositories/vendor-application-repository";
import {
  VendorApplicationCreateInput,
  VendorApplicationStatus,
} from "../domain/vendor-application";
import { VendorApplication } from "../domain/vendor-application/vendor-application";
import { VendorApplicationFactory } from "@/domain/vendor-application/vendor-application-factory";
import { siteConfig } from "@/config/site";
import {
  NotificationFactory,
  renderTemplate,
  VendorApplicationApprovedEmail,
  WaitlistConfirmationEmail,
  WaitlistRejectionEmail,
} from "@/domain/notification";
import { EmailTextTemplates } from "@/lib/utils/email-text-templates";
import React from "react";
import mongoose from "mongoose";
import { AppError } from "@/lib/errors/app-error";
import { StoreRepository } from "@/repositories/store-repo";
import { StoreService } from "./store/store.service";
import { generateDefaultPassword } from "@/lib/utils";
import { UserRepository } from "@/repositories/user-repo";
import { ProductImageUploadService } from "@/lib/utils/cloudinary/cloudinary-server-side-upload";
import { sendTelegramMessage } from "@/lib/utils/telegram/send-message";
import {
  formatErrorReport,
  isReportableError,
} from "@/lib/utils/telegram/format-error-report";

interface ApplyResult {
  referenceId: string;
  email: string;
}

interface StatusResult {
  referenceId: string;
  status: string;
  rejectionReason?: string;
  businessName: string;
  createdAt: Date;
}

interface AdminApplicationSummary {
  id: string;
  referenceId: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  institution: string;
  /** Retired fields — present only on applications submitted before we stopped asking. */
  stateOfApplicant?: string;
  cityOfApplicant?: string;
  categoryId: string;
  subCategory?: string;
  categoryVendorCount: number;
  productSamples: string[];
  cacNumber?: string;
  instagramHandle?: string;
  otherProofUrl?: string;
  estimatedInventorySize?: string;
  estimatedPriceRange?: { min: number; max: number };
  isDropshipper: boolean;
  status: string;
  rejectionReason?: string;
  reviewedBy?: string;
  createdAt: Date;
}

export class WaitlistService {
  constructor(
    private vendorApplicationRepository: VendorApplicationRepository,
  ) {}

  // ─── Vendor: Submit application ───────────────────────────────────────────

  async apply(
    input: Omit<VendorApplicationCreateInput, "productSamples"> & {
      productSamples: File[];
    },
  ): Promise<ApplyResult> {
    const normalizedEmail = input.email.toLowerCase().trim();

    // Check if user already has a store
    const existingUserStore = await UserRepository.hasStore(input.submittedBy);
    if (existingUserStore)
      throw new AppError("CONFLICT", "Cannot create multiple stores");

    const alreadyApplied =
      await this.vendorApplicationRepository.existsByEmail(normalizedEmail);

    if (alreadyApplied) {
      throw new AppError(
        "CONFLICT",
        "An application with this email is already under review or has been approved.",
        { email: input.email },
      );
    }

    // Check if store email already exists
    const existingStoreEmail =
      await StoreRepository.isExistingStoreEmail(normalizedEmail);
    if (existingStoreEmail)
      throw new AppError("CONFLICT", "This email is already in use", {
        email: normalizedEmail,
      });

    // Check if store name already exists (case-insensitive)
    const existingStoreName = await StoreRepository.isExistingstoreName(
      input.businessName,
    );
    if (existingStoreName)
      throw new AppError("CONFLICT", "Bussiness name already in use", {
        businessName: input.businessName,
      });

    const uploadedSamples = await ProductImageUploadService.uploadImages(
      input.productSamples,
      "storeWaitlist",
    );

    const application = VendorApplicationFactory.create({
      ...input,
      productSamples: uploadedSamples,
    });
    await this.vendorApplicationRepository.create(application);

    // Send confirmation email with application.referenceId
    try {
      const subject = `Application Received - ${siteConfig.name} Vendor Waitlist`;
      const html = await renderTemplate(
        React.createElement(WaitlistConfirmationEmail, {
          businessName: application.businessName,
          referenceId: application.referenceId,
        }),
      );
      const text = EmailTextTemplates.generateWaitlistConfirmationText(
        application.businessName,
        application.referenceId,
      );

      const notification = NotificationFactory.create("email", {
        recipient: application.email,
        subject,
        emailType: "noreply",
        fromAddress: "noreply@soraxihub.com",
        html,
        text,
      });

      await notification.send();
    } catch (error) {
      console.error(
        `Failed to send confirmation email to ${application.email}:`,
        error,
      );
      // Do not throw – application is already created, email failure shouldn't block the flow
    }

    return {
      referenceId: application.referenceId,
      email: application.email,
    };
  }

  // ─── Vendor: Check status ─────────────────────────────────────────────────

  async checkStatus(email: string, referenceId: string): Promise<StatusResult> {
    const application =
      await this.vendorApplicationRepository.findByEmailAndReferenceId(
        email,
        referenceId,
      );

    if (!application) {
      throw new AppError(
        "NOT_FOUND",
        "No application found for the provided email and reference ID.",
        { email, referenceId },
      );
    }

    return {
      referenceId: application.referenceId,
      status: application.status,
      rejectionReason: application.isRejected()
        ? application.rejectionReason
        : undefined,
      businessName: application.businessName,
      createdAt: application.createdAt,
    };
  }

  // ─── Admin: Fetch applications ───────────────────────────────────────────

  /**
   * A page of applications for the given status, plus the count of every
   * status so the admin summary row can show all four at once.
   *
   * @param status - One status, or "all" for every application.
   */
  async getApplications(
    status: VendorApplicationStatus | "all",
    page: number,
    limit: number,
  ): Promise<{
    applications: AdminApplicationSummary[];
    total: number;
    pages: number;
    statusCounts: Record<VendorApplicationStatus, number>;
  }> {
    const [{ applications, total }, statusCounts] = await Promise.all([
      this.vendorApplicationRepository.findAllByStatus(status, page, limit),
      this.vendorApplicationRepository.countsByStatus(),
    ]);

    const summaries = await Promise.all(
      applications.map((app) => this.toAdminSummary(app)),
    );

    return {
      applications: summaries,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
      statusCounts,
    };
  }

  async getPendingApplicationById(applicationId: string): Promise<{
    application: AdminApplicationSummary;
  }> {
    const application =
      await this.vendorApplicationRepository.findById(applicationId);

    if (!application) {
      throw new AppError(
        "NOT_FOUND",
        "Couldn't retrieve any apllication with this Id.",
        { applicationId },
      );
    }

    const summary = await this.toAdminSummary(application);

    return {
      application: summary,
    };
  }

  // ─── Admin: Approve application ───────────────────────────────────────────

  async approveApplication(
    applicationId: string,
    adminId: string,
  ): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const application =
        await this.vendorApplicationRepository.findById(applicationId);

      if (!application) {
        throw new AppError("NOT_FOUND", "Application not found.", {
          applicationId,
          adminId,
        });
      }

      application.approve(adminId);

      await this.vendorApplicationRepository.save(application, session);
      const password = generateDefaultPassword(application.businessName);

      // Approval creates the store outright — the vendor signs in with the
      // temporary password below, so there is no invite to issue or redeem.
      const savedStore = await StoreService.createStore(
        {
          storeName: application.businessName,
          storeEmail: application.email,
          password,
          ownerId: application.submittedBy,
        },
        session,
      );

      const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/store/${savedStore._id.toString()}/dashboard`;
      const subject = `You're invited to join ${siteConfig.name} as a vendor`;
      const html = await renderTemplate(
        React.createElement(VendorApplicationApprovedEmail, {
          businessName: application.businessName,
          loginUrl,
          email: application.email,
          temporaryPassword: password,
        }),
      );
      const text = EmailTextTemplates.generateVendorApplicationApprovedText(
        application.businessName,
        application.email,
        password,
        loginUrl,
      );

      const notification = NotificationFactory.create("email", {
        recipient: application.email,
        subject,
        emailType: "noreply",
        fromAddress: "noreply@soraxihub.com",
        html,
        text,
      });

      await notification.send();
      await session.commitTransaction();
      session.endSession();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // ─── Admin: Reject application ────────────────────────────────────────────

  async rejectApplication(
    applicationId: string,
    adminId: string,
    reason: string,
  ): Promise<void> {
    const application =
      await this.vendorApplicationRepository.findById(applicationId);

    if (!application) {
      throw new AppError("NOT_FOUND", "Application not found.", {
        applicationId,
        adminId,
        reason,
      });
    }

    application.reject(reason, adminId);
    await this.vendorApplicationRepository.save(application);

    // Send rejection email with reason
    try {
      const subject = `Update on your ${siteConfig.name} vendor application`;
      const html = await renderTemplate(
        React.createElement(WaitlistRejectionEmail, {
          businessName: application.businessName,
          reason,
        }),
      );
      const text = EmailTextTemplates.generateWaitlistRejectionText(
        application.businessName,
        reason,
      );

      const notification = NotificationFactory.create("email", {
        recipient: application.email,
        subject,
        emailType: "noreply",
        fromAddress: "noreply@soraxihub.com",
        html,
        text,
      });

      await notification.send();
    } catch (error) {
      console.error(
        `Failed to send rejection email to ${application.email}:`,
        error,
      );
      // Do not throw – application is already rejected, email failure shouldn't block
      if (isReportableError(error)) {
        try {
          await sendTelegramMessage(
            formatErrorReport(error, {
              source: "service:waitlist.rejectApplication",
            }),
          );
        } catch {
          // sendTelegramMessage already console.errors internally; never mask the original error
        }
      }
    }
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async toAdminSummary(
    app: VendorApplication,
  ): Promise<AdminApplicationSummary> {
    const categoryVendorCount =
      await this.vendorApplicationRepository.countByCategory(app.categoryId);

    return {
      id: app.id,
      referenceId: app.referenceId,
      businessName: app.businessName,
      ownerName: app.ownerName,
      email: app.email,
      phone: app.phone,
      categoryId: app.categoryId,
      institution: app.institution,
      stateOfApplicant: app.stateOfApplicant,
      cityOfApplicant: app.cityOfApplicant,
      subCategory: app.subCategory,
      categoryVendorCount,
      productSamples: app.productSamples,
      cacNumber: app.cacNumber,
      instagramHandle: app.instagramHandle,
      otherProofUrl: app.otherProofUrl,
      estimatedInventorySize: app.estimatedInventorySize,
      estimatedPriceRange: app.estimatedPriceRange,
      isDropshipper: app.isDropshipper,
      status: app.status,
      rejectionReason: app.rejectionReason,
      reviewedBy: app.reviewedBy,
      createdAt: app.createdAt,
    };
  }
}
