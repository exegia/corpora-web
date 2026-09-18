import Project from "@/lib/projects"
import { getSupabase } from "@/lib/supabase"
import type { LicenceDetail } from "./types"

/**
 * Escape the characters MDX treats as syntax (JSX/expressions) so downloaded
 * plain-text licences — "<year>", "{}" placeholders — survive the editor's
 * parser without altering what the reader sees.
 */
function toEditorSafeMarkdown(text: string): string {
  return text.replace(/[<{]/g, (char) => `\\${char}`)
}

/**
 * Download the licence text: the SPDX license-list serves plain text by the
 * catalog id (CORS-open), the stored URL is the fallback. HTML responses are
 * skipped — a licence web page is not the licence text. Returns null when no
 * source yields text.
 */
export async function fetchLicenceText(licence: {
  id: string
  url: string | null
}): Promise<string | null> {
  const sources = [
    `https://raw.githubusercontent.com/spdx/license-list-data/main/text/${encodeURIComponent(licence.id)}.txt`,
    ...(licence.url ? [licence.url] : []),
  ]
  for (const source of sources) {
    try {
      const response = await fetch(source)
      if (!response.ok) continue
      const type = response.headers.get("content-type") ?? ""
      if (type.includes("html")) continue
      const text = (await response.text()).trim()
      if (text) return toEditorSafeMarkdown(text)
    } catch {
      // Unreachable or CORS-blocked source — try the next one.
    }
  }
  return null
}

/** Store the licence text (first download or a superadmin edit). */
export async function saveLicenceText(id: string, text: string): Promise<void> {
  const { data, error } = await getSupabase()
    .from("licences")
    .update({ full_text: text, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .maybeSingle()
  if (error) {
    throw new Project.Errors.DataError(
      "unknown",
      `Could not save the licence text: ${error.message ?? "unexpected error"}`,
    )
  }
  if (!data) {
    throw new Project.Errors.DataError("not-found", "This licence no longer exists.")
  }
}

/**
 * The licence body: stored text resolves instantly, a first read downloads and
 * stores it. Best effort — null when every source fails, so a caller can fall
 * back to the catalog summary rather than showing an error.
 */
export function resolveLicenceText(
  licence: LicenceDetail | null,
): Promise<string | null> {
  if (licence === null) return Promise.resolve(null)
  if (licence.fullText !== null) return Promise.resolve(licence.fullText)
  return fetchLicenceText(licence)
    .then(async (fetched) => {
      if (fetched) await saveLicenceText(licence.id, fetched)
      return fetched
    })
    .catch(() => null)
}
