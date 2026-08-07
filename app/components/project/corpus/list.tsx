import { LibraryBig } from "lucide-react"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import ListRow from "@/components/project/corpus/list-row"
import type { ListProps } from "@/components/project/corpus/types"

/**
 * The project's corpus references: library corpora loaded alongside the
 * dataset (e.g. a commentary referencing the bible version it comments on).
 */
export default function List({ corpora, readOnly }: ListProps) {
    if (corpora.length === 0) {
        return (
            <Empty className="py-8 md:py-10">
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <LibraryBig />
                    </EmptyMedia>
                    <EmptyTitle>No references</EmptyTitle>
                    <EmptyDescription>
                        Use “Add reference” to point at library corpora that should load with this dataset.
                    </EmptyDescription>
                </EmptyHeader>
            </Empty>
        )
    }

    return (
        <ul className="divide-y">
            {corpora.map(link => (
                <ListRow key={link.corpusId} link={link} readOnly={readOnly} />
            ))}
        </ul>
    )
}
