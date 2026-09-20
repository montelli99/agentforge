import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 120_000,
    hookTimeout: 120_000,
    unstubEnvs: true,
    unstubGlobals: true,
    pool: "forks",
    maxWorkers: 4,
    include: ["src/**/*.test.ts"],
    exclude: [
      "dist/**",
      "**/node_modules/**",
    ],
  },
});
