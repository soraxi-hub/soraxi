import { ProductStatusEnum, ProductTypeEnum } from "@/enums";
import { Size } from "@/lib/db/models/product.model";

export interface IProductInfo {
  productId?: string;
  storeId: string;
  productType: ProductTypeEnum;
  name: string;
  price?: number;
  sizes?: Size[];
  productQuantity?: number;
  images?: string[];
  description?: string;
  specifications?: string;
  category?: string[];
  subCategory?: string[];
  targetAudience?: string[];
  isVerifiedProduct: boolean;
  status: ProductStatusEnum;
  isVisible: boolean;
  slug: string;
  rating?: number;
  createdAt: Date;
  updatedAt: Date;

  firstApprovedAt?: Date;
}

export type DecoratableProductInfo = Pick<
  IProductInfo,
  | "productType"
  | "name"
  | "price"
  | "sizes"
  | "productQuantity"
  | "images"
  | "description"
  | "specifications"
  | "category"
  | "subCategory"
  | "targetAudience"
>;

export type PublicToJSON = Omit<
  IProductInfo,
  | "productId"
  | "price"
  | "category"
  | "firstApprovedAt"
  | "updatedAt"
  | "createdAt"
  | "productQuantity"
  | "images"
  | "description"
  | "specifications"
  | "rating"
> & {
  productId: string;
  price: number;
  formattedPrice: string;
  images: string[];
  description: string;
  specifications: string;
  productQuantity: number;
  category: string[];
  formattedCategory: string | undefined;
  formattedSubCategory: string | undefined;
  rating: number;
};

export type UploadProductAction = "draft" | "publish";

export type GetPublicProductsInput = {
  page: number;
  visibleOnly?: boolean;
  category?: string;
  subCategory?: string;
  targetAudience?: string;
  limit?: number;
  skip?: number;
  minRating?: number;
  search?: string | null;
  verified?: boolean;
  sort?: "newest" | "price-asc" | "price-desc" | "rating-desc";
  priceMin?: number;
  priceMax?: number;
  ratings?: number[];
  cursor?: string;
};
