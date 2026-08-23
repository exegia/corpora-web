import { describe, expect, it } from "vitest"
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
