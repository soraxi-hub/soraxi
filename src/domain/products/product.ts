import { IProduct, Size } from "@/lib/db/models/product.model";
import { IProductInfo, PublicToJSON } from "./product-interface";
import { ProductStatusEnum, ProductTypeEnum } from "@/enums";
import { formatNaira, koboToNaira } from "@/lib/utils/naira";
import { siteConfig } from "@/config/site";
import { getCategoryName, getSubCategoryName } from "@/constants/constant";
import { getFieldName } from "@/constants/fields-constants";

export type BaseProductProps = Omit<IProduct, "_id" | "storeId"> & {
  _id?: string;
  storeId: string;
};

/**
 * Product domain model
 *
 * This class provides a clean abstraction layer over raw product data
 * and exposes readonly getters for accessing product information.
 */
export class Product implements IProductInfo {
  constructor(protected props: BaseProductProps) {}

  /**
   * Unique product identifier
   */
  get productId(): string | undefined {
    return this.props._id;
  }

  /**
   * Store identifier
   */
  get storeId(): string {
    return this.props.storeId;
  }

  /**
   * Product type
   */
  get productType(): ProductTypeEnum {
    return this.props.productType;
  }

  /**
   * Product name
   */
  get name(): string {
    return this.props.name;
  }

  /**
   * Base product price
   */
  get price(): number | undefined {
    return this.props.price;
  }

  /**
   * Raw numeric naira value
   * Example: 5000
   */
  get priceInNaira(): number {
    return koboToNaira(this.price ?? 0);
  }

  /**
   * Formatted display value
   * Example: ₦5,000
   */
  get formattedPrice(): string {
    return formatNaira(this.price ?? 0);
  }

  /**
   * Available product sizes/variants
   */
  get sizes(): Size[] | undefined {
    return this.props.sizes;
  }

  /**
   * Total product quantity in stock
   */
  get productQuantity(): number | undefined {
    return this.props.productQuantity;
  }

  /**
   * Product image URLs
   */
  get images(): string[] | undefined {
    return this.props.images;
  }

  /**
   * Product description
   */
  get description(): string | undefined {
    return this.props.description;
  }

  /**
   * Technical specifications/details
   */
  get specifications(): string | undefined {
    return this.props.specifications;
  }

  /**
   * Product categories
   */
  get category(): string[] | undefined {
    return this.props.category;
  }

  get formattedCategory(): string | undefined {
    return getCategoryName((this.category ?? [])[0]);
  }

  /**
   * Product subcategories
   */
  get subCategory(): string[] | undefined {
    return this.props.subCategory;
  }

  get formattedSubCategory(): string | undefined {
    return getSubCategoryName(
      (this.category ?? [])[0],
      (this.subCategory ?? [])[0],
    );
  }

  /**
   * Intended audience for the product
   */
  get targetAudience(): string[] | undefined {
    return this.props.targetAudience;
  }

  get formatteTargetAudience(): string | undefined {
    return getFieldName((this.targetAudience ?? [])[0]);
  }

  /**
   * Whether the product has been verified
   */
  get isVerifiedProduct(): boolean {
    return this.props.isVerifiedProduct;
  }

  /**
   * Product moderation/publication status
   */
  get status(): ProductStatusEnum {
    return this.props.status;
  }

  /**
   * Determines whether product is publicly visible
   */
  get isVisible(): boolean {
    return this.props.isVisible;
  }

  /**
   * SEO-friendly slug
   */
  get slug(): string {
    return this.props.slug;
  }

  /**
   * Average product rating
   */
  get rating(): number | undefined {
    return this.props.rating;
  }

  /**
   * Product creation date
   */
  get createdAt(): Date {
    return this.props.createdAt;
  }

  /**
   * Product last update date
   */
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /**
   * First approval timestamp
   */
  get firstApprovedAt(): Date | undefined {
    return this.props.firstApprovedAt;
  }

  /**
   * Convert domain object into plain JSON object
   */
  toJSON(): PublicToJSON {
    if (!this.productId) {
      throw new Error("ProductId Required");
    }
    return {
      productId: this.productId,
      storeId: this.storeId,
      productType: this.productType,
      name: this.name,
      price: this.priceInNaira,
      formattedPrice: this.formattedPrice,
      sizes: this.sizes,
      productQuantity: this.productQuantity ?? 0,
      images: this.images ?? [siteConfig.placeHolderImg],
      description: this.description ?? "",
      specifications: this.specifications ?? "",
      category: this.category ?? [],
      formattedCategory: this.formattedCategory,
      subCategory: this.subCategory ?? [],
      formattedSubCategory: this.formattedSubCategory,
      targetAudience: this.targetAudience,
      isVerifiedProduct: this.isVerifiedProduct,
      status: this.status,
      isVisible: this.isVisible,
      slug: this.slug,
      rating: this.rating ?? 0,
    };
  }

  toEditableProuct() {
    if (!this.productId) {
      throw new Error("ProductId Required");
    }
    return {
      id: this.productId,
      storeId: this.storeId,
      productType: this.productType,
      name: this.name,
      price: this.priceInNaira,
      sizes: this.sizes,
      productQuantity: this.productQuantity,
      images: this.images,
      description: this.description,
      specifications: this.specifications,
      category:
        this.formattedCategory !== undefined
          ? [this.formattedCategory]
          : undefined,
      subCategory:
        this.formattedSubCategory !== undefined
          ? [this.formattedSubCategory]
          : undefined,
      targetAudience:
        this.formatteTargetAudience !== undefined
          ? [this.formatteTargetAudience]
          : undefined,
      isVerifiedProduct: this.isVerifiedProduct,
      status: this.status,
      isVisible: this.isVisible,
      createdAt: this.createdAt,
      slug: this.slug,
      rating: this.rating,
      firstApprovedAt: this.firstApprovedAt,
    };
  }
}
