import { z } from "zod";
import { storePassword } from "./store-validators";
import { formatNaira } from "@/lib/utils/naira";

/**
 * Enum for Product Status
 */
export enum ProductStatusEnum {
  Draft = "draft",
  Pending = "pending",
  Approved = "approved",
  Rejected = "rejected",
  Archived = "archived",
}

export enum ProductActionEnum {
  Draft = "draft",
  Publish = "publish",
}

export enum ProductTypeEnum {
  Product = "Product", // Keep it like this for proper DB reference to the Product Schema
}

export const ProductSizesSchema = z
  .array(
    z.object({
      size: z.string().min(1, "Size is required"),
      price: z.number().min(500, "Price must be greater than 499"),
      quantity: z.number().min(0, "Quantity cannot be negative"),
    })
  )
  .optional();

export const productId = z.string().optional();

export const productStoreId = z.string();

export const productName = z
  .string()
  .min(5, "Product name must be at least 5 characters")
  .max(100, "Product name must be less than 100 characters");

export const productType = z
  .nativeEnum(ProductTypeEnum)
  .default(ProductTypeEnum.Product);

export const productPrice = z
  .number()
  .min(500, "Price must be greater than 499")
  .max(100000, `Price must be less than ${formatNaira(10000000)}.`)
  .optional();

export const productQuantity = z
  .number()
  .min(1, "Product Quantity must be at least 1")
  .optional();

export const productSizes = ProductSizesSchema;

export const productImages = z.array(z.string()).default([]);

export const productDescription = z
  .string()
  .min(50, "Description must be at least 50 characters")
  .optional();

export const productSpecifications = z
  .string()
  .min(50, "Specifications must be at least 50 characters")
  .optional();

export const productCategory = z
  .array(z.string())
  .min(1, "Category is required")
  .optional();

export const productSubCategory = z
  .array(z.string())
  .min(1, "Subcategory is required")
  .optional();

export const productStorePassword = storePassword; // Reusing the existing storePassword validator

// You can also recreate the complete schema by combining all the individual validators:
export const ProductFormDataSchema = z.object({
  name: productName,
  description: productDescription,
  specifications: productSpecifications,
  price: productPrice,
  productQuantity: productQuantity,
  category: productCategory,
  subCategory: productSubCategory,
  storePassword: productStorePassword,
  productType: productType,
});

export type ProductFormData = z.infer<typeof ProductFormDataSchema>;
