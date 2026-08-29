"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { MAX_IMAGE_UPLOAD_COUNT } from "@/constants/image.constants";
import { compressImages } from "@/lib/utils/compress-image";
import {
  summariseRejections,
  validateImageFiles,
} from "@/validators/validate-image-files";

/**
 * The shared "attach some images" hook.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHO USES IT
 * ─────────────────────────────────────────────────────────────────────────────
 * Product upload, the vendor waitlist, and dispute evidence — every screen
 * whose job is to gather new files from scratch.
 *
 * Files are **compressed before they are held**, so what sits in state is what
 * will be sent. Three untouched phone photos are a 20MB+ request that our host
 * rejects before the route runs — the origin of the "error parsing the error
 * response" message users were seeing.
 */

export interface UseImageUploadOptions {
  /** Defaults to the platform-wide limit. */
  maxCount?: number;
  /** Set false to keep original bytes — only for callers that upload elsewhere. */
  compress?: boolean;
  onChange?: (files: File[]) => void;
}

export interface UseImageUploadReturn {
  files: File[];
  previews: string[];
  dragActive: boolean;
  /** True while images are being compressed; disable submit against it. */
  isProcessing: boolean;
  /** Slots left before the count limit is reached. */
  remainingSlots: number;
  handleImageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleDrop: (event: React.DragEvent) => void;
  handleDrag: (event: React.DragEvent) => void;
  removeImage: (index: number) => void;
  reset: () => void;
  setDragActive: (active: boolean) => void;
}

export function useImageUpload(
  options: UseImageUploadOptions = {},
): UseImageUploadReturn {
  const {
    maxCount = MAX_IMAGE_UPLOAD_COUNT,
    compress = true,
    onChange,
  } = options;

  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Previews are revoked on unmount from a ref rather than from state, so the
  // cleanup effect does not re-run on every change and revoke URLs that are
  // still on screen — which is what a `[previews]` dependency would do.
  const previewsRef = useRef<string[]>([]);
  previewsRef.current = previews;

  // Mirrors `files` so `addFiles` can read the live count without capturing it.
  const filesRef = useRef<File[]>([]);
  filesRef.current = files;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const addFiles = useCallback(
    async (incoming: FileList | File[]) => {
      const selected = Array.from(incoming);
      if (selected.length === 0) return;

      // The count is read from the ref, not from a captured `files`. Reading it
      // inside a `setFiles` updater would be the other way to stay current, but
      // updaters must be pure — React calls them twice in StrictMode, which
      // would compress and append every batch twice.
      const { accepted, rejected } = validateImageFiles(selected, {
        existingCount: filesRef.current.length,
        maxCount,
      });

      for (const message of summariseRejections(rejected)) {
        toast.error(message);
      }

      if (accepted.length === 0) return;

      setIsProcessing(true);
      try {
        const prepared = compress ? await compressImages(accepted) : accepted;

        setFiles((current) => {
          const next = [...current, ...prepared];
          onChangeRef.current?.(next);
          return next;
        });

        setPreviews((current) => [
          ...current,
          ...prepared.map((file) => URL.createObjectURL(file)),
        ]);
      } catch (error) {
        console.error("Image processing failed:", error);
        toast.error(
          "We couldn't process those images. Please try again, or pick smaller files.",
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [compress, maxCount],
  );

  const handleImageChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files) void addFiles(event.target.files);
      // Reset the input so re-picking a file that was just removed still fires
      // a change event.
      event.target.value = "";
    },
    [addFiles],
  );

  const handleDrag = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (event.type === "dragenter" || event.type === "dragover") {
      setDragActive(true);
    } else if (event.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setDragActive(false);

      if (event.dataTransfer.files?.length) {
        void addFiles(event.dataTransfer.files);
      }
    },
    [addFiles],
  );

  const removeImage = useCallback((index: number) => {
    setPreviews((current) => {
      const url = current[index];
      if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
      return current.filter((_, i) => i !== index);
    });

    setFiles((current) => {
      const next = current.filter((_, i) => i !== index);
      onChangeRef.current?.(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    for (const url of previewsRef.current) {
      if (url.startsWith("blob:")) URL.revokeObjectURL(url);
    }
    setFiles([]);
    setPreviews([]);
    onChangeRef.current?.([]);
  }, []);

  useEffect(() => {
    return () => {
      for (const url of previewsRef.current) {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      }
    };
  }, []);

  return {
    files,
    previews,
    dragActive,
    isProcessing,
    remainingSlots: Math.max(0, maxCount - files.length),
    handleImageChange,
    handleDrop,
    handleDrag,
    removeImage,
    reset,
    setDragActive,
  };
}
