import { ChevronRight, FolderKanban, Plus } from "lucide-react"
import { Suspense, useState } from "react"
import type { ReactNode } from "react"
import { Await, Link, useLoaderData } from "react-router"
import type { ActionFunctionArgs } from "react-router"
import { DeleteProjectDialog } from "@/components/project/delete-project-dialog"
import { ProjectFormDialog } from "@/components/project/project-form-dialog"
import { Badge } from "@/components/ui/badge"
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
import { Skeleton } from "@/components/ui/skeleton"
import { useLoadingSound, useReadySound } from "@/lib/sounds"
import { listUsers } from "@/lib/users"

export async function clientLoader() {
  // Deliberately not awaited: navigation completes immediately and the
  // component suspends on this promise, showing the skeleton meanwhile.
  const data = Promise.all([listProjects(), listUsers()]).then(
    ([projects, users]) => ({ projects, users }),
  )
  return { data }
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
          userId: String(form.get("userId") ?? ""),
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
    <li className="group/row relative rounded-3xl">
      <Button
        className="h-auto! w-full justify-between gap-4 px-6 py-3 text-left rounded-2xl"
        render={<Link to={`/project/${project.id}`} />}
        variant="ghost"
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-medium">{project.name}</h3>
            <Badge variant="secondary">{project.status}</Badge>
          </div>
          <p className="truncate font-normal text-muted-foreground text-sm">
            {project.description || "No description"}
            {" · "}
            <span title={project.updatedAt}>
              updated {formatRelativeTime(project.updatedAt)}
            </span>
          </p>
        </div>
        <ChevronRight
          aria-hidden="true"
          className="transition-transform group-hover/row:translate-x-0.5"
        />
      </Button>
      <div className="absolute top-1/2 right-10 flex -translate-y-1/2 items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover/row:opacity-100">
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

function ProjectHeader({ children }: { children?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h1 className="font-heading font-bold text-2xl">Projects</h1>
      {children}
    </div>
  )
}

function ProjectListSkeleton() {
  useLoadingSound()

  return (
    <div aria-busy="true" aria-label="Loading projects" role="status">
      <ProjectHeader>
        <Skeleton className="h-8 w-28" />
      </ProjectHeader>
      <ul className="mt-4 flex flex-col gap-1">
        {Array.from({ length: 4 }, (_, i) => (
          <li className="flex items-center justify-between gap-4 px-4 py-3" key={i}>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-14" />
              </div>
              <Skeleton className="mt-1.5 h-4 w-64" />
            </div>
            <Skeleton className="size-4 shrink-0" />
          </li>
        ))}
      </ul>
    </div>
  )
}

function ProjectList({
  projects,
  users,
}: {
  projects: ProjectSummary[]
  users: Awaited<ReturnType<typeof listUsers>>
}) {
  useReadySound()
  const [creating, setCreating] = useState(false)

  return (
    <>
      <ProjectHeader>
        {projects.length > 0 && (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus /> New project
          </Button>
        )}
      </ProjectHeader>
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
        <ul className="mt-4 flex flex-col gap-1">
          {projects.map((project) => (
            <ProjectRow key={project.id} project={project} />
          ))}
        </ul>
      )}
      <ProjectFormDialog open={creating} onOpenChange={setCreating} users={users} />
    </>
  )
}

export default function Project() {
  const { data } = useLoaderData<typeof clientLoader>()

  return (
    <section>
      <Suspense fallback={<ProjectListSkeleton />}>
        <Await resolve={data}>
          {({ projects, users }) => (
            <ProjectList projects={projects} users={users} />
          )}
        </Await>
      </Suspense>
    </section>
  )
}
