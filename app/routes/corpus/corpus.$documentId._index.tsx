import { useNavigate, useOutletContext } from "react-router"
import { CorpusDetail } from "@/components/corpus/detail"
import type { CorpusSection } from "@/lib/corpus/corpus"
import {
  EmptySections,
  explorerSections,
  type CorpusExplorerContext,
} from "@/routes/corpus/corpus.$documentId"

export default function CorpusOverviewRoute() {
  const { document, archive } = useOutletContext<CorpusExplorerContext>()
  const navigate = useNavigate()
  const sections = explorerSections(document, archive)

  function openSection(section: CorpusSection) {
    navigate(`documents?section=${encodeURIComponent(section.title)}`, {
      preventScrollReset: true,
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
      <CorpusDetail.DetailsCard document={document} />
      {sections.length > 0 ? (
        <CorpusDetail.OverviewTable
          onOpenSection={openSection}
          sections={sections}
        />
      ) : (
        <EmptySections />
      )}
    </div>
  )
}
