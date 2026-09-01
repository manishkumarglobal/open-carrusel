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
    // Storage tests redirect the data directory by changing the working
    // directory, which is only available in child processes, not worker
    // threads. Running one file at a time keeps that switch deterministic.
    pool: "forks",
    fileParallelism: false,
  },
});
