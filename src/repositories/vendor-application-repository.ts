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

  async findByInviteToken(token: string): Promise<VendorApplication | null> {
    const doc = await VendorApplicationModel.findOne({
      inviteToken: token,
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

  async findAllByStatus(
    status: VendorApplicationStatus,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ applications: VendorApplication[]; total: number }> {
    const skip = (page - 1) * limit;

    const [docs, total] = await Promise.all([
      VendorApplicationModel.find({ status })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<IVendorApplication[]>(),
      VendorApplicationModel.countDocuments({ status }),
    ]);

    return {
      applications: docs.map(this.toDomain.bind(this)),
      total,
    };
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

      businessName: props.businessName,
      ownerName: props.ownerName,
      email: props.email.toLowerCase().trim(),
      phone: props.phone,

      categoryId: props.categoryId,
      subCategory: props.subCategory,

      productSamples: props.productSamples,

      cacNumber: props.cacNumber,
      instagramHandle: props.instagramHandle,
      otherProofUrl: props.otherProofUrl,

      estimatedInventorySize: props.estimatedInventorySize,
      estimatedPriceRange: props.estimatedPriceRange,

      isDropshipper: props.isDropshipper,
    });
  }
}
