import { describe, expect, it } from "vitest";

import {
  ALLOWED_IMAGE_TYPES,
  IMAGE_COMPRESSION_TARGET_BYTES,
  MAX_IMAGE_FILE_SIZE,
  MAX_IMAGE_FILE_SIZE_MB,
  MAX_IMAGE_UPLOAD_COUNT,
  UPLOAD_PAYLOAD_BUDGET,
} from "@/constants/image.constants";
import {
  assertValidImageUpload,
  formatBytes,
  summariseRejections,
  validateImageFiles,
} from "@/validators/validate-image-files";
import { AppError } from "@/lib/errors/app-error";

/**
 * The image rules used to exist in five copies that disagreed with each other —
 * the edit hook checked 4MB while displaying "5MB", the upload step enforced
 * 5MB, the waitlist allowed four images and the dispute dialog validated
 * nothing. These tests pin the single implementation those were collapsed into.
 */

/** Builds a File of an exact byte length without allocating real image data. */
function makeFile(
  name: string,
  bytes: number,
  type = "image/jpeg",
): File {
  // A sparse Uint8Array is enough: nothing under test decodes the contents.
  return new File([new Uint8Array(bytes)], name, { type });
}

const ONE_MB = 1024 * 1024;

describe("validateImageFiles", () => {
  it("accepts files inside every limit", () => {
    const files = [
      makeFile("a.jpg", ONE_MB),
      makeFile("b.png", ONE_MB, "image/png"),
      makeFile("c.webp", ONE_MB, "image/webp"),
    ];

    const result = validateImageFiles(files);

    expect(result.ok).toBe(true);
    expect(result.accepted).toHaveLength(3);
    expect(result.rejected).toHaveLength(0);
  });

  it("rejects a disallowed type and names the file", () => {
    const result = validateImageFiles([
      makeFile("scan.pdf", 1000, "application/pdf"),
    ]);

    expect(result.ok).toBe(false);
    expect(result.rejected[0].reason).toBe("type");
    expect(result.rejected[0].message).toContain("scan.pdf");
  });

  it("rejects HEIC, which the image/* wildcard used to let through", () => {
    const result = validateImageFiles([
      makeFile("IMG_0001.heic", ONE_MB, "image/heic"),
    ]);

    expect(result.rejected[0].reason).toBe("type");
  });

  it("accepts a file exactly on the size limit", () => {
    const result = validateImageFiles([makeFile("edge.jpg", MAX_IMAGE_FILE_SIZE)]);

    expect(result.ok).toBe(true);
    expect(result.accepted).toHaveLength(1);
  });

  it("rejects a file one byte over the limit", () => {
    const result = validateImageFiles([
      makeFile("big.jpg", MAX_IMAGE_FILE_SIZE + 1),
    ]);

    expect(result.ok).toBe(false);
    expect(result.rejected[0].reason).toBe("size");
    expect(result.rejected[0].message).toContain(`${MAX_IMAGE_FILE_SIZE_MB}MB`);
  });

  it("keeps the good files and rejects only the bad one", () => {
    // The previous implementations returned early on the first bad file, making
    // the user re-pick images that were never the problem.
    const result = validateImageFiles([
      makeFile("good-1.jpg", ONE_MB),
      makeFile("huge.jpg", MAX_IMAGE_FILE_SIZE + 1),
      makeFile("good-2.jpg", ONE_MB),
    ]);

    expect(result.accepted.map((f) => f.name)).toEqual([
      "good-1.jpg",
      "good-2.jpg",
    ]);
    expect(result.rejected).toHaveLength(1);
  });

  it("stops at the count limit and reports the overflow", () => {
    const files = Array.from({ length: MAX_IMAGE_UPLOAD_COUNT + 2 }, (_, i) =>
      makeFile(`img-${i}.jpg`, 1000),
    );

    const result = validateImageFiles(files);

    expect(result.accepted).toHaveLength(MAX_IMAGE_UPLOAD_COUNT);
    expect(result.rejected).toHaveLength(2);
    expect(result.rejected.every((r) => r.reason === "count")).toBe(true);
  });

  it("counts images already attached against the limit", () => {
    // The edit wizard's budget spans saved images plus newly picked ones.
    const result = validateImageFiles(
      [makeFile("new.jpg", 1000), makeFile("also-new.jpg", 1000)],
      { existingCount: MAX_IMAGE_UPLOAD_COUNT - 1 },
    );

    expect(result.accepted).toHaveLength(1);
    expect(result.rejected[0].reason).toBe("count");
  });

  it("accepts nothing when the limit is already reached", () => {
    const result = validateImageFiles([makeFile("new.jpg", 1000)], {
      existingCount: MAX_IMAGE_UPLOAD_COUNT,
    });

    expect(result.accepted).toHaveLength(0);
    expect(result.rejected[0].reason).toBe("count");
  });

  it("treats an empty selection as valid", () => {
    const result = validateImageFiles([]);

    expect(result.ok).toBe(true);
    expect(result.accepted).toHaveLength(0);
  });
});

