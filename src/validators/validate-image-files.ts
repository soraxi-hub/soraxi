import {
  ALLOWED_IMAGE_FORMATS_LABEL,
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_FILE_SIZE,
  MAX_IMAGE_FILE_SIZE_MB,
  MAX_IMAGE_UPLOAD_COUNT,
} from "@/constants/image.constants";
import { AppError } from "@/lib/errors/app-error";

/**
 * The one image validator.
 *
 * No React and no toasts, so the hooks, the step components and the API routes
 * can all call it. Deciding what to *say* about a rejection belongs to the
 * caller — a hook raises a toast, a route throws an AppError.
 */

export interface ImageValidationRules {
  /** Images already attached, counted against the limit. Defaults to 0. */
  existingCount?: number;
  maxCount?: number;
  maxFileSize?: number;
  allowedTypes?: readonly string[];
}

export interface ImageRejection {
  file: File;
  reason: "type" | "size" | "count";
  /** Ready to show a user; names the file and what is wrong with it. */
  message: string;
}

export interface ImageValidationResult {
  /** Files that passed every check, already trimmed to the count limit. */
  accepted: File[];
  rejected: ImageRejection[];
  /** True when nothing was rejected. */
  ok: boolean;
}

/**
 * Validates a batch of files against the platform's image rules.
 *
 * Partial acceptance is intentional: given three good photos and one 12MB one,
 * the three are kept and only the oversized file is reported. Rejecting the
 * whole batch — which two of the previous implementations did with an early
 * `return` — makes the person re-pick files that were never the problem.
 */
export function validateImageFiles(
  files: File[],
  rules: ImageValidationRules = {},
): ImageValidationResult {
  const {
    existingCount = 0,
    maxCount = MAX_IMAGE_UPLOAD_COUNT,
    maxFileSize = MAX_IMAGE_FILE_SIZE,
    allowedTypes = ALLOWED_IMAGE_TYPES,
  } = rules;

  const accepted: File[] = [];
  const rejected: ImageRejection[] = [];

  let remaining = Math.max(0, maxCount - existingCount);

  for (const file of files) {
    if (!allowedTypes.includes(file.type)) {
      rejected.push({
        file,
        reason: "type",
        message: `"${file.name}" isn't a supported format. Use ${ALLOWED_IMAGE_FORMATS_LABEL}.`,
      });
      continue;
    }

    if (file.size > maxFileSize) {
      rejected.push({
        file,
        reason: "size",
        message: `"${file.name}" is ${formatBytes(file.size)}. Each image must be ${MAX_IMAGE_FILE_SIZE_MB}MB or less.`,
      });
      continue;
    }

    if (remaining <= 0) {
      rejected.push({
        file,
        reason: "count",
        message: `You can upload up to ${maxCount} images, so "${file.name}" wasn't added.`,
      });
      continue;
    }

    accepted.push(file);
    remaining--;
  }

  return { accepted, rejected, ok: rejected.length === 0 };
}

/**
 * Collapses rejections into one sentence per reason.
 *
 * Four oversized files should produce one message, not four stacked toasts that
 * push each other off the screen.
 */
export function summariseRejections(rejections: ImageRejection[]): string[] {
  if (rejections.length === 0) return [];

  const byReason = new Map<ImageRejection["reason"], ImageRejection[]>();
  for (const rejection of rejections) {
    const bucket = byReason.get(rejection.reason) ?? [];
    bucket.push(rejection);
    byReason.set(rejection.reason, bucket);
  }

  return [...byReason.values()].map((group) =>
    group.length === 1
      ? group[0].message
      : pluralMessage(group[0].reason, group.length),
  );
}

function pluralMessage(
  reason: ImageRejection["reason"],
  count: number,
): string {
  switch (reason) {
    case "type":
      return `${count} files were skipped — only ${ALLOWED_IMAGE_FORMATS_LABEL} images are supported.`;
    case "size":
      return `${count} images were skipped for being over ${MAX_IMAGE_FILE_SIZE_MB}MB.`;
    case "count":
      return `${count} images weren't added — you can upload up to ${MAX_IMAGE_UPLOAD_COUNT}.`;
  }
}

/**
 * Server-side gate. Throws an `AppError` unless every file passes.
 */
export function assertValidImageUpload(
  files: File[],
  options: ImageValidationRules & { required?: boolean } = {},
): void {
  const { required = false, ...rules } = options;

  if (files.length === 0) {
    if (required) {
      throw new AppError("BAD_REQUEST", "At least one image is required.");
    }
    return;
  }

  const maxCount = rules.maxCount ?? MAX_IMAGE_UPLOAD_COUNT;
  if (files.length > maxCount) {
    throw new AppError(
      "BAD_REQUEST",
      `You can upload up to ${maxCount} images. ${files.length} were sent.`,
    );
  }

  const { rejected } = validateImageFiles(files, rules);

  if (rejected.length > 0) {
    throw new AppError(
      rejected[0].reason === "size" ? "PAYLOAD_TOO_LARGE" : "BAD_REQUEST",
      summariseRejections(rejected).join(" "),
    );
  }
}

/** Formats a byte count the way a person would say it. Example: "12.4MB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
