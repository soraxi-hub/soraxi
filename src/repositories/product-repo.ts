// import { UploadProduct } from "@/domain/products/product-upload";
import { getProductModel } from "@/lib/db/models/product.model";

export class ProductRepository {
  // Methods for user data access would go here
  static async saveProduct(): Promise<void> {
    const Product = await getProductModel();
    const newProduct = new Product({});
    await newProduct.save();
  }
}
