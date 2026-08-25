import { Blocks } from "@/components/blocks"
import { ArrowLeft, FolderX, Pencil } from "lucide-react"
import { Suspense, useState } from "react"
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router"
import { Await, Link, redirect, useLoaderData, useViewTransitionState } from "react-router"
import { Corpus } from "@/components/project/corpus"
import { Detail } from "@/components/project/detail"
import { Dialogs } from "@/components/project/dialogs"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
// `Corpus` is the UI namespace above, so the data layer comes in as `Corpora`.
import Corpora from "@/lib/corpus"
import { formatDate, formatRelativeTime } from "@/lib/format"
import Licences from "@/lib/licenses"
import Organization from "@/lib/organization"
import Project, {
    type BookType,
    CATEGORIZED_TYPES,
    type CategoryType,
    type Classification,
    type LanguageType,
    type ProjectStatus,
    SCRIPTURAL_TYPES,
} from "@/lib/projects"
import { useLoadingSound, useReadySound } from "@/lib/sounds"
import { getSuperadmin } from "@/lib/user/users"

export async function clientLoader({ params }: LoaderFunctionArgs) {
    const projectId = params.projectId ?? ""
    // Awaited: the breadcrumb reads `project` off loaderData synchronously
    // (components/breadcrumb), so deferring it there leaves the trail showing
    // "Project" instead of the name. It is one indexed row.
    const project = await Project.Queries.getProject(projectId)
    // Deliberately not awaited (see routes/project.tsx): the five queries below
    // are the slow part, so the workspace suspends on this promise and shows the
    // skeleton meanwhile.
    const data = (async () => {
        const [corpusOptions, licenseCatalog, organizations, superadmin, documents] = project
            ? await Promise.all([
                  Project.Queries.listCorpusOptions(projectId),
                  Licences.Catalog.listLicences(),
                  Organization.listOrganizations(),
                  getSuperadmin(),
                  Corpora.Documents.listCorpusDocuments(),
              ])
            : [[], [], [], null, []]
        return {
            project,
            corpusOptions,
            documents,
            licenseCatalog,
            organizations,
            // Pre-auth: the session acts as the superadmin when the directory has one.
            superadmin: superadmin !== null,
        }
    })()
    return { project, data }
}

/** Build the discriminated Classification from form fields (FR-006..FR-009). */
function parseClassification(form: FormData): Classification {
    const type = String(form.get("type") ?? "")
    if (!type) return null
    if ((SCRIPTURAL_TYPES as readonly string[]).includes(type)) {
        return {
            type: type as (typeof SCRIPTURAL_TYPES)[number],
            languages: String(form.get("languages") ?? "")
                .split(",")
                .filter(Boolean) as LanguageType[],
        }
    }
    if ((CATEGORIZED_TYPES as readonly string[]).includes(type)) {
        return {
            type: type as (typeof CATEGORIZED_TYPES)[number],
            category: String(form.get("category") ?? "") as CategoryType,
        }
    }
    return { type: type as BookType } as Classification
}

export async function clientAction({ request, params }: ActionFunctionArgs) {
    const projectId = params.projectId ?? ""
    const form = await request.formData()
    const intent = String(form.get("intent") ?? "")
    try {
        // A project in review is read-only for everything except the status
        // decision itself (superadmin approve / return).
        if (intent !== "set-status") {
            await Project.Mutations.assertEditable(projectId)
        }
        switch (intent) {
            case "update-project":
                await Project.Mutations.updateProject(projectId, {
                    name: String(form.get("name") ?? ""),
                    description: String(form.get("description") ?? ""),
                })
                return { ok: true, intent }
            case "delete-project":
                await Project.Mutations.deleteProject(projectId)
                return redirect("/project")
            case "set-status": {
                const project = await Project.Queries.getProject(projectId)
                if (!project) {
                    throw new Project.Errors.DataError("not-found", "This project no longer exists.")
                }
                const superadmin = (await getSuperadmin()) !== null
                await Project.Mutations.updateProjectStatus(project, String(form.get("status") ?? "") as ProjectStatus, superadmin)
                return { ok: true, intent }
            }
            case "classify":
                await Project.Mutations.classifyProject(projectId, parseClassification(form))
                return { ok: true, intent }
            case "attach-license":
                await Licences.Attachment.attachLicence(
                    projectId,
                    String(form.get("licenseId") ?? ""),
                    // Pre-auth: the project's creator is the agreeing user (plan Constraints)
                    String(form.get("agreedByUserId") ?? "")
                )
                return { ok: true, intent }
            case "agree-license":
                await Licences.Attachment.agreeLicence(
                    projectId,
                    String(form.get("licenseId") ?? ""),
                    String(form.get("agreedByUserId") ?? "")
                )
                return { ok: true, intent }
            case "detach-license":
                await Licences.Attachment.detachLicence(projectId, String(form.get("licenseId") ?? ""))
                return { ok: true, intent }
            case "set-organization": {
                const organizationId = String(form.get("organizationId") ?? "")
                await Project.Mutations.setProjectOrganization(projectId, organizationId || null)
                return { ok: true, intent }
            }
            case "create-organization": {
                const organization = await Organization.createOrganization({
                    name: String(form.get("name") ?? ""),
                    website: String(form.get("website") ?? ""),
                })
                await Project.Mutations.setProjectOrganization(projectId, organization.id)
                return { ok: true, intent }
            }
            case "link-corpus":
                await Project.Mutations.linkCorpus(projectId, String(form.get("corpusId") ?? ""))
                return { ok: true, intent }
            case "unlink-corpus":
                await Project.Mutations.unlinkCorpus(projectId, String(form.get("corpusId") ?? ""))
                return { ok: true, intent }
            case "attach-corpus":
                await Corpora.Documents.attachCorpusToProject(projectId, String(form.get("documentId") ?? ""))
                return { ok: true, intent }
            case "detach-corpus":
                await Corpora.Documents.detachCorpusFromProject(projectId)
                return { ok: true, intent }
            default:
                return { ok: false, error: "Unknown action." }
        }
    } catch (error) {
        if (error instanceof Project.Errors.DataError) {
            return { ok: false, error: error.message }
        }
        return {
            ok: false,
            error: "Something went wrong. Your change was not saved.",
        }
    }
}

