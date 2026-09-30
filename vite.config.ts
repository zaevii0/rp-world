import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // Do not publish source maps in production. The browser still needs the
    // compiled JavaScript/CSS, but source maps would make the original source
    // structure much easier to reconstruct.
    sourcemap: false,
    minify: "esbuild",
    cssMinify: true,
  },
});
