import {
    CheckCircle2,
    Circle,
    Pencil,
    Plus,
    Scale,
    Send,
    ShieldCheck,
    Trash,
    Undo2,
    X,
} from "lucide-react"
import { useState } from "react"
import { useFetcher } from "react-router"
import { ClassifyDialog } from "@/components/project/classify-dialog"
import { LicenseSheet } from "@/components/project/license-sheet"
import { OrganizationDialog } from "@/components/project/organization-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@exegia/corpora-ui"
import {
    Card,
    CardFrame,
    CardFrameHeader,
    CardFrameTitle,
    CardPanel,
} from "@/components/ui/card"
import { ButtonGroup } from "@/components/ui/group"
import { formatDate, formatRelativeTime } from "@/lib/format"
import type { CatalogLicence } from "@/lib/licenses"
import type { Organization } from "@/lib/organizations"
import {
    type AttachedLicense,
    type ProjectDetail,
    type ProjectStatus,
    reviewIssues,
} from "@/lib/projects"

const STATUS_DOT_COLORS: Record<ProjectStatus, string> = {
    draft: "bg-gray-500",
    started: "bg-blue-500",
    "ready-for-review": "bg-amber-500",
    published: "bg-emerald-500",
    failed: "bg-red-500",
}

function StatusLabel({ status }: { status: ProjectStatus }) {
    return (
        <span className="flex items-center gap-2">
      <span
          aria-hidden="true"
          className={`size-2 rounded-full ${STATUS_DOT_COLORS[status]}`}
      />
      <span className="truncate">{status}</span>
    </span>
    )
}

/**
 * The status workflow as contextual actions instead of a select: the
 * creator submits for review; the superadmin publishes or returns to draft.
 */
function StatusActions({
                           project,
                           superadmin,
                           fetcher,
                       }: {
    project: ProjectDetail
    superadmin: boolean
    fetcher: ReturnType<typeof useFetcher<{ ok: boolean; error?: string }>>
}) {
    const busy = fetcher.state !== "idle"
    const submit = (status: ProjectStatus) =>
        fetcher.submit({ intent: "set-status", status }, { method: "post" })

    if (project.status === "ready-for-review") {
        if (!superadmin) return null
        return (
            <ButtonGroup>
                <Button size="sm" disabled={busy} onClick={() => submit("published")}>
                    <ShieldCheck aria-hidden="true" className="size-4" />
                    Publish
                </Button>
                <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => submit("draft")}
                >
                    <Undo2 aria-hidden="true" className="size-4" />
                    Change to draft
                </Button>
            </ButtonGroup>
        )
    }

    if (project.status === "published") {
        if (!superadmin) return null
        return (
            <ButtonGroup>
                <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => submit("draft")}
                >
                    <Undo2 aria-hidden="true" className="size-4" />
                    Change to draft
                </Button>
            </ButtonGroup>
        )
    }

    // Drafting (incl. legacy started/failed rows, which only return to draft).
    return (
        <ButtonGroup>
            {project.status !== "draft" && (
                <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => submit("draft")}
                >
                    <Undo2 aria-hidden="true" className="size-4" />
                    Change to draft
                </Button>
            )}
            <Button
                size="sm"
                variant="outline"
                disabled={busy || reviewIssues(project).length > 0}
                onClick={() => submit("ready-for-review")}
            >
                <Send aria-hidden="true" className="size-4" />
                Ready for review
            </Button>
        </ButtonGroup>
    )
}

/** The three ready-for-review requirements with their pass/fail state. */
function ReviewChecklist({ project }: { project: ProjectDetail }) {
    const checks = [
        { label: "Licence attached and agreed", ok: project.licenses.length > 0 },
        { label: "Classified (bible, book, …)", ok: project.type !== null },
        { label: "Corpus attached", ok: project.corpus !== null },
    ]
    return (
        <ul className="mt-2 flex flex-col gap-1 text-xs">
            {checks.map((check) => (
                <li
                    key={check.label}
                    className={`flex items-center gap-1.5 ${
                        check.ok ? "text-muted-foreground" : "text-foreground"
                    }`}
                >
                    {check.ok ? (
                        <CheckCircle2 aria-hidden="true" className="size-3.5 text-emerald-600" />
                    ) : (
                        <Circle aria-hidden="true" className="size-3.5" />
                    )}
                    {check.label}
                </li>
            ))}
        </ul>
    )
}

