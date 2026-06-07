import { AppError } from "@/lib/errors/app-error";
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";

export class ProductImageUploadService {
  /**
   * Configures Cloudinary credentials.
   *
   * This is isolated into its own method so configuration
   * logic is centralized and reusable.
   */
  private static configureCloudinary() {
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      throw new AppError(
        "Server configuration error: Missing Cloudinary environment variables",
        500,
      );
    }

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  /**
   * Uploads a single product image to Cloudinary.
   *
   * Flow:
   * - Converts Web API File -> ArrayBuffer
   * - Converts ArrayBuffer -> Node Buffer
   * - Streams buffer into Cloudinary
   * - Resolves secure image URL
   *
   * @param file - Product image file
   * @returns Promise<string> - Cloudinary secure URL
   */
  private static async uploadSingleImage(
    file: File,
    folder: "products" | "disputes",
  ): Promise<string> {
    // Convert Web API File into binary bytes
    const bytes = await file.arrayBuffer();

    // Convert binary bytes into a Node.js Buffer
    const buffer = Buffer.from(bytes);

    return new Promise<string>((resolve, reject) => {
      /**
       * Create Cloudinary upload stream.
       */
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
        },
        (error, result) => {
          /**
           * Reject upload failure immediately.
           */
          if (error || !result) {
            reject(
              error || new AppError("Failed to upload product images", 500),
            );

            return;
          }

          /**
           * Return uploaded secure URL.
           */
          resolve(result.secure_url);
        },
      );

      /**
       * Convert buffer into readable stream
       * and pipe directly into Cloudinary.
       */
      streamifier.createReadStream(buffer).pipe(stream);
    });
  }

  /**
   * Uploads multiple product images in parallel.
   *
   * This helper is specifically designed for files received from:
   *
   * await request.formData()
   *
   * inside a Next.js App Router route.
   *
   * @param files - Array of uploaded image files
   * @returns Promise<string[]> - Uploaded image URLs
   */
  static async uploadImages(
    files: File[],
    folder: "products" | "disputes" = "products",
  ): Promise<string[]> {
    this.configureCloudinary();

    /**
     * If no images were provided,
     * return empty array immediately.
     */
    if (!files.length) {
      return [];
    }

    /**
     * Upload all images in parallel
     * for improved performance.
     */
    return Promise.all(
      files.map((file) => this.uploadSingleImage(file, folder)),
    );
  }
}
