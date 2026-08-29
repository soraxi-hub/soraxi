"use client";

import { useCallback, useEffect, useRef, useState, ChangeEvent } from "react";
import { toast } from "sonner";

import type { UseProductImagesReturn } from "@/types/edit-wizard.types";
import { MAX_IMAGE_UPLOAD_COUNT } from "@/constants/image.constants";
import { compressImages } from "@/lib/utils/compress-image";
import {
  summariseRejections,
  validateImageFiles,
} from "@/validators/validate-image-files";

interface UseProductImagesProps {
  existingImageCount: number;
}

/**
 * Image handling for the product **edit** wizard.
 */
export function useProductImages({
  existingImageCount = 0,
}: UseProductImagesProps): UseProductImagesReturn {
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);

  // Both counts are read through refs at call time. The previous version listed
  // `[]` as the dependencies of its drop and change handlers while calling a
  // `handleFiles` that closed over `existingImageCount` and `imageFiles.length`,
  // so after the first add the limit was checked against stale numbers.
  const filesRef = useRef<File[]>([]);
  filesRef.current = imageFiles;

  const existingCountRef = useRef(existingImageCount);
  existingCountRef.current = existingImageCount;

  const previewsRef = useRef<string[]>([]);
  previewsRef.current = imagePreviews;

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const selected = Array.from(files);
    if (selected.length === 0) return;

    const { accepted, rejected } = validateImageFiles(selected, {
      existingCount: existingCountRef.current + filesRef.current.length,
      maxCount: MAX_IMAGE_UPLOAD_COUNT,
    });

    for (const message of summariseRejections(rejected)) {
      toast.error(message);
    }

    if (accepted.length === 0) return;

    try {
      const prepared = await compressImages(accepted);

      setImageFiles((current) => [...current, ...prepared]);
      setImagePreviews((current) => [
        ...current,
        ...prepared.map((file) => URL.createObjectURL(file)),
      ]);
    } catch (error) {
      console.error("Image processing failed:", error);
      toast.error(
        "We couldn't process those images. Please try again, or pick smaller files.",
      );
    }
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files?.length) void handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const handleImageChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) void handleFiles(e.target.files);
      e.target.value = "";
    },
    [handleFiles],
  );

  /**
   * Removes an image.
   *
   * `index` is a position in the combined list the UI renders — existing images
   * first, then new files — so it has to be rebased before it can index the
   * new-file arrays. The previous version rebased it for `imageFiles` but used
   * the un-rebased index against `imagePreviews`, which holds new previews
   * only; with any existing image present that revoked and removed the wrong
   * preview.
   */
  const removeImage = useCallback((index: number, isNewFile: boolean) => {
    if (!isNewFile) {
      toast.info(
        "Images already saved on this product can't be removed here yet.",
      );
      return;
    }

    const newFileIndex = index - existingCountRef.current;
    if (newFileIndex < 0 || newFileIndex >= filesRef.current.length) return;

    setImagePreviews((current) => {
      const url = current[newFileIndex];
      if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
      return current.filter((_, i) => i !== newFileIndex);
    });

    setImageFiles((current) => current.filter((_, i) => i !== newFileIndex));
  }, []);

  useEffect(() => {
    return () => {
      for (const url of previewsRef.current) {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      }
    };
  }, []);

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
