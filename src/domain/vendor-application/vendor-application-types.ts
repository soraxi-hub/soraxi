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

  // Contact & business
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;

  // Category
  categoryId: string;
  subCategory?: string;

  // Product samples
  productSamples: string[];

  // Business proof
  cacNumber?: string;
  instagramHandle?: string;
  otherProofUrl?: string;

  // Inventory intent
  estimatedInventorySize: InventorySize;
  estimatedPriceRange: PriceRange;

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

export interface VendorApplicationCreateInput {
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  categoryId: string;
  subCategory?: string;
  productSamples: string[];
  cacNumber?: string;
  instagramHandle?: string;
  otherProofUrl?: string;
  estimatedInventorySize: InventorySize;
  estimatedPriceRange: PriceRange;
  isDropshipper: boolean;
}
