import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Relative base so the build works at any path, e.g. GitHub Pages
  // (https://<user>.github.io/Peptide-Compass/) or a custom domain root.
  base: "./",
  plugins: [react()],
});
