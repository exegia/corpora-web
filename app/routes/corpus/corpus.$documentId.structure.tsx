import { useOutletContext } from "react-router"
import { CorpusDetail } from "@/components/corpus/detail"
import type { CorpusExplorerContext } from "@/routes/corpus/corpus.$documentId"

// fetcher.Form posts to this leaf; it does not bubble to the parent action.
export { clientAction } from "@/routes/corpus/corpus.$documentId"

export default function CorpusStructureRoute() {
  const { document, archive } = useOutletContext<CorpusExplorerContext>()
  return <CorpusDetail.Structure archive={archive} document={document} />
}
