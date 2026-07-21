import { type RouteConfig, index, route } from "@react-router/dev/routes"

export default [
  index("routes/dashboard.tsx"),
  route("references", "routes/references.tsx"),
  route("library", "routes/library.tsx"),
  route("project", "routes/project.tsx"),
  route("project/:projectId", "routes/project.$projectId.tsx"),
  route("corpus", "routes/corpus.tsx"),
  route("licenses", "routes/licenses.tsx"),
  route("licenses/:licenceId", "routes/licenses.$licenceId.tsx"),
] satisfies RouteConfig
