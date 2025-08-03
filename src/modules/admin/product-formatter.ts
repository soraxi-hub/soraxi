import { IProduct } from "@/lib/db/models/product.model";
import mongoose from "mongoose";

/**
 * Type definitions for product data structures
 */

export interface PopulatedStore {
  _id: mongoose.Types.ObjectId;
  name: string;
  storeEmail: string;
}

export interface RawProductDocument {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  price: number;
  category: string;
  status: IProduct["status"];
  images: string[];
  storeID: PopulatedStore | mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface FormattedProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  status: IProduct["status"];
  images: string[];
  store: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Type Guard: Check if store is populated
 */
function isPopulatedStore(store: any): store is PopulatedStore {
  return (
    store &&
    typeof store === "object" &&
    "name" in store &&
    "storeEmail" in store
  );
}

/**
 * Format Single Product Document
 */
export function formatProductDocument(
  rawProduct: RawProductDocument
): FormattedProduct {
  // Validate store population
  if (!isPopulatedStore(rawProduct.storeID)) {
    throw new Error(`Product ${rawProduct._id} has unpopulated store`);
  }

  return {
    id: rawProduct._id.toString(),
    name: rawProduct.name,
    description: rawProduct.description,
    price: rawProduct.price,
    category: rawProduct.category,
    status: rawProduct.status || "",
    images: rawProduct.images || [],
    store: {
      id: rawProduct.storeID._id.toString(),
      name: rawProduct.storeID.name,
      email: rawProduct.storeID.storeEmail,
    },
    createdAt: rawProduct.createdAt,
    updatedAt: rawProduct.updatedAt,
  };
}

/**
 * Format Multiple Product Documents
 */
export function formatProductDocuments(
  rawProducts: RawProductDocument[]
): FormattedProduct[] {
  return rawProducts.map((product) => formatProductDocument(product));
}

/**
 * Format Product List Response
 */
export interface FormattedProductListResponse {
  products: FormattedProduct[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export function formatProductListResponse(
  rawProducts: RawProductDocument[],
  total: number,
  page: number,
  limit: number
): FormattedProductListResponse {
  return {
    products: formatProductDocuments(rawProducts),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}
