import { ProductFormData } from "@/validators/product-validators";
import { UploadProduct } from "./product-upload";

export class ProductFactory {
  static creatUploadProduct(product: ProductFormData) {
    return new UploadProduct(product);
  }
}
