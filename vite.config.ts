import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  // Relative base so the build works at any path, e.g. GitHub Pages
  // (https://<user>.github.io/<repo>/) or a custom domain root.
  base: "./",
  plugins: [react()],
  define: {
    // `vite build --mode store` leaves the dose converter out entirely (code
    // and UI), in case app store review objects to it. A literal boolean lets
    // the bundler drop the dead branches.
    __CONVERTER__: JSON.stringify(mode !== "store"),
  },
}));
