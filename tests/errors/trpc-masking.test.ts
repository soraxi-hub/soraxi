import { describe, it, expect } from "vitest";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";

/**
 * Masking on the direct server-caller path.
 *
 * This is the case an `errorFormatter` alone does not cover: it is applied by
 * the HTTP adapter, while pages prefetch through `createTRPCOptionsProxy`,
 * which calls procedures directly. Measured, not assumed — with masking in an
 * `errorFormatter`, this same test saw the raw connection string.
 *
 * If someone later moves the masking out of middleware, this fails.
 */
const router = createTRPCRouter({
  boom: baseProcedure.query(() => {
    throw new Error(
      'Connection pool for ac-ufrdzjm-shard-00-02.rgbghug.mongodb.net:27017 was cleared because another operation failed with: "connection 9 to 159.41.89.79:27017 timed out"',
    );
  }),
});

describe("direct server caller", () => {
  it("masks an unauthored error", async () => {
    const caller = router.createCaller({
      user: null,
      store: null,
      admin: null,
    } as any);

    await expect(caller.boom()).rejects.toThrow(
      "Something went wrong on our end. Please try again.",
    );

    const error = await caller.boom().catch((e) => e as Error);
    expect(error.message).not.toContain("mongodb.net");
    expect(error.message).not.toContain("159.41.89.79");
  });
});
