import {
  IStore,
  IShippingMethod,
  IPayoutAccount,
} from "@/lib/db/models/store.model";
import { StoreStatusEnum } from "@/enums";
import { StoreInterface } from "./store-interface";
import { AppError } from "@/lib/errors/app-error";

export type StoreProps = Omit<IStore, "storeOwner"> & { storeOwner: string };

export class Store implements StoreInterface {
  constructor(protected props: StoreProps) {}

  // -------------------------
  // BASIC INFO
  // -------------------------
  get storeId(): string {
    if (!this.props._id) throw new AppError("BAD_REQUEST", "Store ID required");

    return this.props._id.toString();
  }

  get storeName(): string {
    return this.props.name.trim();
  }

  get email(): string {
    return this.props.storeEmail;
  }

  get uniqueId(): string {
    return this.props.uniqueId;
  }

  get ownerId(): string | undefined {
    return this.props.storeOwner.toString();
  }

  get password(): string | undefined {
    return this.props.password;
  }

  set password(password: string) {
    this.props.password = password;
  }

  // -------------------------
  // RELATIONS
  // -------------------------
  get followers(): string[] {
    return (this.props.followers ?? []).map((id) => id.toString());
  }

  get products(): string[] {
    return (this.props.physicalProducts ?? []).map((id) => id.toString());
  }

  get followersCount(): number {
    return this.followers.length ?? 0;
  }

  get productsCount(): number {
    return this.products.length ?? 0;
  }

  get description(): string {
    return this.props.description ?? "";
  }

  // -------------------------
  // VERIFICATION
  // -------------------------
  get verification() {
    return this.props.verification;
  }

  get isVerified(): boolean {
    return this.props.verification?.isVerified ?? false;
  }

  get verificationMethod() {
    return this.props.verification?.method;
  }

  get verifiedAt(): Date | undefined {
    return this.props.verification?.verifiedAt;
  }

  // -------------------------
  // BUSINESS INFO
  // -------------------------
  get businessInfo() {
    return this.props.businessInfo;
  }

  get businessName(): string | undefined {
    return this.props.businessInfo?.businessName;
  }

  get businessType() {
    return this.props.businessInfo?.type;
  }

  get registrationNumber(): string | undefined {
    return this.props.businessInfo?.registrationNumber;
  }

  // -------------------------
  // RATINGS
  // -------------------------
  get averageRating(): number {
    return this.props.ratings?.averageRating ?? 0;
  }

  get reviewCount(): number {
    return this.props.ratings?.reviewCount ?? 0;
  }

  get complaintCount(): number {
    return this.props.ratings?.complaintCount ?? 0;
  }

  // -------------------------
  // STATUS / MODERATION
  // -------------------------
  get status() {
    return this.props.status;
  }

  get isActive(): boolean {
    return this.props.status === StoreStatusEnum.Active;
  }

  get suspensionReason(): string | undefined {
    return this.props.suspensionReason;
  }

  // -------------------------
  // LEGAL
  // -------------------------
  get agreedToTermsAt(): Date | undefined {
    return this.props.agreedToTermsAt;
  }

  // -------------------------
  // SECURITY
  // -------------------------
  get lastOtpRequestAt(): Date | undefined {
    return this.props.lastOtpRequestAt;
  }

  get otpBlockedUntil(): Date | undefined {
    return this.props.otpRequestBlockedUntil;
  }

  get isOtpBlocked(): boolean {
    if (!this.props.otpRequestBlockedUntil) return false;
    return new Date() < this.props.otpRequestBlockedUntil;
  }

  // -------------------------
  // FINANCIALS
  // -------------------------
  get walletId(): string | undefined {
    return this.props.walletId?.toString();
  }

  // -------------------------
  // SHIPPING
  // -------------------------
  get shippingMethods(): IShippingMethod[] {
    return this.props.shippingMethods || [];
  }

  get activeShippingMethods(): IShippingMethod[] {
    return this.shippingMethods.filter((m) => m.isActive !== false);
  }

  // -------------------------
  // PAYOUTS
  // -------------------------
  get payoutAccounts(): IPayoutAccount[] {
    return this.props.payoutAccounts || [];
  }

  get hasPayoutSetup(): boolean {
    return this.payoutAccounts.length > 0;
  }

  // -------------------------
  // TIMESTAMPS
  // -------------------------
  get createdAt(): Date | undefined {
    return this.props.createdAt;
  }

  get updatedAt(): Date | undefined {
    return this.props.updatedAt;
  }

  // -------------------------
  // SECURITY SAFE OUTPUT
  // -------------------------
  public toPublicJSON() {
    const { password, ...publicData } = this.props;
    return publicData;
  }
}
