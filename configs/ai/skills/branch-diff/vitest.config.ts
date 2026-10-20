import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // Types only, entry glue that the tests drive through main(), and the
      // viewer, which runs bundled in Chromium (test/viewer.test.ts) where v8
      // coverage can't see it.
      exclude: ["src/data.ts", "src/bin.ts", "src/viewer/**"],
      // Just under the measured numbers, so coverage can't quietly drop.
      thresholds: { statements: 99.5, branches: 97.5, functions: 99.5, lines: 99.5 },
    },
  },
});
