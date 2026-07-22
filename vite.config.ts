/// <reference types="vitest/config" />
import path from "node:path"
import { reactRouter } from "@react-router/dev/vite"
import tailwindcss from "@tailwindcss/vite"
import { vercelPreset } from '@vercel/react-router/vite';
import { defineConfig } from "vite"
import devtoolsJson from 'vite-plugin-devtools-json';

export default defineConfig({
  plugins: [!process.env.VITEST && reactRouter(), tailwindcss(), vercelPreset(), devtoolsJson()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./app"),
    },
  },
  server: {
    open: true,
    // PORT is set by launchers (e.g. the preview harness with autoPort);
    // fall back to 5173 for plain `bun run vite:dev`.
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    strictPort: Boolean(process.env.PORT),
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./app/test/setup.ts"],
    include: ["app/**/*.test.{ts,tsx}"],
    css: false,
  },
})
