import { VendorApplicationProps } from "./vendor-application-types";

export class VendorApplication {
  constructor(private props: VendorApplicationProps) {}

  get id() {
    return this.props.id;
  }

  get cityOfApplicant() {
    return this.props.cityOfApplicant;
  }

  get stateOfApplicant() {
    return this.props.stateOfApplicant;
  }

  get submittedBy() {
    return this.props.submittedBy;
  }

  get referenceId() {
    return this.props.referenceId;
  }

  get status() {
    return this.props.status;
  }

  get email() {
    return this.props.email;
  }

  get businessName() {
    return this.props.businessName;
  }

  get ownerName() {
    return this.props.ownerName;
  }

  get phone() {
    return this.props.phone;
  }

  get institution() {
    return this.props.institution;
  }

  get categoryId() {
    return this.props.categoryId;
  }

  get subCategory() {
    return this.props.subCategory;
  }

  get productSamples() {
    return this.props.productSamples;
  }

  get cacNumber() {
    return this.props.cacNumber;
  }

  get instagramHandle() {
    return this.props.instagramHandle;
  }

  get otherProofUrl() {
    return this.props.otherProofUrl;
  }

  get estimatedInventorySize() {
    return this.props.estimatedInventorySize;
  }

  get estimatedPriceRange() {
    return this.props.estimatedPriceRange;
  }

  get isDropshipper() {
    return this.props.isDropshipper;
  }

  get reviewedBy() {
    return this.props.reviewedBy;
  }

  get reviewNote() {
    return this.props.reviewNote;
  }

  get rejectionReason() {
    return this.props.rejectionReason;
  }

  get inviteToken() {
    return this.props.inviteToken;
  }

  get inviteExpiresAt() {
    return this.props.inviteExpiresAt;
  }

  get createdAt() {
    return this.props.createdAt;
  }

  get updatedAt() {
    return this.props.updatedAt;
  }

  // ─── Business rules ───────────────────────────────────────────────────────

  isPending() {
    return this.props.status === "pending";
  }

  isInvited() {
    return this.props.status === "invited";
  }

  isRejected() {
    return this.props.status === "rejected";
  }

  hasInviteExpired(): boolean {
    if (!this.props.inviteExpiresAt) return false;
    return new Date() > this.props.inviteExpiresAt;
  }

  isInviteTokenValid(token: string): boolean {
    if (this.props.inviteToken !== token) return false;
    if (this.hasInviteExpired()) return false;
    return true;
  }

  canBeApproved(): boolean {
    return this.props.status === "pending";
  }

  canBeRejected(): boolean {
    return this.props.status === "pending";
  }

  // ─── State transitions ────────────────────────────────────────────────────

  approve(_inviteToken: string, _inviteExpiresAt: Date, adminId: string): void {
    if (!this.canBeApproved()) {
      throw new Error(
        `Application ${this.props.referenceId} cannot be approved from status: ${this.props.status}`,
      );
    }

    // No need for the invite token since we are autogenerating the store for the vendor
    this.props.status = "approved";
    // this.props.inviteToken = inviteToken;
    // this.props.inviteExpiresAt = inviteExpiresAt;
    this.props.reviewedBy = adminId;
    this.props.updatedAt = new Date();
  }

  markAsInvited(): void {
    if (this.props.status !== "approved") {
      throw new Error(
        `Application ${this.props.referenceId} cannot be marked as invited from status: ${this.props.status}`,
      );
    }

    this.props.status = "invited";
    this.props.updatedAt = new Date();
  }

  reject(reason: string, adminId: string): void {
    if (!this.canBeRejected()) {
      throw new Error(
        `Application ${this.props.referenceId} cannot be rejected from status: ${this.props.status}`,
      );
    }

    this.props.status = "rejected";
    this.props.rejectionReason = reason;
    this.props.reviewedBy = adminId;
    this.props.updatedAt = new Date();
  }

  toProps(): VendorApplicationProps {
    return { ...this.props };
  }
}
