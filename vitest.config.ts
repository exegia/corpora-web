import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vitest/config"

export default defineConfig({
    plugins: [tailwindcss()],
    resolve: {
        alias: { "@": path.resolve(import.meta.dirname, "app") },
    },
    test: {
        environment: "jsdom",
        globals: true,
        setupFiles: ["./app/test/setup.ts"],
        include: ["app/**/*.test.{ts,tsx}"],
        css: false,
    },
})
