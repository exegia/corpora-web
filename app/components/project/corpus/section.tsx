import { FileArchive } from "lucide-react"
import { useFetcher } from "react-router"
import { CommitHistory, CorpusDocumentCard } from "@/components/corpus/corpus-document-card"
import { Button } from "@/components/ui/button"
import { Card, CardFrame, CardFrameAction, CardFrameHeader, CardFrameTitle, CardPanel } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import ImportSheet from "@/components/project/corpus/import-sheet"
import type { SectionProps } from "@/components/project/corpus/types"
import type { ActionResult } from "@/components/project/types"

/**
 * The project's corpus (003) in a CardFrame, like the Details panel:
 * imported from the corpus library, where the .corpus documents are uploaded
 * and their version history lives. Removing here only detaches — the
 * document stays in the library.
 */
export default function Section({ corpus, commits, documents, readOnly }: SectionProps) {
    const detachFetcher = useFetcher<ActionResult>()

    return (
        <CardFrame>
            <CardFrameHeader>
                <CardFrameTitle render={<h2 />}>Corpus</CardFrameTitle>
                {!readOnly && (
                    <CardFrameAction>
                        <ImportSheet documents={documents} attachedId={corpus?.id ?? null} />
                    </CardFrameAction>
                )}
            </CardFrameHeader>
            <Card>
                <CardPanel>
                    {!corpus ? (
                        <Empty className="py-8 md:py-10">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <FileArchive />
                                </EmptyMedia>
                                <EmptyTitle>No corpus attached</EmptyTitle>
                                <EmptyDescription>
                                    Import the document this project publishes from the corpus library.
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    ) : (
                        <div className="flex flex-col gap-4">
                            <CorpusDocumentCard
                                document={corpus}
                                actions={
                                    !readOnly && (
                                        <detachFetcher.Form method="post">
                                            <input type="hidden" name="intent" value="detach-corpus" />
                                            <Button
                                                type="submit"
                                                size="sm"
                                                variant="ghost"
                                                disabled={detachFetcher.state !== "idle"}>
                                                Remove
                                            </Button>
                                        </detachFetcher.Form>
                                    )
                                }
                            />
                            {detachFetcher.data?.ok === false && detachFetcher.data.error && (
                                <p role="alert" className="text-sm text-destructive">
                                    {detachFetcher.data.error}
                                </p>
                            )}
                            <CommitHistory commits={commits} />
                        </div>
                    )}
                </CardPanel>
            </Card>
        </CardFrame>
    )
}
