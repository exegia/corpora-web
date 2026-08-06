import {
    CheckCircle2,
    Circle,
    Pencil,
    Plus,
    Send,
    ShieldCheck,
    Trash,
    Undo2
} from "lucide-react"
import { useState } from "react"
import { useFetcher } from "react-router"
import { ClassifyDialog } from "@/components/project/classify-dialog"

import { OrganizationDialog } from "@/components/project/organization-dialog"

import { Button } from "@exegia/corpora-ui"
import {
    Card,
    CardFrame,
    CardFrameHeader,
    CardFrameTitle,
    CardPanel,
} from "@/components/ui/card"
import { formatDate, formatRelativeTime } from "@/lib/format"
import type { CatalogLicence } from "@/lib/licenses"
import type { Organization } from "@/lib/organizations"
import LicensePickerSection from "@/components/project/license-picker-section"
import MetadataBlock, { type MetadataAction } from "@/components/metadata.block"
import StatusBlock from "@/components/status.block"
import {
    type ProjectDetail,
    type ProjectStatus,
    reviewIssues,
} from "@/lib/projects"

/**
 * The status workflow as contextual actions instead of a select: the
 * creator submits for review; the superadmin publishes or returns to draft.
 */
function statusActions(
    project: ProjectDetail,
    superadmin: boolean,
    fetcher: ReturnType<typeof useFetcher<{ ok: boolean; error?: string }>>,
): MetadataAction[] {
    const busy = fetcher.state !== "idle"
    const submit = (status: ProjectStatus) =>
        fetcher.submit({ intent: "set-status", status }, { method: "post" })

    const toDraft: MetadataAction = {
        label: "Change to draft",
        icon: <Undo2 aria-hidden="true" className="size-4" />,
        variant: "outline",
        size: "sm",
        disabled: busy,
        onClick: () => submit("draft"),
    }

    if (project.status === "ready-for-review") {
        if (!superadmin) return []
        return [
            {
                label: "Publish",
                icon: <ShieldCheck aria-hidden="true" className="size-4" />,
                size: "sm",
                disabled: busy,
                onClick: () => submit("published"),
            },
            toDraft,
        ]
    }

    if (project.status === "published") {
        return superadmin ? [toDraft] : []
    }

    // Drafting (incl. legacy started/failed rows, which only return to draft).
    return [
        ...(project.status !== "draft" ? [toDraft] : []),
        {
            label: "Ready for review",
            icon: <Send aria-hidden="true" className="size-4" />,
            variant: "outline",
            size: "sm",
            disabled: busy || reviewIssues(project).length > 0,
            onClick: () => submit("ready-for-review"),
        },
    ]
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
      <>
        <CardFrame>
            <CardFrameHeader>
                <CardFrameTitle render={<h2 />}>Details</CardFrameTitle>
            </CardFrameHeader>
            <div className="grid sm:grid-cols-6 gap-x-1">
              <Card className="sm:col-span-2">
                <CardPanel>
                  <MetadataBlock
                    label="Status"
                    value={<StatusBlock status={project.status} />}
                    actions={statusActions(project, superadmin, statusFetcher)}
                  />
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
                </CardPanel>
              </Card>
              <Card className="sm:col-span-4">
                <CardPanel className="grid gap-4 sm:grid-cols-2">
                  <MetadataBlock
                    label="Classification"
                    value={
                      classification ? (
                        <span className="capitalize">{classification}</span>
                      ) : (
                        "Unclassified"
                      )
                    }
                    actions={
                      readOnly
                        ? undefined
                        : [
                            {
                              label: "Classify",
                              icon: <Pencil aria-hidden="true" className="size-4" />,
                              variant: "outline",
                              size: "sm",
                              onClick: () => setClassifying(true),
                            },
                          ]
                    }
                  />
                  <MetadataBlock
                    label="Creator"
                    value={project.creator.name ?? project.creator.username}
                  />
                  <MetadataBlock
                    label="Organization"
                    value={
                      <>
                        <div className="flex flex-wrap items-center gap-2">
                          {project.organization ? (
                            <span className="min-w-0 truncate">
                              {project.organization.name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              No organization
                            </span>
                          )}
                          {!readOnly && project.organization && (
                            <orgClearFetcher.Form method="post">
                              <input
                                type="hidden"
                                name="intent"
                                value="set-organization"
                              />
                              <input
                                type="hidden"
                                name="organizationId"
                                value=""
                              />
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
                        </div>
                        {orgClearFetcher.data?.ok === false &&
                          orgClearFetcher.data.error && (
                            <p role="alert" className="text-destructive text-xs">
                              {orgClearFetcher.data.error}
                            </p>
                          )}
                      </>
                    }
                    actions={
                      readOnly
                        ? undefined
                        : [
                            {
                              label: project.organization ? "Change" : "Assign",
                              icon: project.organization ? (
                                <Pencil aria-hidden="true" className="size-4" />
                              ) : (
                                <Plus aria-hidden="true" className="size-4" />
                              ),
                              variant: "outline",
                              size: "sm",
                              onClick: () => setEditingOrganization(true),
                            },
                          ]
                    }
                  />
                  <MetadataBlock
                    label="Website"
                    value={
                      project.organization?.website && (
                        <Button
                          variant="link"
                          size="sm"
                          render={
                            <a
                              href={project.organization.website}
                              target="_blank"
                              rel="noreferrer"
                            />
                          }
                        >
                          {project.organization.website}
                        </Button>
                      )
                    }
                  />
                </CardPanel>
              </Card>
        </div>

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
      <LicensePickerSection project={project} readOnly={readOnly} licenseCatalog={licenseCatalog} />
      </>
    )
}
