import { type RouteConfig, index, route } from "@react-router/dev/routes"

export default [
  index("routes/dashboard.tsx"),
  route("references", "routes/references.tsx"),
  route("library", "routes/library.tsx"),
  route("project", "routes/project.tsx"),
  route("corpus", "routes/corpus.tsx"),
] satisfies RouteConfig
