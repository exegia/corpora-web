import { FolderKanban, Plus } from "lucide-react"
import { useState } from "react"
import { Link, useLoaderData } from "react-router"
import type { ActionFunctionArgs } from "react-router"
import { DeleteProjectDialog } from "@/components/project/delete-project-dialog"
import { ProjectFormDialog } from "@/components/project/project-form-dialog"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { formatRelativeTime } from "@/lib/format"
import {
  createProject,
  DataError,
  deleteProject,
  listProjects,
  type ProjectSummary,
  updateProject,
} from "@/lib/projects"

export async function clientLoader() {
  return { projects: await listProjects() }
}

export async function clientAction({ request }: ActionFunctionArgs) {
  const form = await request.formData()
  const intent = String(form.get("intent") ?? "")
  try {
    switch (intent) {
      case "create-project":
        await createProject({
          name: String(form.get("name") ?? ""),
          description: String(form.get("description") ?? ""),
        })
        return { ok: true, intent }
      case "update-project":
        await updateProject(String(form.get("projectId") ?? ""), {
          name: String(form.get("name") ?? ""),
          description: String(form.get("description") ?? ""),
        })
        return { ok: true, intent }
      case "delete-project":
        await deleteProject(String(form.get("projectId") ?? ""))
        return { ok: true, intent }
      default:
        return { ok: false, error: "Unknown action." }
    }
  } catch (error) {
    if (error instanceof DataError) {
      return { ok: false, error: error.message }
    }
    return { ok: false, error: "Something went wrong. Your change was not saved." }
  }
}

function ProjectRow({ project }: { project: ProjectSummary }) {
  const [editing, setEditing] = useState(false)

  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <Link
          to={`/project/${project.id}`}
          className="block truncate font-medium underline-offset-2 hover:underline"
        >
          {project.name}
        </Link>
        <p className="truncate text-muted-foreground text-sm">
          {project.description || "No description"}
          {" · "}
          <span title={project.updatedAt}>
            updated {formatRelativeTime(project.updatedAt)}
          </span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
          Edit
        </Button>
        <DeleteProjectDialog project={project} />
      </div>
      <ProjectFormDialog
        open={editing}
        onOpenChange={setEditing}
        project={{
          id: project.id,
          name: project.name,
          description: project.description,
        }}
      />
    </li>
  )
}

export default function Project() {
  const { projects } = useLoaderData<typeof clientLoader>()
  const [creating, setCreating] = useState(false)

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-heading font-bold text-2xl">Projects</h1>
        {projects.length > 0 && (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus /> New project
          </Button>
        )}
      </div>
      {projects.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderKanban />
            </EmptyMedia>
            <EmptyTitle>No projects yet</EmptyTitle>
            <EmptyDescription>
              A project gathers corpora and references around one research
              question. Create your first to get started.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setCreating(true)}>
              <Plus /> New project
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <ul className="mt-4 divide-y">
          {projects.map((project) => (
            <ProjectRow key={project.id} project={project} />
          ))}
        </ul>
      )}
      <ProjectFormDialog open={creating} onOpenChange={setCreating} />
    </section>
  )
}
