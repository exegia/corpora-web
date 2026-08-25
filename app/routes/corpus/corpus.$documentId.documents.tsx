import { useNavigate, useOutletContext, useSearchParams } from "react-router"
import { CorpusDetail } from "@/components/corpus/detail"
import { sectionByTitle } from "@/components/corpus/detail/utils"
import {
  EmptySections,
  explorerSections,
  type CorpusExplorerContext,
} from "@/routes/corpus/corpus.$documentId"

// fetcher.Form posts to this leaf; it does not bubble to the parent action.
export { clientAction } from "@/routes/corpus/corpus.$documentId"

export default function CorpusDocumentsRoute() {
  const { document, archive } = useOutletContext<CorpusExplorerContext>()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const sections = explorerSections(document, archive)
  const section = sectionByTitle(sections, params.get("section"))

  if (!section) return <EmptySections />

  return (
    <CorpusDetail.Reader
      archive={archive}
      key={section.title}
      onViewOccurrences={() =>
        navigate("../analytics", { preventScrollReset: true })
      }
      sectionTitle={section.title}
    />
  )
}
