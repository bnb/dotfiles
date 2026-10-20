import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const source = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// @pierre/diffs lazily imports every Shiki grammar and theme. These keep the
// ones nothing uses out of both bundles.
const resolve = {
  alias: [
    { find: /^shiki$/, replacement: source("src/viewer/shiki.ts") },
    { find: /^shiki\/wasm$/, replacement: source("src/viewer/unbundled.ts") },
    { find: /^@shikijs\/themes\/.+$/, replacement: source("src/viewer/unbundled.ts") },
    {
      find: /^@pierre\/theme\/pierre-(?!(?:light|dark)$).+$/,
      replacement: source("src/viewer/unbundled.ts"),
    },
  ],
};

// Two builds: the viewer page as one self-contained HTML file, and the CLI as
// one dependency-free script. `pnpm build` runs both.
export default defineConfig(({ mode }) =>
  mode === "cli"
    ? {
        resolve,
        build: {
          ssr: "src/bin.ts",
          outDir: "dist",
          emptyOutDir: false,
          target: "node20",
          rollupOptions: { output: { entryFileNames: "cli.mjs" } },
        },
        ssr: { noExternal: true },
      }
    : {
        root: "src/viewer",
        plugins: [react(), tailwindcss(), viteSingleFile()],
        resolve,
        build: {
          outDir: "../../dist",
          emptyOutDir: false,
          rollupOptions: { input: source("src/viewer/viewer.html") },
        },
      },
);
