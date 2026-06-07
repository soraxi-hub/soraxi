import { DecoratableProductInfo } from "../product-interface";
import { ProductTypeEnum } from "@/enums";
import { Size } from "@/lib/db/models/product.model";

export abstract class ProductDecorator implements DecoratableProductInfo {
  protected decorator: DecoratableProductInfo;

  constructor(props: DecoratableProductInfo) {
    this.decorator = props;
  }

  /**
   * Product type
   */
  get productType(): ProductTypeEnum {
    return this.decorator.productType;
  }

  /**
   * Product name
   */
  get name(): string {
    return this.decorator.name;
  }

  /**
   * Base product price
   */
  get price(): number | undefined {
    return this.decorator.price;
  }

  /**
   * Available product sizes/variants
   */
  get sizes(): Size[] | undefined {
    return this.decorator.sizes;
  }

  /**
   * Total product quantity in stock
   */
  get productQuantity(): number | undefined {
    return this.decorator.productQuantity;
  }

  /**
   * Product image URLs
   */
  get images(): string[] | undefined {
    return this.decorator.images;
  }

  /**
   * Product description
   */
  get description(): string | undefined {
    return this.decorator.description;
  }

  /**
   * Technical specifications/details
   */
  get specifications(): string | undefined {
    return this.decorator.specifications;
  }

  /**
   * Product categories
   */
  get category(): string[] | undefined {
    return this.decorator.category;
  }

  /**
   * Product subcategories
   */
  get subCategory(): string[] | undefined {
    return this.decorator.subCategory;
  }

  /**
   * Intended audience for the product
   */
  get targetAudience(): string[] | undefined {
    return this.decorator.targetAudience;
  }
}
