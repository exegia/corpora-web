import { beforeEach, describe, expect, it, vi } from "vitest"
import { apiFetch } from "@/lib/api/utils"
import { linkCorpus, listCorpusOptions, listLinkedCorpora, unlinkCorpus } from "./managed-corpora"

vi.mock("@/lib/api/utils", () => ({ apiFetch: vi.fn() }))

function page(items: unknown[], next_cursor: string | null = null): Response {
  return new Response(JSON.stringify({ items, next_cursor }), { status: 200 })
}
const first = { id: "c1", title: "Corpus A", language: "Greek", linked: true }
const second = { id: "c2", title: "Corpus B", language: null, linked: false }

beforeEach(() => vi.resetAllMocks())

describe("managed project corpora", () => {
  it("loads all accessible pages and retains link state", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(page([first], "c1")).mockResolvedValueOnce(page([second]))
    await expect(listCorpusOptions("p1")).resolves.toEqual([
      { id: "c1", name: "Corpus A", language: "Greek", alreadyLinked: true },
      { id: "c2", name: "Corpus B", language: null, alreadyLinked: false },
    ])
    expect(vi.mocked(apiFetch).mock.calls[0][0]).toContain("linked_only=false")
    expect(vi.mocked(apiFetch).mock.calls[1][0]).toContain("after=c1")
  })

  it("shows members only linked records and rejects bad data", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(page([first])).mockResolvedValueOnce(page([second]))
    await expect(listLinkedCorpora("p1")).resolves.toEqual([
      { corpusId: "c1", name: "Corpus A", language: "Greek" },
    ])
    await expect(listLinkedCorpora("p1")).rejects.toMatchObject({ code: "unavailable" })
  })

  it("rejects repeated cursors rather than returning a partial list", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(page([first], "c1")).mockResolvedValueOnce(page([first], "c1"))
    await expect(listCorpusOptions("p1")).rejects.toMatchObject({ code: "unavailable" })
  })

  it("links and unlinks through the authenticated API and validates receipts", async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce(new Response(JSON.stringify({ project_id: "p1", corpus_id: "c1", linked: true })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ project_id: "p1", corpus_id: "c1", linked: false })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ project_id: "wrong", corpus_id: "c1", linked: true })))
    await expect(linkCorpus("p1", "c1")).resolves.toBeUndefined()
    await expect(unlinkCorpus("p1", "c1")).resolves.toBeUndefined()
    expect(vi.mocked(apiFetch).mock.calls[0]).toEqual([
      "/v1/projects/p1/corpora/c1", { method: "PUT", cache: "no-store" },
    ])
    expect(vi.mocked(apiFetch).mock.calls[1][1]).toMatchObject({ method: "DELETE" })
    await expect(linkCorpus("p1", "c1")).rejects.toMatchObject({ code: "unavailable" })
  })
})
