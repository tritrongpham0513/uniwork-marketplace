import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: [],
  },
  resolve: {
    alias: {
      // `import.meta.dirname` thay cho `__dirname` để tương thích với
      // Vite config loader native (sẽ là mặc định ở Vite 9).
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
