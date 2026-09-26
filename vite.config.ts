import { createRequire } from "node:module"
import path from "node:path"
import { reactRouter } from "@react-router/dev/vite"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"
import devtoolsJson from "vite-plugin-devtools-json"

// Worktrees resolve dependencies outside their own root.
const nodeModules = path.resolve(createRequire(import.meta.url).resolve("vite/package.json"), "../..")

export default defineConfig({
    plugins: [reactRouter(), tailwindcss(), devtoolsJson()],
    resolve: {
        alias: { "@": path.resolve(import.meta.dirname, "app") },
    },
    optimizeDeps: {
        // Scan all app code up front to avoid dependency reloads on navigation.
        entries: [
            "app/**/*.{ts,tsx}",
            "!app/routes.ts",
            "!app/**/*.test.{ts,tsx}",
            "!app/**/__tests__/**",
            "!app/test/**",
        ],
        include: ["@exegia/corpora-ui", "@base-ui/react/*"],
    },
    server: {
        open: true,
        fs: { allow: [import.meta.dirname, nodeModules] },
        // Launchers supply PORT; ordinary development uses Vite's default.
        port: process.env.PORT ? Number(process.env.PORT) : 5173,
        strictPort: Boolean(process.env.PORT),
    },
})
