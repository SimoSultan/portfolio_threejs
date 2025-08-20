import { defineConfig } from "vite";
import legacy from "@vitejs/plugin-legacy";
import tailwindcss from "@tailwindcss/vite";

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
});
