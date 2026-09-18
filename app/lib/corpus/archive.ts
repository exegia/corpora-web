// Authentic corpus metadata (004): a .corpus archive carries manifest.yml
// (ICorpusManifest) and toc.yml alongside the dataset. The backend can only
// serve these for Hub-published archives (research.md R2, corpora-py#103),
// so we read them in the browser at conversion time. Parsing degrades
// field-by-field — only an unreadable zip throws.
import { unzipSync } from "fflate"
import Project from "@/lib/projects"
import { MANIFEST_TYPE_MAP } from "./constants";
import type { CorpusArchiveInfo } from "./types";
import { asString, extractSections, findEntry, parseYamlEntry } from "./utils";
/**
 * Unzip a .corpus archive into its entries. Shared with corpus-history's
 * .git reader so both features agree on what "not a corpus archive" means.
 */
export async function unzipCorpusArchive(
  file: Blob,
): Promise<Record<string, Uint8Array>> {
  try {
    return unzipSync(new Uint8Array(await file.arrayBuffer()))
  } catch {
    throw new Project.Errors.DataError(
      "validation",
      "This does not look like a valid .corpus archive.",
    )
  }
}

/**
 * Read manifest.yml + toc.yml out of a downloaded .corpus archive. Missing
 * or malformed metadata degrades to nulls/[] — never blocks persisting the
 * conversion. Throws DataError("validation") only for an unreadable zip.
 */
export async function readCorpusArchive(file: Blob): Promise<CorpusArchiveInfo> {
  const entries = await unzipCorpusArchive(file)

  const manifest = parseYamlEntry(findEntry(entries, "manifest.yml")) as
    | Record<string, unknown>
    | null
  const toc = parseYamlEntry(findEntry(entries, "toc.yml"))

  const manifestType = asString(manifest?.type)?.toLowerCase() ?? null
  return {
    name: asString(manifest?.name),
    description: asString(manifest?.description),
    language: asString(manifest?.language),
    corpusType: manifestType
      ? (MANIFEST_TYPE_MAP[manifestType] ?? "text")
      : null,
    version: asString(manifest?.version),
    sections: extractSections(toc),
  }
}