/** One attached licence, styled like the corpus card: leading icon + meta. */
function AttachedLicenseRow({
                                license,
                                readOnly,
                            }: {
    license: AttachedLicense
    readOnly: boolean
}) {
    const fetcher = useFetcher<{ ok: boolean; error?: string }>()
    const busy = fetcher.state !== "idle"

    return (
        <li className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div className="flex min-w-0 items-center gap-3">
                <Scale
                    aria-hidden="true"
                    className="size-5 shrink-0 text-muted-foreground"
                />
                <div className="min-w-0">
                    <p className="truncate font-medium text-sm">
                        {license.title}
                        {license.status !== "active" && (
                            <Badge variant="destructive" className="ms-2">
                                {license.status}
                            </Badge>
                        )}
                    </p>
                    <p className="truncate text-muted-foreground text-xs">
                        Agreed {formatDate(license.agreedAt)} by{" "}
                        {license.agreedBy.name ?? license.agreedBy.username}
                    </p>
                    {fetcher.data?.ok === false && fetcher.data.error && (
                        <p role="alert" className="text-destructive text-xs">
                            {fetcher.data.error}
                        </p>
                    )}
                </div>
            </div>
            {!readOnly && (
                <fetcher.Form method="post" className="shrink-0">
                    <input type="hidden" name="intent" value="detach-license" />
                    <input type="hidden" name="licenseId" value={license.id} />
                    <Button type="submit" size="sm" variant="ghost" disabled={busy}>
                        <X aria-hidden="true" className="size-4" />
                        Remove
                    </Button>
                </fetcher.Form>
            )}
        </li>
    )
}

export interface ProjectDetailPanelProps {
    project: ProjectDetail
    licenseCatalog: CatalogLicence[]
    organizations: Organization[]
    /** Pre-auth: true when the superadmin exists in the directory (research R4). */
    superadmin: boolean
    readOnly: boolean
}

