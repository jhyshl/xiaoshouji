import { defineConfig } from "vite";

export default defineConfig({
  publicDir: false,
  build: {
    emptyOutDir: false,
    lib: {
      entry: "tavern-extension-src/index.js",
      formats: ["es"],
      fileName: () => "index.js",
    },
    outDir: "../tavern-extension",
    minify: "esbuild",
    sourcemap: false,
  },
});
