import { describe, expect, it } from "vitest";

import { IMAGE_COMPRESSION_TARGET_BYTES } from "@/constants/image.constants";
import { compressImage, compressImages } from "@/lib/utils/compress-image";

/**
 * Compression needs a canvas, which Node does not have. These tests cover the
 * behaviour that survives without one — the early returns and the guarantee
 * that a caller always gets usable files back.
 *
 * The encode ladder itself (quality steps, WebP fallback, downscaling) can only
 * be exercised in a browser, and is deliberately NOT asserted here rather than
 * being faked with a canvas stub that would prove nothing about real images.
 */

function makeFile(name: string, bytes: number, type = "image/jpeg"): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe("compressImage", () => {
  it("returns a file already under the target untouched", async () => {
    const small = makeFile("small.jpg", 1024);

    // Identity, not just equality: nothing was re-encoded.
    expect(await compressImage(small)).toBe(small);
  });

  it("returns a file exactly on the target untouched", async () => {
    const exact = makeFile("exact.jpg", IMAGE_COMPRESSION_TARGET_BYTES);

    expect(await compressImage(exact)).toBe(exact);
  });

  it("returns the original when there is no canvas to compress with", async () => {
    // Server-side rendering and this test environment both hit this path. It
    // must degrade to a usable file rather than throwing, because the server's
    // own validation is the real gate.
    const large = makeFile("large.jpg", IMAGE_COMPRESSION_TARGET_BYTES + 1);

    expect(await compressImage(large)).toBe(large);
  });

  it("never throws for an undecodable file", async () => {
    const junk = makeFile("junk.jpg", IMAGE_COMPRESSION_TARGET_BYTES * 2);

    await expect(compressImage(junk)).resolves.toBeInstanceOf(File);
  });
});

describe("compressImages", () => {
  it("returns one file per input, in order", async () => {
    const files = [
      makeFile("a.jpg", 1024),
      makeFile("b.jpg", 2048),
      makeFile("c.jpg", 4096),
    ];

    const result = await compressImages(files);

    expect(result).toHaveLength(3);
    expect(result.map((f) => f.name)).toEqual(["a.jpg", "b.jpg", "c.jpg"]);
  });

  it("handles an empty list", async () => {
    await expect(compressImages([])).resolves.toEqual([]);
  });
});
