import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    server: {
      port: 5185,
      host: true,
      allowedHosts: [
        'localhost',
        'fluxturn.com',
        'www.fluxturn.com',
        '.ngrok-free.dev',
        'proaristocratic-chelsie-nodally.ngrok-free.dev'
      ],
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      // Fail on TypeScript errors during build
      rollupOptions: {
        onwarn(warning, warn) {
          // Treat warnings as errors in production
          if (
            mode === "production" &&
            warning.code === "UNUSED_EXTERNAL_IMPORT"
          ) {
            throw new Error(warning.message);
          }
          warn(warning);
        },
      },
    },
    define: {
      // API Base URL (without /api/v1)
      "import.meta.env.VITE_API_BASE_URL": JSON.stringify(
        mode === "production"
          ? "https://api.fluxturn.com"
          : env.VITE_API_BASE_URL || "http://localhost:3000"
      ),
      // API URL with version (base + /api/v1)
      "import.meta.env.VITE_API_URL": JSON.stringify(
        mode === "production"
          ? "https://api.fluxturn.com/api/v1"
          : `${env.VITE_API_BASE_URL || "http://localhost:3000"}/api/v1`
      ),
      // WebSocket URL
      "import.meta.env.VITE_WS_URL": JSON.stringify(
        mode === "production"
          ? "wss://api.fluxturn.com"
          : env.VITE_WS_URL || "ws://localhost:3000"
      ),
    },
  };
});
