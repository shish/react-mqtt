import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    open: "/demo.html",
  },
  test: {
    environment: "happy-dom",
  },
});
