import { describe, expect, it } from "vitest"
import { structureRoot } from "./demo-data"
import type { CorpusDocument } from "@/lib/corpus"
import {
  abbreviateSection,
  formatCompact,
  parseExploreTab,
  sectionByTitle,
} from "./utils"

describe("corpus explore helpers", () => {
  it("falls unknown tab values back to overview", () => {
    expect(parseExploreTab(null)).toBe("overview")
    expect(parseExploreTab("nope")).toBe("overview")
    expect(parseExploreTab("analytics")).toBe("analytics")
  })

  it("abbreviates Summa part titles for the words chart", () => {
    expect(abbreviateSection("Prima Pars")).toBe("I")
    expect(abbreviateSection("Prima Secundae")).toBe("I-II")
    expect(abbreviateSection("Supplementum")).toBe("Suppl.")
  })

  it("compacts word counts the way the analytics chart labels them", () => {
    expect(formatCompact(312_004)).toBe("312K")
    expect(formatCompact(41_206)).toBe("41K")
    expect(formatCompact(880)).toBe("880")
  })

  it("counts structure children relative to the parent, not corpus-wide", () => {
    const document = {
      id: "d2",
      name: "Summa Theologia (1200, ENG)",
      toc: [
        { title: "Prima Pars", nodes: 8442, words: 312_004 },
        { title: "Supplementum", nodes: 997, words: null },
      ],
    } as CorpusDocument
    const root = structureRoot(document)
    expect(root.childCount).toBe(2)
    expect(root.children?.map((child) => child.childCount)).toEqual([119, 99])
  })

  it("picks a named section or the first row", () => {
    const sections = [
      { title: "Prima Pars", nodes: 1, words: 2 },
      { title: "Supplementum", nodes: 3, words: 4 },
    ]
    expect(sectionByTitle(sections, "Supplementum")?.title).toBe("Supplementum")
    expect(sectionByTitle(sections, null)?.title).toBe("Prima Pars")
    expect(sectionByTitle([], "Prima Pars")).toBeNull()
  })
})
