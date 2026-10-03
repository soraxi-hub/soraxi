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

  canBeApproved(): boolean {
    return this.props.status === "pending";
  }

  canBeRejected(): boolean {
    return this.props.status === "pending";
  }

  canIssueInvite(): boolean {
    return this.props.status === "approved" || this.props.status === "invited";
  }

  // ─── State transitions ────────────────────────────────────────────────────

  /**
   * Marks the application approved. The vendor still has to redeem an invite
   * link (see `issueInvite`) to actually set up their store.
   */
  approve(adminId: string): void {
    if (!this.canBeApproved()) {
      throw new Error(
        `Application ${this.props.referenceId} cannot be approved from status: ${this.props.status}`,
      );
    }

    this.props.status = "approved";
    this.props.reviewedBy = adminId;
    this.props.updatedAt = new Date();
  }

  /**
   * Issues a signup invite: stores a hash of the token (never the raw value)
   * and moves the application to "invited". The caller emails the raw token
   * to the vendor as a link; it's redeemed by the store-creation flow.
   */
  issueInvite(tokenHash: string, expiresAt: Date): void {
    if (!this.canIssueInvite()) {
      throw new Error(
        `Application ${this.props.referenceId} cannot be invited from status: ${this.props.status}`,
      );
    }

    this.props.status = "invited";
    this.props.inviteToken = tokenHash;
    this.props.inviteExpiresAt = expiresAt;
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
