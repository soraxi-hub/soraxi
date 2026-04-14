import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";

/**
 * Uploads product image files to Cloudinary from the server.
 *
 * This helper is designed specifically for files received from:
 * `await request.formData()` inside a Next.js App Router route.
 *
 * Flow:
 * - Accepts an array of Web API `File` objects
 * - Converts each file into an ArrayBuffer
 * - Converts the ArrayBuffer into a Node.js Buffer
 * - Streams the buffer directly to Cloudinary
 * - Returns an array of secure image URLs
 *
 * Why Buffer conversion is needed:
 * Cloudinary's Node SDK upload stream accepts Node streams/buffers,
 * while `request.formData()` provides Web API File objects.
 *
 * @param files - Image files extracted from `FormData`
 * @returns Promise<string[]> - Array of uploaded Cloudinary secure URLs
 */
export async function uploadProductImages(files: File[]): Promise<{
  success: boolean;
  error?: string;
  result?: string[];
}> {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    console.error("Missing required environment variables");
    return {
      success: false,
      error:
        "Server configuration error: Missing required Cloudinary environment variables",
    };
  }
  // If no images were provided, return an empty array immediately.
  if (!files.length)
    return {
      success: true,
      result: [],
    };

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  // Upload all images in parallel for faster performance.
  const uploaded = await Promise.all(
    files.map(async (file) => {
      // Convert the Web API File into raw binary bytes.
      const bytes = await file.arrayBuffer();

      // Convert binary bytes into a Node.js Buffer
      // so Cloudinary can consume it as a stream.
      const buffer = Buffer.from(bytes);

      return new Promise<string>((resolve, reject) => {
        // Create Cloudinary upload stream.
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "products",
          },
          (error, result) => {
            // If upload fails, reject immediately.
            if (error || !result) {
              reject(error || new Error("Image upload failed"));
              return;
            }

            // Return the secure Cloudinary URL.
            resolve(result.secure_url);
          },
        );

        // Convert the buffer into a readable stream
        // and pipe it directly into Cloudinary.
        streamifier.createReadStream(buffer).pipe(stream);
      });
    }),
  );

  return {
    success: true,
    result: uploaded,
  };
}
