import { ChevronRight, FolderKanban, Pencil, Plus, Trash2 } from "lucide-react"
import type { ReactNode } from "react"
import { Suspense, useState } from "react"
import type { ActionFunctionArgs } from "react-router"
import { Await, Link, useLoaderData, useViewTransitionState } from "react-router"
import { Dialogs } from "@/components/project/dialogs"
import StatusBlock from "@/components/status.block"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
    // Deliberately not awaited: navigation completes immediately, and the
    // component suspends on this promise, showing the skeleton meanwhile.
    const data = Promise.all([listProjects(), listUsers()]).then(([projects, users]) => ({ projects, users }))
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
    const href = `/project/${project.id}`
    // Only the row being opened claims the shared name — a view-transition-name
    // present on two elements at once aborts the whole transition.
    const morphing = useViewTransitionState(href)

    return (
        <TableRow className="group/row">
            {/* w-full max-w-0 is what makes `truncate` work in an auto-layout
                table: w-full hands this column the slack, max-w-0 stops the
                cell growing to fit its content instead of clipping it. */}
            <TableCell className="w-full max-w-0">
                <div className="flex items-center gap-3">
                    <span
                        aria-hidden="true"
                        className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover/row:text-foreground">
                        <FolderKanban className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <h3
                            className="truncate font-medium capitalize"
                            style={{
                                viewTransitionName: morphing ? "project-title" : "none",
                            }}>
                            {/* after: stretches the link across the whole row, so
                                the row navigates without nesting the action
                                buttons inside the link. It resolves against
                                TableRow, which the coss table leaves relative. */}
                            <Link
                                className="outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:inset-ring-2 focus-visible:after:inset-ring-ring"
                                to={href}
                                viewTransition>
                                {project.name}
                            </Link>
                        </h3>
                        <p className="truncate text-xs text-muted-foreground">
                            {project.description || "No description"}
                        </p>
                    </div>
                </div>
            </TableCell>
            <TableCell>
                <StatusBlock status={project.status} />
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
                <span title={project.updatedAt}>{formatRelativeTime(project.updatedAt)}</span>
            </TableCell>
            {/* Chevron and actions share one grid area, so the swap costs no
                reflow and the cell is always as wide as the buttons. z-10 goes
                on this wrapper, not the cell: a positioned cell paints its
                bg-card above the link's overlay and chops the focus ring in
                half. The wrapper clears the overlay without covering the row's
                edges. */}
            <TableCell>
                <div className="relative z-10 grid items-center justify-items-end">
                    {/* pointer-events-none: it still overlaps the buttons at
                        opacity-0, and would otherwise swallow their clicks. */}
                    <ChevronRight
                        aria-hidden="true"
                        className="pointer-events-none size-4 text-muted-foreground transition-[transform,opacity] [grid-area:1/1] group-focus-within/row:opacity-0 group-hover/row:translate-x-0.5 group-hover/row:opacity-0"
                    />
                    {/* Revealed by the same triggers that hide the chevron, so
                        the row's trailing edge is never blank — including
                        keyboard focus, the only way to reach these without a
                        pointer. */}
                    <div className="flex items-center gap-1 opacity-0 transition-opacity [grid-area:1/1] group-focus-within/row:opacity-100 group-hover/row:opacity-100">
                        <Button aria-label="Edit" onClick={() => setEditing(true)} size="icon-sm" variant="ghost">
                            <Pencil />
                        </Button>
                        <Dialogs.Delete
                            project={project}
                            trigger={
                                <Button
                                    aria-label="Delete"
                                    className="text-destructive-foreground hover:bg-destructive/8"
                                    size="icon-sm"
                                    variant="ghost">
                                    <Trash2 />
                                </Button>
                            }
                        />
                    </div>
                </div>
                <Dialogs.Form
                    open={editing}
                    onOpenChange={setEditing}
                    project={{
                        id: project.id,
                        name: project.name,
                        description: project.description,
                    }}
                />
            </TableCell>
        </TableRow>
    )
}

/** The chrome around the rows, shared by the loaded list and its skeleton. */
function ProjectTable({ children }: { children: ReactNode }) {
    return (
        // className on Table lands on the inner <table>, not the scroll
        // container, so page spacing goes on a wrapper.
        <div className="mt-4">
            <Table variant="card">
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-full">Project</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Updated</TableHead>
                        <TableHead>
                            <span className="sr-only">Actions</span>
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>{children}</TableBody>
            </Table>
        </div>
    )
}

function ProjectHeader({ children }: { children?: ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <h1 className="font-heading text-2xl font-bold">Projects</h1>
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
            <ProjectTable>
                {Array.from({ length: 4 }, (_, i) => (
                    <TableRow key={i}>
                        <TableCell className="w-full max-w-0">
                            <div className="flex items-center gap-3">
                                <Skeleton className="size-8 shrink-0 rounded-lg" />
                                <div className="min-w-0 flex-1">
                                    <Skeleton className="h-4 w-40" />
                                    <Skeleton className="mt-1 h-3 w-64" />
                                </div>
                            </div>
                        </TableCell>
                        {/* Placeholder widths are chosen so the columns land
                            near their loaded size — a badge column sized for
                            "draft" jumps 60px when "ready-for-review" arrives. */}
                        <TableCell>
                            <Skeleton className="h-4.5 w-20" />
                        </TableCell>
                        <TableCell>
                            <Skeleton className="h-3 w-20" />
                        </TableCell>
                        <TableCell>
                            {/* Reserves the width of the two hover buttons,
                                which is what sizes this column once loaded. */}
                            <div className="flex w-15 justify-end">
                                <Skeleton className="size-4" />
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
            </ProjectTable>
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
                            A project gathers corpora and references around one research question. Create your first to
                            get started.
                        </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                        <Button onClick={() => setCreating(true)}>
                            <Plus /> New project
                        </Button>
                    </EmptyContent>
                </Empty>
            ) : (
                <ProjectTable>
                    {projects.map(project => (
                        <ProjectRow key={project.id} project={project} />
                    ))}
                </ProjectTable>
            )}
            <Dialogs.Form open={creating} onOpenChange={setCreating} users={users} />
        </>
    )
}

export default function Project() {
    const { data } = useLoaderData<typeof clientLoader>()

    return (
        <section>
            <Suspense fallback={<ProjectListSkeleton />}>
                <Await resolve={data}>
                    {({ projects, users }) => <ProjectList projects={projects} users={users} />}
                </Await>
            </Suspense>
        </section>
    )
}
