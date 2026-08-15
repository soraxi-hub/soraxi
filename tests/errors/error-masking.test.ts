import { describe, it, expect } from "vitest";
import { TRPCError } from "@trpc/server";
import { MongoNetworkError } from "mongodb";
import { createRequire } from "node:module";

import { handleTRPCError } from "@/lib/utils/handle-trpc-error";
import { AppError } from "@/lib/errors/app-error";

/**
 * The driver does not export its connection-pool errors publicly, so this
 * reaches for the real class rather than a stand-in. The whole point of these
 * tests is the gap between what the class *is* and what it calls itself, and a
 * hand-written replica could only ever assert the assumption being tested.
 */
const require = createRequire(import.meta.url);
const { PoolClearedError } = require("mongodb/lib/cmap/errors.js") as {
  PoolClearedError: new (pool: {
    address: string;
    serverError?: Error;
  }) => Error;
};

/** Reproduces the error from the product page: an Atlas node timing out. */
function poolClearedError() {
  return new PoolClearedError({
    address: "ac-ufrdzjm-shard-00-02.rgbghug.mongodb.net:27017",
    serverError: new Error("connection 9 to 159.41.89.79:27017 timed out"),
  });
}

describe("the driver error that leaked", () => {
  it("is a MongoNetworkError that does not call itself one", () => {
    const error = poolClearedError();

    // Both halves matter: the first is why an `instanceof` check works, the
    // second is why the original `name ===` check did not.
    expect(error).toBeInstanceOf(MongoNetworkError);
    expect(error.name).toBe("MongoPoolClearedError");
  });

  it("still carries the hostname and node IP in its message", () => {
    // Establishes what is at stake — this is the string that was rendered.
    expect(error_message()).toContain("mongodb.net");
    expect(error_message()).toContain("159.41.89.79");

    function error_message() {
      return poolClearedError().message;
    }
  });
});

describe("handleTRPCError", () => {
  it("classifies the pool-cleared error as a transient outage", () => {
    const result = handleTRPCError(poolClearedError(), "Failed to load product");

    expect(result.code).toBe("SERVICE_UNAVAILABLE");
    expect(result.message).toBe(
      "We couldn't reach our database just now. Please try again in a moment.",
    );
  });

  it("never repeats an unrecognised error's message", () => {
    // Deliberately free of connectivity keywords, so this exercises the
    // catch-all branch rather than the database one.
    const leaky = new Error(
      "S3 upload rejected for bucket soraxi-prod, key=AKIAIOSFODNN7",
    );
    leaky.name = "SomeLibrarySpecificError";

    const result = handleTRPCError(leaky, "We couldn't load this page.");

    expect(result.message).toBe("We couldn't load this page.");
    expect(result.message).not.toContain("AKIAIOSFODNN7");
    expect(result.message).not.toContain("soraxi-prod");
  });

  it("keeps the original error as cause so it stays diagnosable", () => {
    const original = new Error("something internal");
    original.name = "SomeLibrarySpecificError";

    expect(handleTRPCError(original).cause).toBe(original);
  });

  it("passes AppError messages through — they are written for users", () => {
    const result = handleTRPCError(
      new AppError("NOT_FOUND", "That product is no longer available."),
    );

    expect(result.message).toBe("That product is no longer available.");
  });

  it("returns an existing TRPCError untouched", () => {
    const original = new TRPCError({
      code: "UNAUTHORIZED",
      message: "Please sign in to continue.",
    });

    expect(handleTRPCError(original)).toBe(original);
  });

  it("does not describe our schema when Mongoose validation fails", () => {
    const validation = new Error("Path `storeEmail` is required.");
    validation.name = "ValidationError";

    const result = handleTRPCError(validation);

    expect(result.code).toBe("BAD_REQUEST");
    expect(result.message).not.toContain("storeEmail");
  });
});
