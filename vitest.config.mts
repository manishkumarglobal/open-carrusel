import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Storage tests write to a temporary data directory and mutate
    // process.cwd(); running files in a single process keeps that
    // deterministic instead of racing across worker threads.
    fileParallelism: false,
  },
});
