import { ChevronRight, FolderKanban, Plus } from "lucide-react"
import { Suspense, useState } from "react"
import type { ReactNode } from "react"
import { Await, Link, useLoaderData } from "react-router"
import type { ActionFunctionArgs } from "react-router"
import { DeleteProjectDialog } from "@/components/project/delete-project-dialog"
import { ProjectFormDialog } from "@/components/project/project-form-dialog"
import { Badge, type BadgeProps } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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
    type ProjectStatus,
    type ProjectSummary,
    updateProject,
} from "@/lib/projects"
import { Skeleton } from "@/components/ui/skeleton"
import { useLoadingSound, useReadySound } from "@/lib/sounds"
import { listUsers } from "@/lib/users"

export async function clientLoader() {
    // Deliberately not awaited: navigation completes immediately, and the
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

/** Mirrors the status vocabulary of the detail panel's STATUS_DOT_COLORS. */
const STATUS_BADGE_VARIANTS: Record<ProjectStatus, BadgeProps["variant"]> = {
    draft: "secondary",
    started: "info",
    "ready-for-review": "warning",
    published: "success",
    failed: "error",
}

function ProjectRow({ project }: { project: ProjectSummary }) {
    const [editing, setEditing] = useState(false)

    return (
        <Card
            className="group/row flex-row items-center gap-4 px-4 py-3.5 transition-colors has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring hover:bg-accent/40"
            render={<li />}
        >
            <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors group-hover/row:text-foreground"
            >
                <FolderKanban className="size-5" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center gap-2">
                    <h3 className="min-w-0 truncate font-medium capitalize">
                        {/* after: stretches the link over the whole card, so the row
                            is clickable without nesting the action buttons in it. */}
                        <Link
                            className="outline-none after:absolute after:inset-0 after:rounded-2xl"
                            to={`/project/${project.id}`}
                        >
                            {project.name}
                        </Link>
                    </h3>
                    <Badge variant={STATUS_BADGE_VARIANTS[project.status]}>
                        {project.status}
                    </Badge>
                </div>
                <p className="truncate text-muted-foreground text-xs">
                    {project.description || "No description"}
                    <span aria-hidden="true" className="mx-1.5 opacity-40">
                        ·
                    </span>
                    <span title={project.updatedAt}>
                        updated {formatRelativeTime(project.updatedAt)}
                    </span>
                </p>
            </div>
            {/* Fades out as the hover actions fade in, so they never overlap. */}
            <ChevronRight
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground transition-[transform,opacity] group-hover/row:translate-x-0.5 group-hover/row:opacity-0 group-focus-within/row:opacity-0"
            />
            {/* z-10 keeps these above the link's stretched overlay. Revealed by the
                same triggers that hide the chevron, so the row is never blank —
                including keyboard focus, which is the only way to reach these. */}
            <div className="absolute top-1/2 right-3 z-10 flex -translate-y-1/2 items-center gap-1 opacity-0 transition-opacity group-hover/row:opacity-100 group-focus-within/row:opacity-100">
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
        </Card>
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
            <ul className="mt-4 flex flex-col gap-2">
                {Array.from({ length: 4 }, (_, i) => (
                    <Card
                        className="flex-row items-center gap-4 px-4 py-3.5"
                        key={i}
                        render={<li />}
                    >
                        <Skeleton className="size-10 shrink-0 rounded-xl" />
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-5 w-40" />
                                <Skeleton className="h-5 w-14" />
                            </div>
                            <Skeleton className="mt-2 h-4 w-64" />
                        </div>
                        <Skeleton className="size-4 shrink-0" />
                    </Card>
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
                <ul className="mt-4 flex flex-col gap-2">
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
