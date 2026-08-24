import { FileWordmarkCorpus } from "@exegia/corpora-ui"
import { describe, expect, it } from "vitest"
import type { CorpusDocument } from "@/lib/corpus"
import { fileIconFor, formatOf } from "./utils"

function doc(overrides: Partial<CorpusDocument> = {}): CorpusDocument {
  return {
    id: "d1",
    name: "peshitta",
    source: "upload",
    path: "d1/peshitta.corpus",
    filename: "peshitta.corpus",
    jobId: null,
    uploadedAt: "2026-07-10T00:00:00Z",
    corpusType: null,
    sourceFormat: null,
    licence: null,
    language: null,
    sizeBytes: null,
    docsCount: null,
    nodes: null,
    words: null,
    status: null,
    convertedAt: null,
    description: null,
    toc: null,
    commits: [],
    ...overrides,
  }
}

describe("corpus list format", () => {
  it("presents converted and uploaded rows as .corpus, not the source format", () => {
    const converted = doc({
      sourceFormat: "tei",
      status: "converted",
      filename: "summa-theologiae.corpus",
    })
    expect(formatOf(converted)).toBe(".corpus")
    expect(fileIconFor(converted)).toBe(FileWordmarkCorpus)
    expect(formatOf(doc())).toBe(".corpus")
    expect(fileIconFor(doc())).toBe(FileWordmarkCorpus)
  })

  it("keeps Hugging Face imports labelled until they are a .corpus object", () => {
    const imported = doc({
      source: "huggingface",
      path: "https://huggingface.co/datasets/x/onkelos",
      filename: null,
    })
    expect(formatOf(imported)).toBe("Hugging Face")
    expect(fileIconFor(imported)).toBeNull()
  })
})
