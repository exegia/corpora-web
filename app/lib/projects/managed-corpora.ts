import { apiFetch } from "@/lib/api/utils"
import { DataError } from "./errors"
import type { CorpusLink, CorpusOption } from "./types"

interface ManagedCorpus {
  id: string
  title: string
  language: string | null
  linked: boolean
}

/** Read all visible pages; reject malformed or cyclic cursors instead of silently truncating. */
async function listManaged(projectId: string, linkedOnly: boolean): Promise<ManagedCorpus[]> {
  const rows: ManagedCorpus[] = []
  const seen = new Set<string>()
  let after: string | null = null
  try {
    for (let page = 0; page < 100; page++) {
      const params = new URLSearchParams({ linked_only: String(linkedOnly), limit: "100" })
      if (after) params.set("after", after)
      const response = await apiFetch(`/v1/projects/${encodeURIComponent(projectId)}/corpora?${params}`,
        { cache: "no-store" })
      const body: unknown = await response.json()
      if (!body || typeof body !== "object" || !("items" in body) || !("next_cursor" in body)) {
        throw new Error("Invalid corpus page")
      }
      const { items, next_cursor: next } = body as { items: unknown; next_cursor: unknown }
      if (!Array.isArray(items) || items.length > 100 || (next !== null && typeof next !== "string")) {
        throw new Error("Invalid corpus page")
      }
      for (const item of items) {
        if (!item || typeof item !== "object") throw new Error("Invalid corpus")
        const value = item as Record<string, unknown>
        if (typeof value.id !== "string" || !value.id || seen.has(value.id)
          || typeof value.title !== "string" || !value.title
          || !(value.language === null || typeof value.language === "string")
          || typeof value.linked !== "boolean" || (linkedOnly && !value.linked)) {
          throw new Error("Invalid corpus")
        }
        seen.add(value.id)
        rows.push({ id: value.id, title: value.title, language: value.language, linked: value.linked })
      }
      if (next === null) return rows
      if (!items.length || next !== rows.at(-1)?.id || next === after) throw new Error("Invalid cursor")
      after = next
    }
    throw new Error("Corpus list exceeds page limit")
  } catch {
    throw new DataError("unavailable", "Could not load the project's accessible corpora.")
  }
}

export async function listLinkedCorpora(projectId: string): Promise<CorpusLink[]> {
  return (await listManaged(projectId, true)).map((c) => ({
    corpusId: c.id, name: c.title, language: c.language,
  }))
}

export async function listCorpusOptions(projectId: string): Promise<CorpusOption[]> {
  return (await listManaged(projectId, false)).map((c) => ({
    id: c.id, name: c.title, language: c.language, alreadyLinked: c.linked,
  }))
}

async function setCorpusLink(projectId: string, corpusId: string, linked: boolean): Promise<void> {
  try {
    const response = await apiFetch(`/v1/projects/${encodeURIComponent(projectId)}/corpora/${encodeURIComponent(corpusId)}`,
      { method: linked ? "PUT" : "DELETE", cache: "no-store" })
    const body: unknown = await response.json()
    if (!body || typeof body !== "object") throw new Error("Invalid receipt")
    const receipt = body as Record<string, unknown>
    if (receipt.project_id !== projectId || receipt.corpus_id !== corpusId || receipt.linked !== linked) {
      throw new Error("Invalid receipt")
    }
  } catch {
    throw new DataError("unavailable", linked ? "Could not link this corpus." : "Could not remove this corpus.")
  }
}

export async function linkCorpus(projectId: string, corpusId: string): Promise<void> {
  return setCorpusLink(projectId, corpusId, true)
}

export async function unlinkCorpus(projectId: string, corpusId: string): Promise<void> {
  return setCorpusLink(projectId, corpusId, false)
}
