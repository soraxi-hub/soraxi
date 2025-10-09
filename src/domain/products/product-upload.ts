import {
  productCategory,
  productDescription,
  ProductFormData,
  productName,
  productPrice,
  productQuantity,
  productSpecifications,
  productStorePassword,
  productSubCategory,
} from "@/validators/product-validators";
import { toast } from "sonner";

export const MIN_IMAGE_NUMBER = 3;
export const MAX_IMAGE_NUMBER = 5;

export class UploadProduct {
  private productToUpload: ProductFormData | null = null;

  constructor(product: ProductFormData) {
    this.setProduct(product);
  }

  setProduct(product: ProductFormData) {
    this.productToUpload = product;
  }

  validate(action: "draft" | "publish", imageFilesLength: number) {
    const newErrors: Partial<Record<keyof ProductFormData, string>> & {
      images?: string;
    } = {};

    // Helper function to get first error message
    const getFirstError = (result: any) =>
      result.error?.errors[0]?.message || "Validation failed";

    // Validate all fields that have values (for both draft and publish)
    const nameResult = productName.safeParse(this.productToUpload?.name);
    if (!nameResult.success) {
      newErrors.name = getFirstError(nameResult);
    }

    if (!this.productToUpload?.storePassword) {
      newErrors.storePassword =
        "Authorization required: Please enter your store password";
    } else if (this.productToUpload?.storePassword.length < 4) {
      newErrors.storePassword = "Please enter a valid store password";
    }

    if (
      this.productToUpload?.description &&
      this.productToUpload?.description !== "<p><br></p>"
    ) {
      const descriptionResult = productDescription.safeParse(
        this.productToUpload?.description
      );
      if (!descriptionResult.success) {
        newErrors.description = getFirstError(descriptionResult);
      }
    }

    if (
      this.productToUpload?.specifications &&
      this.productToUpload?.specifications !== "<p><br></p>"
    ) {
      const specificationsResult = productSpecifications.safeParse(
        this.productToUpload?.specifications
      );
      if (!specificationsResult.success) {
        newErrors.specifications = getFirstError(specificationsResult);
      }
    }

    if (
      this.productToUpload?.price !== undefined &&
      this.productToUpload?.price !== 0
    ) {
      const priceResult = productPrice.safeParse(this.productToUpload?.price);
      if (!priceResult.success) {
        newErrors.price = getFirstError(priceResult);
      }
    }

    if (
      this.productToUpload?.productQuantity !== undefined &&
      this.productToUpload?.productQuantity !== 0
    ) {
      const quantityResult = productQuantity.safeParse(
        this.productToUpload?.productQuantity
      );
      if (!quantityResult.success) {
        newErrors.productQuantity = getFirstError(quantityResult);
      }
    }

    if (
      this.productToUpload?.category &&
      this.productToUpload?.category.length > 0
    ) {
      const categoryResult = productCategory.safeParse(
        this.productToUpload?.category
      );
      if (!categoryResult.success) {
        newErrors.category = getFirstError(categoryResult);
      }
    }

    if (
      this.productToUpload?.subCategory &&
      this.productToUpload?.subCategory.length > 0
    ) {
      const subCategoryResult = productSubCategory.safeParse(
        this.productToUpload?.subCategory
      );
      if (!subCategoryResult.success) {
        newErrors.subCategory = getFirstError(subCategoryResult);
      }
    }

    // Publish-specific validations - all fields are required and must pass validation
    if (action === "publish") {
      // Required fields validation (all fields must be present and valid)
      const requiredValidations = {
        name: productName.safeParse(this.productToUpload?.name),
        description: productDescription.safeParse(
          this.productToUpload?.description
        ),
        specifications: productSpecifications.safeParse(
          this.productToUpload?.specifications
        ),
        price: productPrice.safeParse(this.productToUpload?.price),
        productQuantity: productQuantity.safeParse(
          this.productToUpload?.productQuantity
        ),
        category: productCategory.safeParse(this.productToUpload?.category),
        subCategory: productSubCategory.safeParse(
          this.productToUpload?.subCategory
        ),
        storePassword: productStorePassword.safeParse(
          this.productToUpload?.storePassword
        ),
      };

      // Check if any required field is missing
      if (!this.productToUpload?.name)
        newErrors.name = "Product name is required";
      if (!this.productToUpload?.description)
        newErrors.description = "Product description is required";
      if (!this.productToUpload?.specifications)
        newErrors.specifications = "Product specifications are required";
      if (!this.productToUpload?.price) newErrors.price = "Price is required";
      if (this.productToUpload?.productQuantity === undefined)
        newErrors.productQuantity = "Quantity is required";
      if (
        this.productToUpload?.category &&
        this.productToUpload?.category.length === 0
      )
        newErrors.category = "Category is required";
      if (
        this.productToUpload?.subCategory &&
        this.productToUpload.subCategory.length === 0
      )
        newErrors.subCategory = "Subcategory is required";
      if (!this.productToUpload?.storePassword)
        newErrors.storePassword = "Store password is required";

      // Override with validation errors if fields exist but are invalid
      if (!newErrors.name && !requiredValidations.name.success) {
        newErrors.name = getFirstError(requiredValidations.name);
      }
      if (!newErrors.description && !requiredValidations.description.success) {
        newErrors.description = getFirstError(requiredValidations.description);
      }
      if (
        !newErrors.specifications &&
        !requiredValidations.specifications.success
      ) {
        newErrors.specifications = getFirstError(
          requiredValidations.specifications
        );
      }
      if (!newErrors.price && !requiredValidations.price.success) {
        newErrors.price = getFirstError(requiredValidations.price);
      }
      if (
        !newErrors.productQuantity &&
        !requiredValidations.productQuantity.success
      ) {
        newErrors.productQuantity = getFirstError(
          requiredValidations.productQuantity
        );
      }
      if (!newErrors.category && !requiredValidations.category.success) {
        newErrors.category = getFirstError(requiredValidations.category);
      }
      if (!newErrors.subCategory && !requiredValidations.subCategory.success) {
        newErrors.subCategory = getFirstError(requiredValidations.subCategory);
      }
      if (
        !newErrors.storePassword &&
        !requiredValidations.storePassword.success
      ) {
        newErrors.storePassword = getFirstError(
          requiredValidations.storePassword
        );
      }

      // Image validation for publish
      if (imageFilesLength < MIN_IMAGE_NUMBER) {
        newErrors.images = `Please select at least ${MIN_IMAGE_NUMBER} product images`;
        toast.error(
          `Please select at least ${MIN_IMAGE_NUMBER} product images`
        );
      }
    }

    return {
      newErrors: newErrors,
      hasErrors: Object.keys(newErrors).length === 0,
    };
  }
}
