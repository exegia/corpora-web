import CorporaApi from "@/lib/api"
import type { UseCorporaApiResult } from "./types"

/**
 * The corpora-py client, reached from a component.
 *
 * Every method is on the returned object, arguments are passed at call time,
 * and each call resolves to its own result — so a component keeps its own
 * `useState` for data/loading/error exactly as it does today:
 *
 *     const api = useCorporaApi()
 *     const content = await api.fetchCorpusContent(archive, { ref, limit: 20 })
 *     const node = await api.fetchCorpusNode(archive, token.node)
 *
 * This is a named seam over a module-scope object, not a wrapper. It
 * deliberately adds nothing:
 *
 * - No memoisation. `CorporaApi` is built once at module scope, so it is
 *   already the most stable identity available; a `useMemo` would only add a
 *   layer to keep in sync.
 * - No error mapping. `CorporaApiError.kind` is the taxonomy callers switch on
 *   (see `isQuietMiss` in lib/api/utils.ts), so errors pass through untouched.
 * - No state, and nothing fires on mount. Route data belongs in a clientLoader
 *   (docs/data-loading.md); this is for the interactive reads that happen after
 *   a route has painted, the way the corpus explorer pages content as the
 *   reader clicks through it.
 *
 * Caveat worth knowing: because this calls no hooks of its own, neither React
 * nor oxlint's `react/rules-of-hooks` will stop it being used from a
 * clientLoader. That boundary stays a convention.
 */
function useCorporaApi(): UseCorporaApiResult {
  return CorporaApi
}

export default useCorporaApi
