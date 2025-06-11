import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      usePolling: true,
    },
    proxy: {
      "/api": {
        // target: "http://localhost:4000",

        target: "http://127.0.0.1:4000",
        changeOrigin: true,
        secure: false,
        // Optionally rewrite path if your backend expects something different
        // rewrite: (path) => path.replace(/^\/api/, '')
      },
    },
  },
});
