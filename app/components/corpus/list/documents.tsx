import type { CorpusDocument } from "@/lib/corpus"
import { useReadySound } from "@/lib/sounds"
import { collectLanguages, DEFAULT_FILTERS, filterDocuments, PAGE_SIZE, paginate } from "./utils"
import type { CorpusFilters } from "./types"
import { useState } from "react"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { FileArchive } from "lucide-react"
import { List } from "."

export function DocumentList({ documents }: { documents: CorpusDocument[] }) {
    useReadySound()
    // Filter and page state lives here, under <Await>: the resolved component
    // stays mounted across revalidations, so a conversion landing a new row
    // never resets the filters.
    const [filters, setFilters] = useState<CorpusFilters>(DEFAULT_FILTERS)
    const [page, setPage] = useState(1)

    if (documents.length === 0) {
        return (
            <Empty className="py-10 md:py-14">
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <FileArchive />
                    </EmptyMedia>
                    <EmptyTitle>The corpus library is empty</EmptyTitle>
                    <EmptyDescription>
                        Upload a .corpus document or convert a source file to get started.
                    </EmptyDescription>
                </EmptyHeader>
            </Empty>
        )
    }

    const filtered = filterDocuments(documents, filters)
    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const current = Math.min(page, pageCount)
    const visible = paginate(filtered, current)

    return (
        <div className="flex flex-col gap-4">
            <List.Toolbar
                filters={filters}
                languages={collectLanguages(documents)}
                onFiltersChange={next => {
                    setFilters(next)
                    setPage(1)
                }}
                total={filtered.length}
            />
            {filtered.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                    No corpuses match the current filters.
                </p>
            ) : (
                <>
                    <List.Table documents={visible} />
                    <List.Footer
                        end={(current - 1) * PAGE_SIZE + visible.length}
                        onPageChange={setPage}
                        page={current}
                        pageCount={pageCount}
                        start={(current - 1) * PAGE_SIZE + 1}
                        total={filtered.length}
                    />
                </>
            )}
        </div>
    )
}
