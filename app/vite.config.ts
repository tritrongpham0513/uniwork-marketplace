import path from "path";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Đọc biến môi trường (file .env + process.env, tiền tố VITE_)
  const env = loadEnv(mode, process.cwd(), "VITE_");

  // Đích proxy khi chạy trong Docker (service name) hoặc ngoài host (localhost).
  const proxyTarget = env.VITE_DEV_PROXY_TARGET ?? "http://localhost:8080";

  // Docker Desktop trên Windows/macOS đôi khi không báo sự kiện file
  // từ bind-mount; bật polling nếu HMR không tự reload.
  const usePolling = env.VITE_DEV_POLLING === "true";

  return {
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
    server: {
      port: 5173,
      strictPort: true,
      // Cho phép truy cập dev server từ bên ngoài container
      host: "0.0.0.0",
      watch: usePolling
        ? { usePolling: true, interval: 500 }
        : undefined,
      proxy: {
        // Proxy API về backend Spring Boot để tránh CORS và giữ
        // cùng origin (giống hành vi của nginx ở bản production build).
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
        },
        // WebSocket thông báo realtime — cần nâng cấp Upgrade.
        "/ws": {
          target: proxyTarget,
          changeOrigin: true,
          ws: true,
        },
        // Tài liệu API
        "/swagger-ui": {
          target: proxyTarget,
          changeOrigin: true,
        },
        "/v3/api-docs": {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
