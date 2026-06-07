import { ProductDecorator } from "./product-decorator";
import {
  productCategory,
  productDescription,
  productName,
  productPrice,
  productQuantity,
  productSpecifications,
  productStorePassword,
  productSubCategory,
  productTargetAudience,
} from "@/validators/product-validators";

export type ProductValidationErrors = Partial<
  Record<
    | "name"
    | "price"
    | "description"
    | "specifications"
    | "productQuantity"
    | "category"
    | "subCategory"
    | "targetAudience"
    | "images"
    | "storePassword",
    string
  >
>;

export const MIN_IMAGE_NUMBER = 1;
export const MAX_IMAGE_NUMBER = 3;
export const MAX_IMAGE_FILE_SIZE = 4 * 1024 * 1024; // 4MB

export class ProductValidation extends ProductDecorator {
  private getFirstError(result: any) {
    return result.error?.errors[0]?.message || "Validation failed";
  }

  /**
   * Validates a field only if it has a value.
   * Used for draft validation.
   */
  private validateOptionalField<T>(
    value: T,
    schema: any,
    errorKey: keyof ProductValidationErrors,
    errors: ProductValidationErrors,
    shouldValidate = true,
  ) {
    if (!shouldValidate) return;

    const result = schema.safeParse(value);

    if (!result.success) {
      errors[errorKey] = this.getFirstError(result);
    }
  }

  /**
   * Strict required validation.
   * Used for publish validation.
   */
  private validateRequiredField<T>(
    value: T,
    schema: any,
    errorKey: keyof ProductValidationErrors,
    errors: ProductValidationErrors,
    requiredMessage: string,
  ) {
    const isEmpty =
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0);

    if (isEmpty) {
      errors[errorKey] = requiredMessage;
      return;
    }

    const result = schema.safeParse(value);

    if (!result.success) {
      errors[errorKey] = this.getFirstError(result);
    }
  }

  /**
   * Draft validation
   *
   * Only validates fields that already contain values.
   * Allows partial saves.
   */
  validateDraft(storePassword: string) {
    const errors: ProductValidationErrors = {};

    // name
    this.validateOptionalField(
      this.name,
      productName,
      "name",
      errors,
      !!this.name,
    );

    // description
    this.validateOptionalField(
      this.description,
      productDescription,
      "description",
      errors,
      !!this.description && this.description !== "<p><br></p>",
    );

    // specifications
    this.validateOptionalField(
      this.specifications,
      productSpecifications,
      "specifications",
      errors,
      !!this.specifications && this.specifications !== "<p><br></p>",
    );

    // price
    this.validateOptionalField(
      this.price,
      productPrice,
      "price",
      errors,
      this.price !== undefined && this.price !== 0,
    );

    // quantity
    this.validateOptionalField(
      this.productQuantity,
      productQuantity,
      "productQuantity",
      errors,
      this.productQuantity !== undefined && this.productQuantity !== 0,
    );

    // category
    this.validateOptionalField(
      this.category,
      productCategory,
      "category",
      errors,
      !!this.category?.length,
    );

    // subcategory
    this.validateOptionalField(
      this.subCategory,
      productSubCategory,
      "subCategory",
      errors,
      !!this.subCategory?.length,
    );

    // target audience
    this.validateOptionalField(
      this.targetAudience,
      productTargetAudience,
      "targetAudience",
      errors,
      !!this.targetAudience?.length,
    );

    // store password
    if (!storePassword) {
      // errors.storePassword =
      //   "Authorization required: Please enter your valid store password";
    }

    return {
      errors,
      isValid: Object.keys(errors).length === 0,
    };
  }

  /**
   * Publish validation
   *
   * Everything required.
   */
  validatePublish(imageCount: number, storePassword: string) {
    const errors: ProductValidationErrors = {};

    this.validateRequiredField(
      this.name,
      productName,
      "name",
      errors,
      "Product name is required",
    );

    this.validateRequiredField(
      this.description,
      productDescription,
      "description",
      errors,
      "Product description is required",
    );

    this.validateRequiredField(
      this.specifications,
      productSpecifications,
      "specifications",
      errors,
      "Product specifications are required",
    );

    this.validateRequiredField(
      this.price,
      productPrice,
      "price",
      errors,
      "Price is required",
    );

    this.validateRequiredField(
      this.productQuantity,
      productQuantity,
      "productQuantity",
      errors,
      "Quantity is required",
    );

    this.validateRequiredField(
      this.category,
      productCategory,
      "category",
      errors,
      "Category is required",
    );

    this.validateRequiredField(
      this.subCategory,
      productSubCategory,
      "subCategory",
      errors,
      "Subcategory is required",
    );

    this.validateRequiredField(
      this.targetAudience,
      productTargetAudience,
      "targetAudience",
      errors,
      "Target audience is required",
    );

    this.validateRequiredField(
      storePassword,
      productStorePassword,
      "storePassword",
      errors,
      "Store password is required",
    );

    // image validation
    if (imageCount < MIN_IMAGE_NUMBER) {
      errors.images = `At least ${MIN_IMAGE_NUMBER} image required`;
    }

    return {
      errors,
      isValid: Object.keys(errors).length === 0,
    };
  }
}
