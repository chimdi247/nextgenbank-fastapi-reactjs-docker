import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// `npm run dev` proxies /api to the FastAPI container exposed on :8000, like nginx does in the image.
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  server: {
    port: 5173,
    proxy: { "/api": { target: process.env.VITE_API_URL ?? "http://34.171.152.81:8000", changeOrigin: true } },
  },
});
