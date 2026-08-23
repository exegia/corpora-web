import { describe, expect, it } from "vitest"
import type { CorpusIndex, CorpusNode } from "@/lib/corpora-api"
import type { CorpusDocument } from "@/lib/corpus"
import {
  findIndexItem,
  lemmaFromNode,
  nodeTypeStatsFromIndex,
  sectionsFromIndex,
  slotForToken,
  structureRootFromIndex,
} from "@/lib/corpus-explore"

const index: CorpusIndex = {
  toc: null,
  sections: {
    levels: ["book", "chapter"],
    items: [
      {
        title: "Prima Pars",
        ref: "Prima Pars",
        children: [
          { title: "Q.1", ref: "Prima Pars, Q.1" },
          { title: "Q.2", ref: "Prima Pars, Q.2" },
        ],
      },
      { title: "Supplementum", ref: "Supplementum", children: [] },
    ],
  },
  node_types: [
    { type: "word", count: 80 },
    { type: "clause", count: 20 },
  ],
}

const document = { name: "Summa" } as CorpusDocument

describe("corpus-explore mappers", () => {
  it("builds overview rows and a relative structure tree from the Hub index", () => {
    expect(sectionsFromIndex(index)).toEqual([
      { title: "Prima Pars", nodes: 2, words: null },
      { title: "Supplementum", nodes: 0, words: null },
    ])
    const root = structureRootFromIndex(document, index)
    expect(root?.childCount).toBe(2)
    expect(root?.children?.[0]?.label).toBe("Prima Pars")
    expect(root?.children?.[0]?.childCount).toBe(2)
    expect(findIndexItem(index, "Supplementum")?.title).toBe("Supplementum")
  })

  it("turns node_types into percentages", () => {
    const stats = nodeTypeStatsFromIndex(index)
    expect(stats[0]?.type).toBe("word")
    expect(stats[0]?.pct).toBe(80)
    expect(stats[0]?.slotType).toBe(true)
  })

  it("maps Hub node features onto the inspect lemma", () => {
    const node: CorpusNode = {
      node: 84,
      otype: "word",
      is_slot: true,
      slot_type: "word",
      first_slot: 84,
      last_slot: 84,
      section_ref: "Prima Pars, Q.1",
      text: "doctrina",
      features: { lemma: "doctrina", sp: "subs", gn: "f", nu: "sg" },
      annotation: null,
      node_types: ["word"],
    }
    const lemma = lemmaFromNode(node, "doctrinam")
    expect(lemma.lemma).toBe("doctrina")
    expect(lemma.pos).toBe("subs")
    expect(lemma.gender).toBe("f")
    expect(lemma.context).toEqual(["Prima Pars", "Q.1"])
  })

  it("maps a token index onto a consecutive slot range", () => {
    const page: CorpusNode = {
      node: 38550,
      otype: "page",
      is_slot: false,
      slot_type: "word",
      first_slot: 1,
      last_slot: 64,
      section_ref: "38550",
      text: "hello world",
      features: {},
      annotation: null,
      node_types: ["page", "word"],
    }
    expect(slotForToken(page, 0)).toBe(1)
    expect(slotForToken(page, 63)).toBe(64)
    expect(slotForToken(page, 64)).toBeNull()
    expect(slotForToken({ ...page, is_slot: true, first_slot: 84, last_slot: 84, node: 84 }, 3)).toBe(84)
  })
})
