import { FileArchive, SearchIcon } from "lucide-react"
import { useState } from "react"
import { Link, useFetcher } from "react-router"
import { CommitHistory, CorpusDocumentCard } from "@/components/corpus/corpus-document-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardFrame, CardFrameAction, CardFrameHeader, CardFrameTitle, CardPanel } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import {
    Sheet,
    SheetDescription,
    SheetHeader,
    SheetPanel,
    SheetPopup,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import type { CorpusDocument } from "@/lib/corpus"
import { formatRelativeTime } from "@/lib/format"
import type { CorpusCommit, ProjectCorpus } from "@/lib/projects"

function ImportOptionRow({ document, attachedId }: { document: CorpusDocument; attachedId: string | null }) {
    const fetcher = useFetcher<{ ok: boolean; error?: string }>()
    const busy = fetcher.state !== "idle"
    const attached = document.id === attachedId

    return (
        <li className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0">
                <p className="truncate text-sm font-medium">{document.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                    {[
                        document.source === "huggingface" ? "Hugging Face" : "Uploaded file",
                        document.commits.length > 0 ? `${document.commits.length} commits` : null,
                        formatRelativeTime(document.uploadedAt),
                    ]
                        .filter(Boolean)
                        .join(" · ")}
                </p>
                {fetcher.data?.ok === false && fetcher.data.error && (
                    <p role="alert" className="text-xs text-destructive">
                        {fetcher.data.error}
                    </p>
                )}
            </div>
            {attached ? (
                <Badge variant="secondary">Imported</Badge>
            ) : (
                <fetcher.Form method="post">
                    <input type="hidden" name="intent" value="attach-corpus" />
                    <input type="hidden" name="documentId" value={document.id} />
                    <Button type="submit" size="sm" variant="outline" disabled={busy}>
                        Import
                    </Button>
                </fetcher.Form>
            )}
        </li>
    )
}

/**
 * Browse the corpus library in a right inset sheet (mirrors LicenseSheet):
 * search the documents loaded from the db and import one into the project.
 */
function ImportCorpusSheet({
    documents,
    attachedId,
    disabled,
}: {
    documents: CorpusDocument[]
    attachedId: string | null
    disabled?: boolean
}) {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState("")

    const needle = query.trim().toLowerCase()
    const results = needle
        ? documents.filter(document =>
              [document.name, document.filename, document.source]
                  .filter(Boolean)
                  .some(field => String(field).toLowerCase().includes(needle))
          )
        : documents

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={<Button size="sm" variant="outline" disabled={disabled} />}>
                Import corpus
            </SheetTrigger>
            <SheetPopup side="right" variant="inset" showBackdrop={false}>
                <SheetHeader>
                    <SheetTitle>Import a corpus</SheetTitle>
                    <SheetDescription>
                        Pick the document this project publishes from the corpus library.
                    </SheetDescription>
                    <InputGroup>
                        <InputGroupInput
                            aria-label="Search corpora"
                            placeholder="Search corpora…"
                            type="search"
                            value={query}
                            onChange={event => setQuery(event.currentTarget.value)}
                        />
                        <InputGroupAddon>
                            <SearchIcon aria-hidden="true" />
                        </InputGroupAddon>
                    </InputGroup>
                </SheetHeader>
                <SheetPanel>
                    {documents.length === 0 ? (
                        <p className="py-4 text-sm text-muted-foreground">
                            The corpus library is empty. Upload a .corpus document on the{" "}
                            <Link to="/corpus" className="underline underline-offset-2" viewTransition>
                                Corpus
                            </Link>{" "}
                            page first.
                        </p>
                    ) : results.length === 0 ? (
                        <p className="py-4 text-sm text-muted-foreground">No corpus matches “{query}”.</p>
                    ) : (
                        <ul className="divide-y">
                            {results.map(document => (
                                <ImportOptionRow key={document.id} document={document} attachedId={attachedId} />
                            ))}
                        </ul>
                    )}
                </SheetPanel>
            </SheetPopup>
        </Sheet>
    )
}

export interface CorpusSectionProps {
    corpus: ProjectCorpus | null
    commits: CorpusCommit[]
    documents: CorpusDocument[]
    readOnly: boolean
}

/**
 * The project's corpus (003) in a CardFrame, like the Details panel:
 * imported from the corpus library, where the .corpus documents are uploaded
 * and their version history lives. Removing here only detaches — the
 * document stays in the library.
 */
export default function CorpusSection({ corpus, commits, documents, readOnly }: CorpusSectionProps) {
    const detachFetcher = useFetcher<{ ok: boolean; error?: string }>()

    return (
        <CardFrame>
            <CardFrameHeader>
                <CardFrameTitle render={<h2 />}>Corpus</CardFrameTitle>
                {!readOnly && (
                    <CardFrameAction>
                        <ImportCorpusSheet documents={documents} attachedId={corpus?.id ?? null} />
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
