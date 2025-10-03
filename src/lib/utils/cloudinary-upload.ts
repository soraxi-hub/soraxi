import axios from "axios";
import { handleApiError } from "./handle-api-error";

/**
 * Uploads one or more image files to Cloudinary.
 *
 * - Requests a signed upload payload (timestamp + signature) from the server
 *   to securely authenticate uploads.
 * - Uploads each file individually to Cloudinary.
 * - Returns an array of the uploaded image URLs.
 * - Returns an empty array if no files are provided.
 *
 * @param images - Array of File objects (e.g. from an <input type="file" />).
 * @returns Promise<string[]> - Array of Cloudinary secure URLs.
 */
export const uploadImagesToCloudinary = async (images: File[]) => {
  // If no files were passed in, return an empty array immediately.
  if (images.length < 1) {
    return [];
  }

  try {
    // Request upload credentials (timestamp + signature) from the backend.
    // This ensures uploads are securely signed server-side.
    const {
      data: { timestamp, signature },
    } = await axios.post("/api/cloudinary-images");

    // Cloudinary image upload endpoint for the current project.
    const url = `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`;
    const uploadedImageUrls: string[] = [];

    // Upload each file one by one.
    for (const image of images) {
      const formData = new FormData();
      formData.append("file", image);
      formData.append("api_key", process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY!);
      formData.append("timestamp", timestamp);
      formData.append("signature", signature);

      try {
        // Send the file to Cloudinary.
        const uploadResponse = await axios.post(url, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        // Store the secure URL returned by Cloudinary.
        uploadedImageUrls.push(uploadResponse.data.secure_url);
      } catch (uploadError) {
        // If a single image upload fails, log it and rethrow
        // so the caller knows something went wrong.
        console.error(`Error uploading image ${image.name}:`, uploadError);
        throw new Error(`Error uploading image ${image.name}: ${uploadError}`);
      }
    }

    // Return all successfully uploaded image URLs.
    return uploadedImageUrls;
  } catch (error) {
    // Catch any errors from requesting credentials or uploads.
    console.error("Error uploading images to Cloudinary:", error);
    throw handleApiError(error);
  }
};
