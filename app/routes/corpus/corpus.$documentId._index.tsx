import { useNavigate, useOutletContext } from "react-router"
import { CorpusDetail } from "@/components/corpus/detail"
import type { CorpusSection } from "@/lib/corpus"
import { EmptySections, explorerSections, type CorpusExplorerContext } from "@/routes/corpus/corpus.$documentId"

export default function CorpusOverviewRoute() {
    const { document, archive } = useOutletContext<CorpusExplorerContext>()
    const navigate = useNavigate()
    const sections = explorerSections(document, archive)

    function openSection(section: CorpusSection) {
        navigate(`documents?section=${encodeURIComponent(section.title)}`, {
            preventScrollReset: true,
        })
    }

    if (!document) return <EmptySections />

    return (
        <div className="flex flex-col gap-3 sm:flex-row">
            <CorpusDetail.DetailsCard document={document} />
            <CorpusDetail.DetailsCard document={document} />
        </div>
    )
}
