import Project from "@/lib/projects"

/** Turn a PostgREST error into the DataError the routes know how to render. */
export function fail(context: string, error: { message?: string }): never {
  throw new Project.Errors.DataError(
    "unknown",
    `${context}: ${error.message ?? "unexpected error"}`,
  )
}
