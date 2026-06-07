import { Product } from "@/domain/products/product";
import { QueryBuilderFactory } from "@/domain/queries/query-builder-factory";
import { ProductStatusEnum } from "@/enums";
import {
  getProductBySlug,
  getProductModel,
  getProducts,
  IProduct,
  IProductDocument,
} from "@/lib/db/models/product.model";
import { type GetPublicProductsInput } from "@/domain/products/product-interface";
import { getStoreModel } from "@/lib/db/models/store.model";
import { AppError } from "@/lib/errors/app-error";
import mongoose from "mongoose";
import { Types } from "mongoose";

export class ProductRepository {
  static async create(
    product: Product,
    session: mongoose.ClientSession | null,
  ) {
    const ProductModel = await getProductModel();
    const StoreModel = await getStoreModel();

    const newProduct = await ProductModel.create({
      name: product.name,
      storeId: product.storeId,
      productType: product.productType,
      status: product.status,
      price: product.price,
      productQuantity: product.productQuantity,
      images: product.images,
      description: product.description,
      specifications: product.specifications,
      category: product.category,
      subCategory: product.subCategory,
      targetAudience: product.targetAudience,
      isVerifiedProduct: product.isVerifiedProduct,
      isVisible: product.isVisible, // Draft should not be visible in search/home
    });

    const draft = await newProduct.save({ session });

    await StoreModel.findByIdAndUpdate(product.storeId, {
      $push: { physicalProducts: draft._id },
    }).session(session);

    return draft;
  }

  static async update(
    productId: string,
    updates: Partial<Product>,
    session: mongoose.ClientSession | null,
  ) {
    const ProductModel = await getProductModel();
    const product = await QueryBuilderFactory.queryBuilder<
      IProduct,
      IProductDocument
    >(ProductModel)
      .where("_id", new mongoose.Types.ObjectId(productId))
      .withLean(false)
      .executeOne();

    if (!product) {
      throw new AppError("Product not found");
    }

    // Update product fields for draft (only update provided fields)
    if (updates.name !== undefined) product.name = updates.name;
    if (updates.price !== undefined) product.price = updates.price;
    if (updates.productQuantity !== undefined)
      product.productQuantity = updates.productQuantity;
    if (updates.description !== undefined && updates.description !== null)
      product.description = updates.description;
    if (updates.specifications !== undefined && updates.specifications !== null)
      product.specifications = updates.specifications;
    if (updates.category !== undefined) product.category = updates.category;
    if (updates.subCategory !== undefined)
      product.subCategory = updates.subCategory;
    if (updates.targetAudience !== undefined)
      product.targetAudience = updates.targetAudience;
    if (updates.images !== undefined) product.images = updates.images;

    // Keep as draft
    product.status = updates.status ?? ProductStatusEnum.Draft;
    product.isVerifiedProduct = false;
    product.isVisible = false;

    const updatedDraft = await product.save({ session });

    return updatedDraft;
  }

  static async findById(productId: string) {
    const ProductModel = await getProductModel();

    return await QueryBuilderFactory.queryBuilder<IProduct>(ProductModel)
      .where("_id", new mongoose.Types.ObjectId(productId))
      .select("_id", "images")
      .executeOne();
  }

  static async findManyByIds(productIds: Types.ObjectId[]) {
    const ProductModel = await getProductModel();

    const products = await ProductModel.find({
      _id: { $in: productIds },
    }).lean<IProduct[]>();

    return products;
  }

  static async countStoreProducts(storeId: string) {
    const ProductModel = await getProductModel();

    return await ProductModel.countDocuments({
      storeId,
    });
  }

  static async getPublicProducts(filters: GetPublicProductsInput) {
    return getProducts({
      ...filters,
      visibleOnly: true,
      verified: true,
    });
  }

  static async getPublicProductBySlug(slug: string): Promise<IProduct | null> {
    return getProductBySlug(slug);
  }
}
