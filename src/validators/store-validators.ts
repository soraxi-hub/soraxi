import { z } from "zod";
import { passwordValidation } from "./user-signUp-info-validation";
import {
  MAX_SHIPPING_DESCRIPTION_LENGTH,
  MIN_DELIVERY_DAYS,
  MIN_SHIPPING_DESCRIPTION_LENGTH,
  MIN_SHIPPING_METHOD_NAME_LENGTH,
} from "@/constants/shipping.constants";

/** "1 day", "2 days" — the minimum is 1 elsewhere in the app too, so this earns its keep. */
const dayWord = (days: number) => `${days} day${days === 1 ? "" : "s"}`;

export const storeName = z
  .string()
  .trim()
  .min(2, "Store name must be at least 2 characters")
  .max(50, "Store name must be less than 50 characters")
  .regex(
    /^[a-zA-Z0-9\s\-_'&.]+$/,
    "Store name can only contain letters, numbers, spaces, hyphens, underscores, apostrophes, ampersands and periods",
  );
export const storeDescription = z
  .string()
  .min(100, "Description must be at least 100 characters")
  .max(1500, "Description must not exceed 1500 characters")
  .optional();

export const storePassword = passwordValidation;

export const storeEmail = z
  .string()
  .min(1, "Store email is required")
  .email("Please enter a valid email address");

// -------------------------
// Sub-schemas
// -------------------------

/**
 * The single source of truth for what makes a store's delivery option valid.
 */
export const shippingMethodSchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .min(
      MIN_SHIPPING_METHOD_NAME_LENGTH,
      `Give the option a name customers will recognise — at least ${MIN_SHIPPING_METHOD_NAME_LENGTH} characters`,
    ),
  price: z.number().min(0, "Price must be 0 or greater"),
  estimatedDeliveryDays: z
    .number({ invalid_type_error: "Enter the number of days" })
    .min(MIN_DELIVERY_DAYS, `Minimum ${dayWord(MIN_DELIVERY_DAYS)}`),
  isActive: z.boolean().optional(),
  description: z
    .string()
    .min(
      MIN_SHIPPING_DESCRIPTION_LENGTH,
      `Tell customers a bit more — at least ${MIN_SHIPPING_DESCRIPTION_LENGTH} characters`,
    )
    .max(
      MAX_SHIPPING_DESCRIPTION_LENGTH,
      `Description must be less than ${MAX_SHIPPING_DESCRIPTION_LENGTH} characters`,
    ),
  applicableRegions: z.array(z.string()).optional(),
  conditions: z
    .object({
      minOrderValue: z.number().min(0).optional(),
      maxOrderValue: z.number().min(0).optional(),
      minWeight: z.number().min(0).optional(),
      maxWeight: z.number().min(0).optional(),
    })
    .optional(),
});

export type ShippingMethodInput = z.infer<typeof shippingMethodSchema>;

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
