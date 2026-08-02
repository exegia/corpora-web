import path from "node:path"
import { reactRouter } from "@react-router/dev/vite"
import tailwindcss from "@tailwindcss/vite"
// vitest/config, not vite: as of vite 8.2, the `test` key below is not part of
// vite's own UserConfig, and the triple-slash reference no longer widens it.
import { defineConfig } from "vitest/config"
import devtoolsJson from "vite-plugin-devtools-json"

export default defineConfig({
    plugins: [!process.env.VITEST && reactRouter(), tailwindcss(), devtoolsJson()],
    resolve: {
        alias: {
            "@": path.resolve(import.meta.dirname, "./app"),
        },
    },
    // Pre-bundle every bare import up front. Without this, Vite discovers deps
    // lazily as routes are visited, re-optimizes, and the browser's in-flight
    // requests for the previous hash fail with "504 Outdated Optimize Dep".
    optimizeDeps: {
        include: [
            "@exegia/corpora-ui",
            "@supabase/supabase-js",
            "buffer",
            "class-variance-authority",
            "clsx",
            "cuelume",
            "fflate",
            "isomorphic-git",
            "lucide-react",
            "marked",
            // Pulled in by the corpora-ui auth blocks: `motion/react` powers the
            // step morphs, `@remixicon/react` the provider glyphs.
            "motion/react",
            "@remixicon/react",
            "react-remark",
            "tailwind-merge",
            ...[
                "accordion",
                "alert-dialog",
                "autocomplete",
                "avatar",
                "checkbox",
                "checkbox-group",
                "collapsible",
                "combobox",
                "context-menu",
                "dialog",
                "drawer",
                "field",
                "fieldset",
                "form",
                // Reached only through the package's own Input — nothing here
                // imports it directly, which is why it was missed until now.
                "input",
                "menu",
                "merge-props",
                "meter",
                "number-field",
                "otp-field",
                "popover",
                "preview-card",
                "progress",
                "radio",
                "radio-group",
                "scroll-area",
                "select",
                "separator",
                "slider",
                "switch",
                "tabs",
                "toast",
                "toggle",
                "toggle-group",
                "toolbar",
                "tooltip",
                "use-render",
            ].map((m) => `@base-ui/react/${m}`),
        ],
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
