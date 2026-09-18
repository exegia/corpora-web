import { afterEach, describe, expect, it, vi } from "vitest"
import {
  fetchHuggingFaceHistory,
  huggingFaceCommitsEndpoint,
} from "@/lib/corpus/history"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("huggingFaceCommitsEndpoint", () => {
  it.each([
    [
      "https://huggingface.co/datasets/stanfordnlp/imdb",
      "https://huggingface.co/api/datasets/stanfordnlp/imdb/commits/main",
    ],
    [
      "https://huggingface.co/datasets/x/peshitta/tree/main/data",
      "https://huggingface.co/api/datasets/x/peshitta/commits/main",
    ],
    [
      "https://huggingface.co/bert-base/uncased",
      "https://huggingface.co/api/models/bert-base/uncased/commits/main",
    ],
  ])("resolves %s", (url, endpoint) => {
    expect(huggingFaceCommitsEndpoint(url)).toBe(endpoint)
  })

  it.each([
    ["https://huggingface.co/"],
    ["https://huggingface.co/datasets"],
    ["https://example.org/datasets/x/y"],
    ["not a url"],
  ])("rejects %s", (url) => {
    expect(huggingFaceCommitsEndpoint(url)).toBeNull()
  })
})

describe("fetchHuggingFaceHistory", () => {
  it("maps Hub commits to corpus commit inputs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            id: "e628166",
            title: "Convert dataset to Parquet (#5)",
            message: "\n\n- details\n",
            authors: [{ user: "albertvillanova" }],
            date: "2024-01-04T12:09:45.000Z",
          },
          {
            id: "9c6ede8",
            title: "Initial commit",
            message: "",
            authors: [],
            date: "2023-04-05T10:07:38.000Z",
          },
        ],
      }),
    )
    const commits = await fetchHuggingFaceHistory(
      "https://huggingface.co/datasets/stanfordnlp/imdb",
    )
    expect(commits).toEqual([
      {
        sha: "e628166",
        message: "Convert dataset to Parquet (#5)\n\n- details",
        authorName: "albertvillanova",
        authorEmail: null,
        branch: "main",
        committedAt: "2024-01-04T12:09:45.000Z",
      },
      {
        sha: "9c6ede8",
        message: "Initial commit",
        authorName: null,
        authorEmail: null,
        branch: "main",
        committedAt: "2023-04-05T10:07:38.000Z",
      },
    ])
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(
        "https://huggingface.co/api/datasets/stanfordnlp/imdb/commits/main",
      ),
    )
  })

  it("yields null for unreachable or private repos instead of failing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }))
    expect(
      await fetchHuggingFaceHistory("https://huggingface.co/datasets/x/private"),
    ).toBeNull()

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")))
    expect(
      await fetchHuggingFaceHistory("https://huggingface.co/datasets/x/y"),
    ).toBeNull()
  })

  it("skips the network entirely for non-repo URLs", async () => {
    const spy = vi.fn()
    vi.stubGlobal("fetch", spy)
    expect(await fetchHuggingFaceHistory("https://example.org/x/y")).toBeNull()
    expect(spy).not.toHaveBeenCalled()
  })
})
