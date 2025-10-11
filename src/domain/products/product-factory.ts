import { ProductFormData } from "@/validators/product-validators";
import { UploadProduct } from "./product-upload";

export class ProductFactory {
  static createUploadProduct(product: ProductFormData) {
    return new UploadProduct(product);
  }
}