function ProjectNotFound() {
    return (
        <Empty>
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <FolderX />
                </EmptyMedia>
                <EmptyTitle>This project no longer exists</EmptyTitle>
                <EmptyDescription>It may have been deleted in another session.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
                <Button render={<Link to="/project" viewTransition />}>
                    <ArrowLeft aria-hidden="true" className="size-4" />
                    Back to projects
                </Button>
            </EmptyContent>
        </Empty>
    )
}

/** Stands in for the panels only — the header renders from the awaited project. */
function PanelsSkeleton() {
    useLoadingSound()

    return (
        <div aria-busy="true" aria-label="Loading project" className="flex flex-col gap-6" role="status">
            <Card className="gap-4 p-6">
                {Array.from({ length: 4 }, (_, i) => (
                    <div className="flex items-center justify-between gap-4" key={i}>
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-4 w-40" />
                    </div>
                ))}
            </Card>
            <Separator />
            <div className="flex flex-col gap-3">
                <Skeleton className="h-5 w-32" />
                <Card className="gap-3 p-6">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-2/3" />
                </Card>
            </div>
        </div>
    )
}

type WorkspaceData = Awaited<Awaited<ReturnType<typeof clientLoader>>["data"]>

/** The sections that need the deferred queries. */
function WorkspacePanels({
    project,
    corpusOptions,
    documents,
    licenseCatalog,
    organizations,
    superadmin,
}: WorkspaceData) {
    useReadySound()

    if (!project) return null

    const readOnly = Project.Rules.isProjectReadOnly(project.status)

    return (
        <>
            <Detail.Panel
                project={project}
                licenseCatalog={licenseCatalog}
                organizations={organizations}
                superadmin={superadmin}
                readOnly={readOnly}
            />

            <Corpus.Section corpus={project.corpus} commits={project.commits} documents={documents} readOnly={readOnly} />

            <Corpus.References corpora={project.corpora} options={corpusOptions} readOnly={readOnly} />
        </>
    )
}

export default function ProjectWorkspace() {
    const { project, data } = useLoaderData<typeof clientLoader>()
    const [editing, setEditing] = useState(false)
    // The title morphs out of the list row it was opened from. Named only while
    // that navigation is in flight, so the name is never on two elements at once.
    const morphing = useViewTransitionState(project ? `/project/${project.id}` : "")

    if (!project) return <ProjectNotFound />

    const readOnly = Project.Rules.isProjectReadOnly(project.status)

    return (
        <section className="flex flex-col gap-6">
            {/* Outside the Suspense boundary: the project itself is awaited, so the
          heading is painted immediately and is present in the incoming view
          transition snapshot — a skeleton here would have nothing to morph. */}
            <header className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <h1
                        className="font-sans text-2xl font-bold break-words capitalize"
                        style={{
                            viewTransitionName: morphing ? "project-title" : "none",
                        }}>
                        {project.name}
                    </h1>
                    {project.description && (
                        <p className="mt-1 break-words whitespace-pre-wrap text-muted-foreground">
                            {project.description}
                        </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                        Created {formatDate(project.createdAt)} · updated {formatRelativeTime(project.updatedAt)}
                    </p>
                </div>
                {!readOnly && (
                    <div className="flex shrink-0 items-center gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
                            <Pencil aria-hidden="true" className="size-4" />
                            Edit
                        </Button>
                        <Dialogs.Delete project={{ id: project.id, name: project.name }} />
                    </div>
                )}
            </header>

            {readOnly && (
                <Blocks.Alert
                    variant="info"
                    title="In review"
                    description="This project is locked while the superadmin reviews it. Return it to draft to make further changes."
                />
            )}

            <Suspense fallback={<PanelsSkeleton />}>
                <Await resolve={data}>{resolved => <WorkspacePanels {...resolved} />}</Await>
            </Suspense>

            <Dialogs.Form
                open={editing}
                onOpenChange={setEditing}
                project={{
                    id: project.id,
                    name: project.name,
                    description: project.description,
                }}
            />
        </section>
    )
}
