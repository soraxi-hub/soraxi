import axios from "axios";

export const uploadImagesToCloudinary = async (images: File[]) => {
  try {
    // Fetch the timestamp and signature from the server
    const {
      data: { timestamp, signature },
    } = await axios.post("/api/cloudinary-images");

    const url = `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`;
    const uploadedImageUrls = [];

    for (let image of images) {
      const formData = new FormData();
      formData.append("file", image);
      formData.append("api_key", process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY!);
      formData.append("timestamp", timestamp);
      formData.append("signature", signature);

      try {
        const uploadResponse = await axios.post(url, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        uploadedImageUrls.push(uploadResponse.data.secure_url);
      } catch (uploadError) {
        console.error(`Error uploading image ${image.name}:`, uploadError);
        throw new Error(`Error uploading image ${image.name}: ${uploadError}`);
      }
    }

    return uploadedImageUrls;
  } catch (error: any) {
    console.error("Error uploading images to Cloudinary:", error);
    throw new Error(`Error uploading images to Cloudinary: ${error.message}`);
  }
};