/** Project metadata card (002, SC-001): every detail field in one view. */
export function ProjectDetailPanel({
                                       project,
                                       licenseCatalog,
                                       organizations,
                                       superadmin,
                                       readOnly,
                                   }: ProjectDetailPanelProps) {
    const statusFetcher = useFetcher<{ ok: boolean; error?: string }>()
    const orgClearFetcher = useFetcher<{ ok: boolean; error?: string }>()
    const [classifying, setClassifying] = useState(false)
    const [editingOrganization, setEditingOrganization] = useState(false)

    const classification = [
        project.type,
        project.languages.length > 0
            ? project.languages.join(", ")
            : project.category,
    ]
        .filter(Boolean)
        .join(" · ")

    const issues = reviewIssues(project)
    const showChecklist =
        !["ready-for-review", "published"].includes(project.status) && issues.length > 0

    return (
        <CardFrame>
            <CardFrameHeader>
                <CardFrameTitle render={<h2 />}>Details</CardFrameTitle>
            </CardFrameHeader>
            <Card>
                <CardPanel>
                    {project.status === "ready-for-review" && (
                        <p
                            role="status"
                            className="mb-3 flex items-center gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-amber-700 text-sm dark:text-amber-400"
                        >
                            <ShieldCheck aria-hidden="true" className="size-4 shrink-0" />
                            In review — the project is read-only until the superadmin
                            publishes it or returns it to draft.
                        </p>
                    )}
                    <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
                        <div className="flex flex-col gap-1">
                            <dt className="font-medium">Status</dt>
                            <dd>
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <StatusLabel status={project.status} />
                                    <StatusActions
                                        project={project}
                                        superadmin={superadmin}
                                        fetcher={statusFetcher}
                                    />
                                </div>
                                {showChecklist && <ReviewChecklist project={project} />}
                                {project.status === "ready-for-review" && !superadmin && (
                                    <p className="mt-1 text-muted-foreground text-xs">
                                        Waiting for the superadmin to approve.
                                    </p>
                                )}
                                {statusFetcher.data?.ok === false && statusFetcher.data.error && (
                                    <p role="alert" className="mt-1 text-destructive text-xs">
                                        {statusFetcher.data.error}
                                    </p>
                                )}
                            </dd>
                        </div>

                        <div className="flex flex-col gap-1">
                            <dt className="font-medium">Classification</dt>
                            <dd className="flex items-center justify-between gap-2">
                <span
                    className={classification ? "capitalize" : "text-muted-foreground"}
                >
                  {classification || "Unclassified"}
                </span>
                                {!readOnly && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setClassifying(true)}
                                    >
                                        <Pencil aria-hidden="true" className="size-4" />
                                        Classify
                                    </Button>
                                )}
                            </dd>
                        </div>

                        <div className="flex flex-col gap-1">
                            <dt className="font-medium">Creator</dt>
                            <dd>{project.creator.name ?? project.creator.username}</dd>
                        </div>

                        <div className="flex flex-col gap-1">
                            <dt className="font-medium">Organization</dt>
                            <dd className="flex items-center justify-between gap-2">
                                {project.organization ? (
                                    <span className="min-w-0 truncate">
                    {project.organization.name}
                                        {project.organization.website && (
                                            <>
                                                {" · "}
                                                <a
                                                    href={project.organization.website}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-muted-foreground underline-offset-2 hover:underline"
                                                >
                                                    {project.organization.website}
                                                </a>
                                            </>
                                        )}
                  </span>
                                ) : (
                                    <span className="text-muted-foreground">No organization</span>
                                )}
                                {!readOnly && (
                                    <span className="flex shrink-0 items-center gap-1">
                    {project.organization && (
                        <orgClearFetcher.Form method="post">
                            <input
                                type="hidden"
                                name="intent"
                                value="set-organization"
                            />
                            <input type="hidden" name="organizationId" value="" />
                            <Button
                                type="submit"
                                size="sm"
                                variant="ghost"
                                disabled={orgClearFetcher.state !== "idle"}
                            >
                                <Trash aria-hidden="true" className="size-4" />
                                Remove
                            </Button>
                        </orgClearFetcher.Form>
                    )}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setEditingOrganization(true)}
                                        >
                                            {project.organization ? (
                                                <Pencil aria-hidden="true" className="size-4" />
                                            ) : (
                                                <Plus aria-hidden="true" className="size-4" />
                                            )}
                                            {project.organization ? "Change" : "Assign"}
                    </Button>
                  </span>
                                )}
                            </dd>
                            {orgClearFetcher.data?.ok === false && orgClearFetcher.data.error && (
                                <p role="alert" className="text-destructive text-xs">
                                    {orgClearFetcher.data.error}
                                </p>
                            )}
                        </div>

                        <div className="flex flex-col gap-1">
                            <dt className="font-medium">Dates</dt>
                            <dd className="text-muted-foreground">
                                Created {formatDate(project.createdAt)} · updated{" "}
                                <span title={project.updatedAt}>
                  {formatRelativeTime(project.updatedAt)}
                </span>
                            </dd>
                        </div>
                    </dl>

                    <div className="mt-4">
                        <div className="flex items-center justify-between gap-3">
                            <h3 className="font-medium text-sm">Licences</h3>
                            <LicenseSheet
                                catalog={licenseCatalog}
                                attachedIds={project.licenses.map((license) => license.id)}
                                agreedByUserId={project.creator.id}
                                disabled={readOnly}
                            />
                        </div>
                        {project.licenses.length === 0 ? (
                            <p className="py-2 text-muted-foreground text-sm">
                                No licences attached. A licence is required before the project
                                can go to review — attach one from the catalog.
                            </p>
                        ) : (
                            <ul className="mt-2 flex flex-col gap-2">
                                {project.licenses.map((license) => (
                                    <AttachedLicenseRow
                                        key={license.id}
                                        license={license}
                                        readOnly={readOnly}
                                    />
                                ))}
                            </ul>
                        )}
                    </div>
                </CardPanel>
            </Card>

            <ClassifyDialog
                open={classifying}
                onOpenChange={setClassifying}
                current={{
                    type: project.type,
                    languages: project.languages,
                    category: project.category,
                }}
            />
            <OrganizationDialog
                open={editingOrganization}
                onOpenChange={setEditingOrganization}
                organizations={organizations}
                currentId={project.organization?.id ?? null}
            />
        </CardFrame>
    )
}
