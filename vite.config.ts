import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

function gooseLoader() {
  return {
    name: "goose-loader",
    transform(code: string, id: string) {
      if (id.endsWith(".goose")) {
        return {
          code: `export default ${JSON.stringify(code)};`,
          map: null,
        };
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), gooseLoader()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});

