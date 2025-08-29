import tailwindcss from "@tailwindcss/vite";
import legacy from "@vitejs/plugin-legacy";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    legacy({
      targets: ["defaults", "not IE 11"],
    }),
    tailwindcss(),
  ],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    target: "esnext",
  },
  define: {
    // Make environment variables available to client code
    __IS_DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
    __IS_PROD__: JSON.stringify(process.env.NODE_ENV === 'production'),
  },
});

// Test configuration (separate from main config)
export const testConfig = {
  globals: true,
  environment: "jsdom",
  setupFiles: ["./src/test-setup.ts"],
};
