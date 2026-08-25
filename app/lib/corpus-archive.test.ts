import { zipSync } from "fflate"
import { describe, expect, it } from "vitest"
import { readCorpusArchive } from "@/lib/corpus/archive"
import { DataError } from "@/lib/projects"

const encoder = new TextEncoder()

function archive(files: Record<string, string>): Blob {
  const entries: Record<string, Uint8Array> = {}
  for (const [name, content] of Object.entries(files)) {
    entries[name] = encoder.encode(content)
  }
  return new Blob([zipSync(entries) as BlobPart])
}

const MANIFEST = `
name: Summa Theologia
description: The Summa, converted from TEI.
version: "1.0"
language: English
languageCode: en
type: book
format: corpus
`

const TOC = `
sections:
  - title: Prima Pars
    nodes: 8442
    words: 312004
  - title: Prima Secundae
    nodes: 7105
    words: 268447
  - name: Supplementum
    node_count: 997
`

describe("corpus-archive", () => {
  it("reads manifest and toc from the archive", async () => {
    const info = await readCorpusArchive(
      archive({ "manifest.yml": MANIFEST, "toc.yml": TOC, "corpora/a.tf": "x" }),
    )
    expect(info).toEqual({
      name: "Summa Theologia",
      description: "The Summa, converted from TEI.",
      language: "English",
      corpusType: "text",
      version: "1.0",
      sections: [
        { title: "Prima Pars", nodes: 8442, words: 312004 },
        { title: "Prima Secundae", nodes: 7105, words: 268447 },
        { title: "Supplementum", nodes: 997, words: null },
      ],
    })
  })

  it("finds metadata nested one folder deep, shallowest first", async () => {
    const info = await readCorpusArchive(
      archive({ "summa/manifest.yml": MANIFEST, "summa/toc.yml": TOC }),
    )
    expect(info.name).toBe("Summa Theologia")
    expect(info.sections).toHaveLength(3)
  })

  it("degrades per field when metadata is missing or malformed", async () => {
    const missing = await readCorpusArchive(archive({ "corpora/a.tf": "x" }))
    expect(missing).toEqual({
      name: null,
      description: null,
      language: null,
      corpusType: null,
      version: null,
      sections: [],
    })

    const malformed = await readCorpusArchive(
      archive({
        "manifest.yml": "name: [unclosed",
        "toc.yml": "sections: {not: a-list}",
      }),
    )
    expect(malformed.name).toBeNull()
    expect(malformed.sections).toEqual([])
  })

  it("maps unknown manifest types to text, absent types to null", async () => {
    const unknown = await readCorpusArchive(
      archive({ "manifest.yml": "type: epistolary\nname: X" }),
    )
    expect(unknown.corpusType).toBe("text")

    const absent = await readCorpusArchive(
      archive({ "manifest.yml": "name: X" }),
    )
    expect(absent.corpusType).toBeNull()
  })

  it("throws a validation error for an unreadable zip", async () => {
    await expect(
      readCorpusArchive(new Blob(["not a zip at all"])),
    ).rejects.toThrowError(DataError)
  })
})
