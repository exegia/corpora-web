import { useOutletContext } from "react-router"
import { CorpusDetail } from "@/components/corpus/detail"
import type { CorpusExplorerContext } from "@/routes/corpus/corpus.$documentId"

// fetcher.Form posts to this leaf; it does not bubble to the parent action.
export { clientAction } from "@/routes/corpus/corpus.$documentId"

export default function CorpusActivityRoute() {
  const { document, archive } = useOutletContext<CorpusExplorerContext>()
  return <CorpusDetail.Activity archive={archive} document={document} />
}
