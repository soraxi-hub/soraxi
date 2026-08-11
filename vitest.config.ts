import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      // Next.js's "server-only" guard throws outside a Next server context.
      // Tests run in Node via vitest, so alias it to an empty module.
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts"),
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    // mongodb-memory-server downloads a MongoDB binary on first run and a
    // replica set takes a few seconds to elect a primary — generous timeouts.
    hookTimeout: 180_000,
    testTimeout: 60_000,
    // One replica set per test file, isolated in its own process. Files run
    // sequentially — concurrent mongod replica-set spawns contend badly on
    // Windows (Defender scanning) and blow the launch timeout.
    pool: "forks",
    fileParallelism: false,
  },
});
