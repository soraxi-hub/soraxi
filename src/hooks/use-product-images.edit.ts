"use client";

import { useState, useCallback, ChangeEvent } from "react";
import { toast } from "sonner";
import type { UseProductImagesReturn } from "@/types/edit-wizard.types";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_FILE_SIZE,
  MAX_PRODUCT_IMAGES,
} from "@/constants/image.constants";

interface UseProductImagesProps {
  existingImageCount: number;
}

/**
 * Hook for handling product image uploads in the edit wizard
 * Manages both existing images (URLs) and new files
 */
export function useProductImages({
  existingImageCount = 0,
}: UseProductImagesProps): UseProductImagesReturn {
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);

  /**
   * Handle file drag events
   */
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  /**
   * Handle file drop
   */
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  }, []);

  /**
   * Handle file input change (click to select)
   */
  const handleImageChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  }, []);

  /**
   * Process selected files
   * Validates file count, type, and size
   */
  const handleFiles = useCallback(
    (files: FileList) => {
      const fileArray = Array.from(files);

      // Check total image count
      const totalImages =
        existingImageCount + imageFiles.length + fileArray.length;
      if (totalImages > MAX_PRODUCT_IMAGES) {
        toast.error(
          `You can only have up to ${MAX_PRODUCT_IMAGES} images total. Currently: ${existingImageCount} existing + ${imageFiles.length} new = ${existingImageCount + imageFiles.length}. Cannot add ${fileArray.length} more.`,
        );
        return;
      }

      // Validate each file
      for (const file of fileArray) {
        // Check file type
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
          toast.error(
            `File "${file.name}" is not supported. Only JPEG, PNG, and WebP images are allowed.`,
          );
          return;
        }

        // Check file size
        if (file.size > MAX_IMAGE_FILE_SIZE) {
          toast.error(`File "${file.name}" is too large. Maximum size is 5MB.`);
          return;
        }
      }

      // Add files and create previews
      setImageFiles((prevFiles) => [...prevFiles, ...fileArray]);

      const newPreviews = fileArray.map((file) => URL.createObjectURL(file));
      setImagePreviews((prevPreviews) => [...prevPreviews, ...newPreviews]);

      toast.success(`${fileArray.length} image(s) added successfully`);
    },
    [existingImageCount, imageFiles.length],
  );

  /**
   * Remove an image
   * Handles both existing images (URLs) and new files
   */
  const removeImage = useCallback(
    (index: number, isNewFile: boolean) => {
      if (isNewFile) {
        const newFileIndex = index - existingImageCount;

        // Revoke object URL to free memory
        if (imagePreviews[index]) {
          URL.revokeObjectURL(imagePreviews[index]);
        }

        // Remove from files and previews
        setImageFiles((prevFiles) =>
          prevFiles.filter((_, i) => i !== newFileIndex),
        );

        setImagePreviews((prevPreviews) =>
          prevPreviews.filter((_, i) => i !== newFileIndex),
        );

        toast.success("Image removed");
      } else {
        // Existing image - cannot be removed directly
        // Would need backend support to remove from existing product images
        toast.info(
          "To remove existing images, they need to be deleted through the backend",
        );
      }
    },
    [existingImageCount, imagePreviews],
  );

  return {
    imageFiles,
    imagePreviews,
    dragActive,
    handleImageChange,
    handleDrop,
    handleDrag,
    removeImage,
    setDragActive,
    setImageFiles,
    setImagePreviews,
  };
}
