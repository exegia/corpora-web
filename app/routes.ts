import { type RouteConfig, index, layout, route } from "@react-router/dev/routes"

export default [
    // `/` only dispatches: signed in → /dashboard, otherwise → /login.
    index("routes/index.tsx"),

    // Auth screens: their own chrome, no sidebar. `/login`, `/signup` and
    // `/forgot-password` are guest-only (each guards itself with `requireAnon`);
    // `/reset-password` and `/verify` are mid-flow and stay open.
    layout("components/layouts/auth-layout.tsx", [
        route("login", "routes/auth/login.tsx"),
        route("signup", "routes/auth/signup.tsx"),
        route("forgot-password", "routes/auth/forgot-password.tsx"),
        route("reset-password", "routes/auth/reset-password.tsx"),
        route("verify", "routes/auth/verify.tsx"),
        // Where OAuth providers and emailed links land.
        route("auth/callback", "routes/auth/callback.tsx"),
    ]),

    route("logout", "routes/auth/logout.tsx"),

    // No /terms route: the terms are a dialog over the signup form, so reading
    // them cannot discard what has been typed. See components/terms-and-conditions-dialog.

    // Everything below is behind `requireSession` in the layout's loader, which
    // runs before any child loader.
    layout("components/layouts/protected-layout.tsx", [
        route("dashboard", "routes/dashboard/index.tsx"),
        route("references", "routes/references/index.tsx"),
        route("library", "routes/library/index.tsx"),
        route("project", "routes/project/index.tsx"),
        route("project/:projectId", "routes/project/project.$projectId.tsx"),
        route("corpus", "routes/corpus/index.tsx"),
        route("corpus/:documentId", "routes/corpus/corpus.$documentId.tsx", [
            index("routes/corpus/corpus.$documentId._index.tsx"),
            route("documents", "routes/corpus/corpus.$documentId.documents.tsx"),
            route("structure", "routes/corpus/corpus.$documentId.structure.tsx"),
            route("activity", "routes/corpus/corpus.$documentId.activity.tsx"),
        ]),
        route("licenses", "routes/licenses/index.tsx"),
        route("licenses/:licenceId", "routes/licenses/licenses.$licenceId.tsx"),
        route("profile", "routes/profile/index.tsx"),
    ]),
] satisfies RouteConfig
