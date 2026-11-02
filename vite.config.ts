import { defineConfig } from "vite";

export default defineConfig({
  server: { host: true, proxy: { "/api": "http://localhost:8080" } },
  build: {
    chunkSizeWarningLimit: 1800,
    rollupOptions: { output: { manualChunks: { phaser: ["phaser"] } } },
  },
});
