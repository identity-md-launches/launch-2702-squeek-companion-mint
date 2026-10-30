import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Relative base so the export works at an IPFS gateway subpath or an ENS name.
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: { outDir: "dist", emptyOutDir: true, assetsInlineLimit: 0 },
});
