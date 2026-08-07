import { Scale } from "lucide-react"
import { Card, CardFrame, CardFrameAction, CardFrameHeader, CardFrameTitle, CardPanel } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import AgreedRow from "@/components/project/license/agreed-row"
import CatalogSheet from "@/components/project/license/catalog-sheet"
import PendingCard from "@/components/project/license/pending-card"
import type { SectionProps } from "@/components/project/license/types"
import { isAgreed } from "@/components/project/license/utils"

/** The project's licences: pending attachments first, then the agreed ones. */
export default function Section({ project, readOnly, licenseCatalog }: SectionProps) {
    const pending = project.licenses.filter(license => !isAgreed(license))
    const agreed = project.licenses.filter(isAgreed)

    return (
        <CardFrame>
            <CardFrameHeader>
                <CardFrameTitle render={<h2 />}>Licenses</CardFrameTitle>
                <CardFrameAction>
                    <CatalogSheet
                        catalog={licenseCatalog}
                        attached={project.licenses}
                        agreedByUserId={project.creator.id}
                        disabled={readOnly}
                    />
                </CardFrameAction>
            </CardFrameHeader>
            <Card>
                <CardPanel>
                    {project.licenses.length === 0 ? (
                        <Empty className="py-8 md:py-10">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <Scale />
                                </EmptyMedia>
                                <EmptyTitle>No licences attached</EmptyTitle>
                                <EmptyDescription>
                                    A licence is required before the project can go to review — attach one from the
                                    catalog.
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {pending.length > 0 && (
                                <ul className="flex flex-col gap-2">
                                    {pending.map(license => (
                                        <PendingCard
                                            key={license.id}
                                            license={license}
                                            agreedByUserId={project.creator.id}
                                            readOnly={readOnly}
                                        />
                                    ))}
                                </ul>
                            )}
                            {agreed.length > 0 && (
                                <ul className="flex flex-col divide-y">
                                    {agreed.map(license => (
                                        <AgreedRow key={license.id} license={license} readOnly={readOnly} />
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </CardPanel>
            </Card>
        </CardFrame>
    )
}
