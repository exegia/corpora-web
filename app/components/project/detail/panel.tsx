import { useState } from "react"
import { useFetcher } from "react-router"
import { Button } from "@exegia/corpora-ui"
import MetadataBlock from "@/components/metadata.block"
import { Card, CardFrame, CardFrameHeader, CardFrameTitle, CardPanel } from "@/components/ui/card"
import ClassificationField from "@/components/project/detail/classification-field"
import ClassifyDialog from "@/components/project/detail/classify-dialog"
import OrganizationDialog from "@/components/project/detail/organization-dialog"
import OrganizationField from "@/components/project/detail/organization-field"
import StatusCard from "@/components/project/detail/status-card"
import type { PanelProps } from "@/components/project/detail/types"
import LicenseSection from "@/components/project/license/section"
import type { ActionResult } from "@/components/project/types"

/** Project metadata card (002, SC-001): every detail field in one view. */
export default function Panel({ project, licenseCatalog, organizations, superadmin, readOnly }: PanelProps) {
    const statusFetcher = useFetcher<ActionResult>()
    const [classifying, setClassifying] = useState(false)
    const [editingOrganization, setEditingOrganization] = useState(false)

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
                            <ClassificationField
                                project={project}
                                readOnly={readOnly}
                                onEdit={() => setClassifying(true)}
                            />
                            <MetadataBlock label="Creator" value={project.creator.name ?? project.creator.username} />
                            <OrganizationField
                                organization={project.organization}
                                readOnly={readOnly}
                                onEdit={() => setEditingOrganization(true)}
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
            <LicenseSection project={project} readOnly={readOnly} licenseCatalog={licenseCatalog} />
        </>
    )
}
