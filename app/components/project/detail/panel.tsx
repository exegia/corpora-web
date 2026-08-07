import { CircleX, Pencil } from "lucide-react"
import { useState } from "react"
import { useFetcher } from "react-router"
import { Classify, Organization as OrganizationDialog } from "@/components/project/panels"

import { Button } from "@exegia/corpora-ui"
import { Badge } from "@/components/ui/badge"
import { Card, CardFrame, CardFrameHeader, CardFrameTitle, CardPanel } from "@/components/ui/card"
import PickerSection from "@/components/project/license/picker-section"
import MetadataBlock from "@/components/metadata.block"
import { StatusCard } from "@/components/project/status-card"
import { cn } from "@/lib/utils"
import type { ProjectDetailPanelProps } from "@/components/project/detail/type"

/** Project metadata card (002, SC-001): every detail field in one view. */
export function Panel({ project, licenseCatalog, organizations, superadmin, readOnly }: ProjectDetailPanelProps) {
    const statusFetcher = useFetcher<{ ok: boolean; error?: string }>()
    const orgClearFetcher = useFetcher<{ ok: boolean; error?: string }>()
    const [classifying, setClassifying] = useState(false)
    const [editingOrganization, setEditingOrganization] = useState(false)

    const classification = [
        project.type,
        project.languages.length > 0 ? project.languages.join(", ") : project.category,
    ]
        .filter(Boolean)
        .join(" · ")

    return (
        <>
            <CardFrame>
                <CardFrameHeader>
                    <CardFrameTitle render={<h2 />}>Details</CardFrameTitle>
                </CardFrameHeader>
                <div className="grid gap-x-1 sm:grid-cols-6">
                    <Card className="sm:col-span-2">
                        <CardPanel>
                            <StatusCard project={project} superadmin={superadmin} fetcher={statusFetcher} />
                        </CardPanel>
                    </Card>
                    <Card className="sm:col-span-4">
                        <CardPanel className="flex flex-col divide-y divide-border/60">
                            <MetadataBlock
                                label="Classification"
                                value={
                                    <span
                                        className={cn(
                                            "capitalize",
                                            classification ? "" : "text-muted-foreground italic"
                                        )}>
                                        {classification ? classification : "Unclassified"}
                                    </span>
                                }
                                actions={
                                    readOnly
                                        ? undefined
                                        : {
                                              icon: <Pencil aria-hidden="true" />,
                                              onClick: () => setClassifying(true),
                                              label: "Edit",
                                              // Three rows say "Edit"; the field has to be in the
                                              // accessible name, or they are indistinguishable.
                                              "aria-label": "Edit classification",
                                          }
                                }
                            />
                            <MetadataBlock label="Creator" value={project.creator.name ?? project.creator.username} />
                            <MetadataBlock
                                label="Organization"
                                value={
                                    <>
                                        <div className="flex flex-wrap items-center gap-2">
                                            {project.organization ? (
                                                // The name and its remove control are one chip: a
                                                // relative wrapper so the corner button can hang off
                                                // the badge, and a sibling of the link rather than a
                                                // child — a <button> inside an <a> is invalid.
                                                <span className="relative inline-flex max-w-full">
                                                    <Badge
                                                        size="lg"
                                                        variant="outline"
                                                        className="max-w-full"
                                                        render={
                                                            project.organization.website ? (
                                                                <a
                                                                    href={project.organization.website}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                />
                                                            ) : undefined
                                                        }>
                                                        <span className="truncate">{project.organization.name}</span>
                                                    </Badge>
                                                    {!readOnly && (
                                                        <orgClearFetcher.Form
                                                            method="post"
                                                            className="absolute -top-1.5 -right-1.5">
                                                            <input
                                                                type="hidden"
                                                                name="intent"
                                                                value="set-organization"
                                                            />
                                                            <input type="hidden" name="organizationId" value="" />
                                                            <button
                                                                type="submit"
                                                                aria-label="Remove"
                                                                disabled={orgClearFetcher.state !== "idle"}
                                                                className="flex rounded-full bg-background text-muted-foreground transition-colors outline-none hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-64">
                                                                <CircleX aria-hidden="true" className="size-3.5" />
                                                            </button>
                                                        </orgClearFetcher.Form>
                                                    )}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">No organization</span>
                                            )}
                                        </div>
                                        {orgClearFetcher.data?.ok === false && orgClearFetcher.data.error && (
                                            <p role="alert" className="text-xs text-destructive">
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
                                                  label: "Edit",
                                                  icon: <Pencil aria-hidden="true" />,
                                                  onClick: () => setEditingOrganization(true),
                                                  "aria-label": "Edit organization",
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
                                            }>
                                            {project.organization.website}
                                        </Button>
                                    )
                                }
                            />
                        </CardPanel>
                    </Card>
                </div>

                <Classify
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
            <PickerSection project={project} readOnly={readOnly} licenseCatalog={licenseCatalog} />
        </>
    )
}
