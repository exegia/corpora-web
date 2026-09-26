import { useOutletContext } from "react-router"
import { CorpusDetail } from "@/components/corpus/detail"
import type { CorpusExplorerContext } from "@/routes/corpus/corpus.$documentId"

export { clientAction } from "@/routes/corpus/corpus.$documentId"

export default function CorpusOverviewRoute() {
  const { document, archive } = useOutletContext<CorpusExplorerContext>()

  return (
    <div className="grid items-start gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-6">
          <CorpusDetail.DetailsCard document={document} />
          <CorpusDetail.Charts.Overview document={document} archive={archive} />
          <CorpusDetail.Charts.WordPerDocument document={document} archive={archive} />
    </div>
  )
}
