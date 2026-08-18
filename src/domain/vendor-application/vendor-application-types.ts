export type VendorApplicationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "invited";

export type InventorySize = "small" | "medium" | "large";

export interface PriceRange {
  min: number;
  max: number;
}

export interface VendorApplicationProps {
  id: string;
  referenceId: string;
  status: VendorApplicationStatus;
  submittedBy: string;
  /**
   * No longer collected — the applicant's location is on their account, and the
   * waitlist form stopped asking. Optional so applications submitted before the
   * change still round-trip through the domain layer.
   */
  stateOfApplicant?: string;
  cityOfApplicant?: string;

  // Contact & business
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  institution: string;

  // Category
  categoryId: string;
  subCategory?: string;

  // Product samples
  productSamples: string[];

  // Business proof
  cacNumber?: string;
  instagramHandle?: string;
  otherProofUrl?: string;

  // Inventory intent — no longer collected. `isDropshipper` already tells a
  // reviewer whether stock is held, which is the part that drove decisions.
  estimatedInventorySize?: InventorySize;
  estimatedPriceRange?: PriceRange;

  // Model
  isDropshipper: boolean;

  // Admin
  reviewedBy?: string;
  reviewNote?: string;
  rejectionReason?: string;
  inviteToken?: string;
  inviteExpiresAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * What a vendor actually submits today. Location, subcategory, inventory size,
 * and price range are deliberately absent — see the notes on
 * `VendorApplicationProps` for the fields kept only for historical records.
 */
export interface VendorApplicationCreateInput {
  submittedBy: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  institution: string;
  categoryId: string;
  productSamples: string[];
  cacNumber?: string;
  instagramHandle?: string;
  otherProofUrl?: string;
  isDropshipper: boolean;
}