describe("summariseRejections", () => {
  it("collapses same-reason rejections into one sentence", () => {
    // Four oversized files should not stack four toasts.
    const { rejected } = validateImageFiles([
      makeFile("a.jpg", MAX_IMAGE_FILE_SIZE + 1),
      makeFile("b.jpg", MAX_IMAGE_FILE_SIZE + 1),
      makeFile("c.jpg", MAX_IMAGE_FILE_SIZE + 1),
    ]);

    const messages = summariseRejections(rejected);

    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain("3 images");
  });

  it("keeps the filename when only one file failed", () => {
    const { rejected } = validateImageFiles([
      makeFile("solo.jpg", MAX_IMAGE_FILE_SIZE + 1),
    ]);

    expect(summariseRejections(rejected)[0]).toContain("solo.jpg");
  });

  it("reports each distinct reason separately", () => {
    const { rejected } = validateImageFiles([
      makeFile("doc.pdf", 1000, "application/pdf"),
      makeFile("big.jpg", MAX_IMAGE_FILE_SIZE + 1),
    ]);

    expect(summariseRejections(rejected)).toHaveLength(2);
  });

  it("returns nothing for an empty list", () => {
    expect(summariseRejections([])).toEqual([]);
  });
});

describe("assertValidImageUpload", () => {
  it("passes a valid upload", () => {
    expect(() =>
      assertValidImageUpload([makeFile("ok.jpg", ONE_MB)]),
    ).not.toThrow();
  });

  it("allows an empty upload unless it is required", () => {
    expect(() => assertValidImageUpload([])).not.toThrow();
  });

  it("throws when images are required and none were sent", () => {
    expect(() => assertValidImageUpload([], { required: true })).toThrow(
      AppError,
    );
  });

  it("throws PAYLOAD_TOO_LARGE for an oversized file", () => {
    // The status matters: it maps to a 413, which is what the client's error
    // parser turns into "those files are too large".
    try {
      assertValidImageUpload([makeFile("big.jpg", MAX_IMAGE_FILE_SIZE + 1)]);
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("PAYLOAD_TOO_LARGE");
    }
  });

  it("throws BAD_REQUEST for a disallowed type", () => {
    try {
      assertValidImageUpload([makeFile("x.pdf", 1000, "application/pdf")]);
      expect.unreachable("should have thrown");
    } catch (error) {
      expect((error as AppError).code).toBe("BAD_REQUEST");
    }
  });

  it("throws when too many files are sent", () => {
    const files = Array.from({ length: MAX_IMAGE_UPLOAD_COUNT + 1 }, (_, i) =>
      makeFile(`i-${i}.jpg`, 1000),
    );

    expect(() => assertValidImageUpload(files)).toThrow(AppError);
  });

  it("is the server-side gate, independent of any client check", () => {
    // A crafted request bypassing the browser must still be refused.
    expect(() =>
      assertValidImageUpload([makeFile("evil.svg", 10, "image/svg+xml")]),
    ).toThrow(AppError);
  });
});

describe("image limits", () => {
  it("keeps a full upload inside the request-body budget", () => {
    // The whole reason compression exists: three images at the *selection*
    // limit would be 12MB, which the host rejects before the route runs.
    const compressedTotal =
      IMAGE_COMPRESSION_TARGET_BYTES * MAX_IMAGE_UPLOAD_COUNT;

    expect(compressedTotal).toBeLessThanOrEqual(UPLOAD_PAYLOAD_BUDGET);
  });

  it("would exceed the budget without compression", () => {
    // Guards the premise. If this ever stops being true, the compression step
    // is no longer load-bearing and this whole design should be revisited.
    expect(MAX_IMAGE_FILE_SIZE * MAX_IMAGE_UPLOAD_COUNT).toBeGreaterThan(
      UPLOAD_PAYLOAD_BUDGET,
    );
  });

  it("allows only formats our pipeline can process", () => {
    expect(ALLOWED_IMAGE_TYPES).not.toContain("image/heic");
    expect(ALLOWED_IMAGE_TYPES).not.toContain("image/svg+xml");
    expect(ALLOWED_IMAGE_TYPES).toContain("image/jpeg");
    expect(ALLOWED_IMAGE_TYPES).toContain("image/webp");
  });
});

describe("formatBytes", () => {
  it("formats each magnitude the way a person would say it", () => {
    expect(formatBytes(512)).toBe("512B");
    expect(formatBytes(2048)).toBe("2KB");
    expect(formatBytes(5 * ONE_MB)).toBe("5.0MB");
  });
});
