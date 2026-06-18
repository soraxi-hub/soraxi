import mongoose from "mongoose";

import { ProductFactory } from "@/domain/products/product-factory";
import { ProductStatusEnum } from "@/enums";
import { ProductImageUploadService } from "@/lib/utils/cloudinary/cloudinary-server-side-upload";
import { ProductRepository } from "@/repositories/product-repo";
import { ProductFormData } from "@/validators/product-validators";
import { AppError } from "@/lib/errors/app-error";
import {
  PublicToJSON,
  type GetPublicProductsInput,
  type UploadProductAction,
} from "@/domain/products/product-interface";
import { IProduct } from "@/lib/db/models/product.model";

export class ProductService {
  /**
   * Validation orchestrator
   */
  static validate(
    form: ProductFormData,
    action: UploadProductAction,
    imageCount: number,
  ) {
    const product = ProductFactory.createProductWithValidationDecorator(form);

    if (action === "draft") {
      return product.validateDraft(form.storePassword);
    }

    return product.validatePublish(imageCount, form.storePassword);
  }

  /**
   * Upload product images
   */
  private static async uploadImages(imageFiles: File[]) {
    return await ProductImageUploadService.uploadImages(imageFiles);
  }

  /**
   * Determines publish state.
   *
   * Handles:
   * - draft
   * - pending review
   * - verified product edits
   */
  private static determinePublishState(action: UploadProductAction) {
    if (action === "draft") {
      return {
        status: ProductStatusEnum.Draft,
        isVisible: false,
        isVerifiedProduct: false,
      };
    }

    return {
      status: ProductStatusEnum.Pending,
      isVisible: false,
      isVerifiedProduct: false,
    };
  }

  /**
   * Creates update payload
   */
  private static buildProductUpdate({
    form,
    images,
    action,
  }: {
    form: ProductFormData;
    images: string[];
    action: UploadProductAction;
  }) {
    return {
      ...form,

      images,

      ...this.determinePublishState(action),
    };
  }

  private static async getExistingProductImages(productId: string | null) {
    const imgMap = new Map<string, string[]>();

    if (!productId) return [];

    const existingImg = imgMap.has(productId);
    if (existingImg) return imgMap.get(productId)!;

    const existingProduct = await ProductRepository.findById(productId);

    if (!existingProduct) {
      throw new AppError("NOT_FOUND", "Product not found", { productId });
    }

    const images = existingProduct.images ?? [];

    imgMap.set(productId, images);

    return images;
  }

  /**
   * Creates new product entity
   */
  private static createNewProduct({
    form,
    images,
    storeId,
    action,
  }: {
    form: ProductFormData;
    images: string[];
    storeId: string;
    action: UploadProductAction;
  }) {
    return ProductFactory.create({
      ...form,

      images,
      storeId,

      ...this.determinePublishState(action),

      /**
       * Temporary placeholders.
       * Generated later by persistence layer.
       */
      slug: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Handles create/update orchestration
   */
  private static async processProduct({
    form,
    images,
    submittedDraftProductId,
    storeId,
    action,
    session,
  }: {
    form: ProductFormData;
    images: string[];
    submittedDraftProductId: string | null;
    storeId: string;
    action: UploadProductAction;
    session: mongoose.ClientSession | null;
  }) {
    /**
     * UPDATE FLOW
     */
    if (submittedDraftProductId) {
      const existingImages = await this.getExistingProductImages(
        submittedDraftProductId,
      );

      const mergedImages = [...existingImages, ...images];

      const updates = this.buildProductUpdate({
        form,
        images: mergedImages,
        action,
      });

      const updatedProduct = ProductFactory.create({
        ...updates,
        storeId,
        /**
         * Temporary placeholders.
         * Generated later by persistence layer.
         */
        slug: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return await ProductRepository.update(
        submittedDraftProductId,
        updatedProduct,
        session,
      );
    }

    /**
     * CREATE FLOW
     */
    const product = this.createNewProduct({
      form,
      images,
      storeId,
      action,
    });

    return await ProductRepository.create(product, session);
  }

  /**
   * Main orchestration
   */
  static async createProduct({
    form,
    imageFiles,
    action,
    submittedDraftProductId,
    storeId,
    session,
  }: {
    form: ProductFormData;
    imageFiles: File[];
    action: UploadProductAction;
    submittedDraftProductId: string | null;
    storeId: string;
    session: mongoose.ClientSession | null;
  }) {
    /**
     * STEP 1
     * Validate request
     */
    const existingImg = await this.getExistingProductImages(
      submittedDraftProductId,
    );
    const validation = this.validate(
      form,
      action,
      imageFiles.length + existingImg.length,
    );

    if (!validation.isValid) {
      throw new AppError("BAD_REQUEST", "Validation failed", {
        errors: validation.errors,
      });
    }

    /**
     * STEP 2
     * Upload images
     */
    const uploadedImages = await this.uploadImages(imageFiles);

    /**
     * STEP 3
     * Create/update workflow
     */
    const product = await this.processProduct({
      form,
      images: uploadedImages,
      submittedDraftProductId,
      storeId,
      action,
      session,
    });

    return product;
  }

  static async getPublicProducts(input: GetPublicProductsInput) {
    const {
      page,
      limit = 50,
      category,
      subCategory,
      targetAudience,
      search,
      sort,
      priceMin,
      priceMax,
      ratings,
    } = input;

    const products = await ProductRepository.getPublicProducts({
      page,
      limit,
      skip: (page - 1) * limit,
      category: category !== "all" ? category : undefined,
      subCategory,
      targetAudience,
      search,
      sort,
      priceMin,
      priceMax,
      ratings,
    });

    /**
     * Persistence -> Domain -> Public JSON
     */
    const publicProducts = products.map((product) =>
      ProductFactory.fromPersistence(product.toJSON<IProduct>()).toJSON(),
    );

    /**
     * Group products by target audience
     */
    const groupedProducts = this.groupProductsByAudience(publicProducts);

    return {
      products: publicProducts,
      groupedProducts,
      pagination: {
        page,
        limit,
        total: publicProducts.length,
      },
    };
  }

  static async getPublicProductBySlug(slug: string) {
    const productDoc = await ProductRepository.getPublicProductBySlug(slug);

    if (!productDoc) {
      return null;
    }

    /**
     * Persistence -> Domain -> Public JSON
     */
    return ProductFactory.fromPersistence(productDoc).toJSON();
  }

  /**
   * Groups products by audience
   */
  private static groupProductsByAudience(products: PublicToJSON[]) {
    const groupedProducts: Record<string, PublicToJSON[]> = {};

    for (const product of products) {
      if (!product.targetAudience) continue;

      for (const audience of product.targetAudience) {
        if (!groupedProducts[audience]) {
          groupedProducts[audience] = [];
        }

        groupedProducts[audience].push(product);
      }
    } // Big O(n*m) but we expect small arrays here

    return groupedProducts;
  }
}
