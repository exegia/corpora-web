import { type RouteConfig, index, layout, route } from "@react-router/dev/routes"

export default [
  // Auth screens: their own chrome, no sidebar. `/login`, `/signup` and
  // `/forgot-password` are guest-only (each guards itself with `requireAnon`);
  // `/reset-password` and `/verify` are mid-flow and stay open.
  layout("routes/auth-layout.tsx", [
    route("login", "routes/login.tsx"),
    route("signup", "routes/signup.tsx"),
    route("forgot-password", "routes/forgot-password.tsx"),
    route("reset-password", "routes/reset-password.tsx"),
    route("verify", "routes/verify.tsx"),
  ]),

  route("logout", "routes/logout.tsx"),

  // No /terms route: the terms are a dialog over the signup form, so reading
  // them cannot discard what has been typed. See components/terms-and-conditions-dialog.

  // Everything below is behind `requireSession` in the layout's loader, which
  // runs before any child loader.
  layout("routes/protected-layout.tsx", [
    index("routes/dashboard.tsx"),
    route("references", "routes/references.tsx"),
    route("library", "routes/library.tsx"),
    route("project", "routes/project.tsx"),
    route("project/:projectId", "routes/project.$projectId.tsx"),
    route("corpus", "routes/corpus.tsx"),
    route("licenses", "routes/licenses.tsx"),
    route("licenses/:licenceId", "routes/licenses.$licenceId.tsx"),
  ]),
] satisfies RouteConfig
