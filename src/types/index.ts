export interface Category {
  slug: string;
  name: string;
  subcategories: {
    slug: string;
    name: string;
  }[];
}

export interface Product {
  _id: string; // Mongoose _id as string
  storeId: string;
  productType: "Product" | "digitalproducts";
  name: string;
  price?: number;
  sizes?: {
    size: string;
    price: number;
    quantity: number;
  }[];
  productQuantity: number;
  images: string[];
  description: string;
  specifications: string;
  category: string[];
  subCategory: string[];
  isVerifiedProduct: boolean;
  isVisible: boolean;
  slug: string;
  rating?: number;
  formattedPrice?: string;
  createdAt: string; // ISO date string
  updatedAt: string;
}

export interface User {
  _id: string; // Mongoose _id as string
  firstName: string;
  lastName: string;
  otherNames: string;
  email: string;
  phoneNumber: string;
  address: string;
  cityOfResidence: string;
  stateOfResidence: string;
  postalCode: string;
  isVerified: boolean;
  followingStores: string[]; // ObjectIds as strings
  stores: {
    storeId: string;
  }[];
  forgotpasswordToken?: string;
  forgotpasswordTokenExpiry?: string;
  verifyToken?: string;
  verifyTokenExpiry?: string;
  createdAt: string; // ISO strings
  updatedAt: string;
}

export interface CartProduct {
  _id: string; // Mongoose _id as string
  storeId: string; // Mongoose _id as string
  productType: string;
  name: string;
  price?: number;
  sizes?: {
    size: string;
    price: number;
    quantity: number;
  }[];
  images: string[];
  category: string[];
}

/**
 * Shipping method interface
 */
export interface ShippingMethod {
  name: string;
  price: number;
  description?: string;
  estimatedDeliveryDays?: number;
}
