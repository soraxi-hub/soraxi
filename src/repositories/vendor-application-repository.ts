import mongoose from "mongoose";
import { VendorApplication } from "../domain/vendor-application/vendor-application";
import {
  VendorApplicationProps,
  VendorApplicationStatus,
} from "../domain/vendor-application";
import {
  IVendorApplication,
  VendorApplicationModel,
} from "@/lib/db/models/vendor-application.model";

export class VendorApplicationRepository {
  // ─── Mapping ──────────────────────────────────────────────────────────────

  private toDomain(doc: IVendorApplication): VendorApplication {
    const props: VendorApplicationProps = {
      id: doc._id.toString(),
      referenceId: doc.referenceId,
      status: doc.status,
      submittedBy: doc.submittedBy.toString(),
      institution: doc.institution,
      cityOfApplicant: doc.cityOfApplicant,
      stateOfApplicant: doc.stateOfApplicant,
      businessName: doc.businessName,
      ownerName: doc.ownerName,
      email: doc.email,
      phone: doc.phone,

      categoryId: doc.categoryId,
      subCategory: doc.subCategory,

      productSamples: doc.productSamples,

      cacNumber: doc.cacNumber,
      instagramHandle: doc.instagramHandle,
      otherProofUrl: doc.otherProofUrl,

      estimatedInventorySize: doc.estimatedInventorySize,
      estimatedPriceRange: doc.estimatedPriceRange,

      isDropshipper: doc.isDropshipper,

      reviewedBy: doc.reviewedBy?.toString(),
      reviewNote: doc.reviewNote,
      rejectionReason: doc.rejectionReason,
      inviteToken: doc.inviteToken,
      inviteExpiresAt: doc.inviteExpiresAt,

      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };

    return new VendorApplication(props);
  }

  // ─── Queries ──────────────────────────────────────────────────────────────

  async findById(id: string): Promise<VendorApplication | null> {
    const doc =
      await VendorApplicationModel.findById(id).lean<IVendorApplication>();
    if (!doc) return null;
    return this.toDomain(doc);
  }

  async findByReferenceId(
    referenceId: string,
  ): Promise<VendorApplication | null> {
    const doc = await VendorApplicationModel.findOne({
      referenceId,
    }).lean<IVendorApplication>();
    if (!doc) return null;
    return this.toDomain(doc);
  }

  async findByEmailAndReferenceId(
    email: string,
    referenceId: string,
  ): Promise<VendorApplication | null> {
    const doc = await VendorApplicationModel.findOne({
      email: email.toLowerCase().trim(),
      referenceId,
    }).lean<IVendorApplication>();
    if (!doc) return null;
    return this.toDomain(doc);
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await VendorApplicationModel.countDocuments({
      email: email.toLowerCase().trim(),
      status: { $in: ["pending", "approved", "invited"] },
    });
    return count > 0;
  }

  /**
   * Applications for one status, or every application when passed "all".
   */
  async findAllByStatus(
    status: VendorApplicationStatus | "all",
    page: number = 1,
    limit: number = 20,
  ): Promise<{ applications: VendorApplication[]; total: number }> {
    const skip = (page - 1) * limit;
    const filter = status === "all" ? {} : { status };

    const [docs, total] = await Promise.all([
      VendorApplicationModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<IVendorApplication[]>(),
      VendorApplicationModel.countDocuments(filter),
    ]);

    return {
      applications: docs.map(this.toDomain.bind(this)),
      total,
    };
  }

  /**
   * How many applications sit in each status. One grouped query rather than a
   * count per status, so the admin summary row costs a single round trip.
   */
  async countsByStatus(): Promise<Record<VendorApplicationStatus, number>> {
    const rows = await VendorApplicationModel.aggregate<{
      _id: VendorApplicationStatus;
      count: number;
    }>([{ $group: { _id: "$status", count: { $sum: 1 } } }]);

    // Seeded with zeroes so a status with no applications reads as 0, not blank.
    const counts: Record<VendorApplicationStatus, number> = {
      pending: 0,
      approved: 0,
      rejected: 0,
      invited: 0,
    };

    for (const row of rows) {
      if (row._id in counts) counts[row._id] = row.count;
    }

    return counts;
  }

  async countByCategory(categoryId: string): Promise<number> {
    return VendorApplicationModel.countDocuments({
      categoryId: categoryId,
      status: { $in: ["approved", "invited"] },
    });
  }

  // ─── Persistence ──────────────────────────────────────────────────────────

  async save(
    application: VendorApplication,
    session?: mongoose.ClientSession,
  ): Promise<void> {
    const props = application.toProps();

    await VendorApplicationModel.updateOne(
      { _id: new mongoose.Types.ObjectId(props.id) },
      {
        $set: {
          status: props.status,
          reviewedBy: props.reviewedBy
            ? new mongoose.Types.ObjectId(props.reviewedBy)
            : undefined,
          reviewNote: props.reviewNote,
          rejectionReason: props.rejectionReason,
          inviteToken: props.inviteToken,
          inviteExpiresAt: props.inviteExpiresAt,
          updatedAt: props.updatedAt,
        },
      },
      { session },
    );
  }

  async create(application: VendorApplication): Promise<void> {
    const props = application.toProps();

    await VendorApplicationModel.create({
      _id: new mongoose.Types.ObjectId(props.id),
      referenceId: props.referenceId,
      status: props.status,
      submittedBy: props.submittedBy,
      institution: props.institution,
      businessName: props.businessName,
      ownerName: props.ownerName,
      email: props.email.toLowerCase().trim(),
      phone: props.phone,

      categoryId: props.categoryId,

      productSamples: props.productSamples,

      cacNumber: props.cacNumber,
      instagramHandle: props.instagramHandle,
      otherProofUrl: props.otherProofUrl,

      isDropshipper: props.isDropshipper,
    });
  }
}
