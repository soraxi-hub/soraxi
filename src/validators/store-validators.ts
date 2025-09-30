import { z } from "zod";

export enum StoreStatusEnum {
  Active = "active",
  Suspended = "suspended",
  Pending = "pending",
  Rejected = "rejected",
}

export enum StoreVerificationStatusEnum {
  Email = "email",
  Identity = "identity",
  videoCall = "video_call",
}

export enum StoreBusinessInfoEnum {
  Individual = "individual",
  Company = "company",
}

export const storeName = z
  .string()
  .trim()
  .min(2, "Store name must be at least 2 characters")
  .max(50, "Store name must be less than 50 characters")
  .regex(
    /^[a-zA-Z0-9\s\-_']+$/,
    "Store name can only contain letters, numbers, spaces, hyphens, underscores, and apostrophes"
  );
export const storeDescription = z
  .string()
  .min(100, "Description must be at least 100 characters")
  .max(1500, "Description must not exceed 1500 characters")
  .optional();

export const storePassword = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    "Password must contain at least one uppercase letter, one lowercase letter, and one number"
  );

export const storeEmail = z
  .string()
  .min(1, "Store email is required")
  .email("Please enter a valid email address");

// -------------------------
// Sub-schemas
// -------------------------
export const ShippingMethodSchema = z.object({
  _id: z.string().optional(), // mongoose ObjectId as string
  name: z.string().min(1, "Shipping method name is required"),
  price: z.number().nonnegative("Price must be non-negative"),
  estimatedDeliveryDays: z.number().int().min(1).optional(), // Estimated number of days for delivery after order placement (e.g., "3-5 days")
  isActive: z.boolean().optional().default(true),
  description: z.string().optional(),
  applicableRegions: z.array(z.string()).optional(),
  conditions: z
    .object({
      minOrderValue: z.number().optional(),
      maxOrderValue: z.number().optional(),
      minWeight: z.number().optional(),
      maxWeight: z.number().optional(),
    })
    .optional(),
});

export const PayoutAccountSchema = z.object({
  payoutMethod: z.literal("Bank Transfer"), // only one supported
  bankDetails: z.object({
    bankName: z.string().min(1, "Bank name is required"),
    accountNumber: z.string().min(1, "Bank account number is required"),
    accountHolderName: z.string().min(1, "Account holder name is required"),
    bankCode: z.number().min(1, "Bank code is required"),
    bankId: z.number().optional(),
  }),
});

// -------------------------
// Store Schema
// -------------------------
export const StoreSchema = z.object({
  _id: z.string().optional(), // mongoose ObjectId as string
  name: storeName,
  password: storePassword,
  storeOwner: z.string(), // ObjectId
  storeEmail: storeEmail,
  uniqueId: z.string(),

  followers: z.array(z.string()).default([]), // ObjectId[]
  physicalProducts: z.array(z.string()).default([]), // ObjectId[]

  // Branding
  logoUrl: z.string().url().optional(),
  bannerUrl: z.string().url().optional(),
  description: storeDescription,

  // Verification
  verification: z
    .object({
      isVerified: z.boolean().default(false),
      method: z
        .nativeEnum(StoreVerificationStatusEnum)
        .default(StoreVerificationStatusEnum.Email),
      verifiedAt: z.date().optional(),
      notes: z.string().optional(),
    })
    .optional(),

  // Business Registration Info
  businessInfo: z
    .object({
      businessName: z.string().optional(),
      registrationNumber: z.string().optional(),
      taxId: z.string().optional(),
      type: z
        .nativeEnum(StoreBusinessInfoEnum)
        .default(StoreBusinessInfoEnum.Individual),
      documentUrls: z.array(z.string().url()).optional(),
    })
    .optional(),

  // Ratings
  ratings: z
    .object({
      averageRating: z.number().default(0),
      reviewCount: z.number().default(0),
      complaintCount: z.number().default(0),
    })
    .optional(),

  // Store Status & Moderation
  status: z.nativeEnum(StoreStatusEnum).default(StoreStatusEnum.Pending),
  suspensionReason: z.string().optional(),

  // Legal Agreement
  agreedToTermsAt: z.date().optional(),

  // Security
  forgotpasswordToken: z.string().optional(),
  forgotpasswordTokenExpiry: z.date().optional(),

  // Financials
  walletId: z.string(), // ObjectId

  // Shipping
  shippingMethods: z.array(ShippingMethodSchema).default([]),

  // Payouts
  payoutAccounts: z.array(PayoutAccountSchema).default([]),

  // Metadata
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// -------------------------
// Inferred Type
// -------------------------
export type StoreType = z.infer<typeof StoreSchema>;
export type StorePayoutAccount = z.infer<typeof PayoutAccountSchema>;
export type StoreShippingMethod = z.infer<typeof ShippingMethodSchema>;

/**
 * Store Creation Form Schema
 * Validates store name, email, and password for new store creation.
 * Used for creating a store before onboarding in the create store page
 */
export const createStoreSchema = z
  .object({
    storeName: storeName,
    storeEmail: storeEmail,
    password: storePassword,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
