"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  MAX_IMAGE_FILE_SIZE,
  MAX_IMAGE_NUMBER,
} from "@/domain/products/product-upload";
import type { ImageValidationOptions } from "../types/upload-wizard.types";

/**
 * useProductImages Hook
 *
 * Manages all image-related logic for the product upload wizard:
 * - File validation (type, size, count)
 * - Image preview generation
 * - Image removal with URL cleanup
 * - Drag-and-drop state management
 *
 * @param maxFiles - Maximum number of files allowed (default: 5)
 * @param maxFileSize - Maximum file size in bytes (default: 5MB)
 * @param allowedTypes - Allowed MIME types (default: JPEG, PNG, WebP)
 *
 * @example
 * const {
 *   imageFiles,
 *   imagePreviews,
 *   dragActive,
 *   handleImageChange,
 *   handleDrop,
 *   handleDrag,
 *   removeImage,
 *   setDragActive,
 * } = useProductImages();
 */

export interface UseProductImagesReturn {
  imageFiles: File[];
  imagePreviews: string[];
  dragActive: boolean;
  handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleDrag: (e: React.DragEvent) => void;
  removeImage: (index: number) => void;
  setDragActive: (active: boolean) => void;
  setImageFiles: (files: File[]) => void;
  setImagePreviews: (previews: string[]) => void;
}

export function useProductImages(
  options: ImageValidationOptions = {},
): UseProductImagesReturn {
  const {
    maxFiles = MAX_IMAGE_NUMBER,
    maxFileSize = MAX_IMAGE_FILE_SIZE,
    allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  } = options;

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);

  // ============================================================================
  // FILE VALIDATION
  // ============================================================================

  /**
   * Validates an individual file
   * Checks type and size constraints
   */
  const validateFile = useCallback(
    (file: File): boolean => {
      // Check file type
      if (!allowedTypes.includes(file.type)) {
        toast.error("Only JPEG, PNG, and WebP images are allowed");
        return false;
      }

      // Check file size
      if (file.size > maxFileSize) {
        const maxSizeMB = Math.round(maxFileSize / (1024 * 1024));
        toast.error(`Each image must be less than ${maxSizeMB}MB`);
        return false;
      }

      return true;
    },
    [allowedTypes, maxFileSize],
  );

  /**
   * Processes and validates file array
   */
  const handleFiles = useCallback(
    (files: FileList) => {
      const fileArray = Array.from(files);

      // Check total file count
      if (fileArray.length > maxFiles) {
        toast.error(`You can only upload up to ${maxFiles} images`);
        return;
      }

      // Validate all files
      for (const file of fileArray) {
        if (!validateFile(file)) {
          return;
        }
      }

      // Set files and generate previews
      setImageFiles(fileArray);
      const previews = fileArray.map((file) => URL.createObjectURL(file));
      setImagePreviews(previews);
    },
    [maxFiles, validateFile],
  );

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Handles input element change event
   */
  const handleImageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(e.target.files);
      }
    },
    [handleFiles],
  );

  /**
   * Handles drag enter/over events
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
   * Handles drop event
   */
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles],
  );

  /**
   * Removes an image at the specified index
   * Properly revokes the object URL to prevent memory leaks
   */
  const removeImage = useCallback((index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => {
      // Revoke the URL for the removed preview
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  // ============================================================================
  // CLEANUP EFFECTS
  // ============================================================================

  /**
   * Cleanup: Revoke all object URLs on unmount
   * Prevents memory leaks from dangling blob URLs
   */
  useEffect(() => {
    return () => {
      imagePreviews.forEach((url) => {
        if (url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [imagePreviews]);

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
