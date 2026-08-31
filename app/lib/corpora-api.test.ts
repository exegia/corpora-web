import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// The seam is fetch itself (plus the Supabase session for the bearer):
// tests never touch the network (constitution Principle III).
vi.mock("@/lib/supabase", () => ({
  getSupabase: vi.fn(),
}))

import { getSupabase } from "@/lib/supabase"

const fetchMock = vi.fn()

function session(token: string | null) {
  vi.mocked(getSupabase).mockReturnValue({
    auth: {
      getSession: async () => ({ data: { session: token ? { access_token: token } : null } }),
    },
  } as never)
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock)
  fetchMock.mockReset()
  session(null)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

async function freshApi() {
  vi.resetModules()
  const module = await import("@/lib/api")
  // The barrel puts the request methods on the default export and the pure
  // helpers/constants alongside it; these tests reach for both by name.
  return { ...module, ...module.default }
}

describe("corpora-api", () => {
  it("detects source formats, routing .xml to tei and rejecting unknowns", async () => {
    const api = await freshApi()
    expect(api.detectSourceFormat("summa.xml")).toBe("tei")
    expect(api.detectSourceFormat("book.TEI")).toBe("tei")
    expect(api.detectSourceFormat("book.epub")).toBe("epub")
    expect(api.detectSourceFormat("notes.txt")).toBe("plain")
    expect(api.detectSourceFormat("dataset.zip")).toBe("tf_zip")
    expect(api.detectSourceFormat("image.png")).toBeNull()
  })

  it("maps HTTP statuses onto error kinds", async () => {
    const api = await freshApi()
    const cases: Array<[number, string]> = [
      [401, "unauthorized"],
      [403, "read-only"],
      [404, "not-found"],
      [409, "not-ready"],
      [413, "too-large"],
      [422, "unsupported"],
      [429, "queue-full"],
      [500, "server"],
    ]
    for (const [status, kind] of cases) {
      fetchMock.mockResolvedValueOnce(jsonResponse(status, { detail: `boom ${status}` }))
      const error = await api.getConversion("j1").catch((e) => e)
      expect(error).toBeInstanceOf(api.CorporaApiError)
      expect(error.kind).toBe(kind)
      expect(error.message).toBe(`boom ${status}`)
    }
  })

  it("wraps network failures as unreachable", async () => {
    const api = await freshApi()
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"))
    const error = await api.getConversion("j1").catch((e) => e)
    expect(error.kind).toBe("unreachable")
  })

  it("attaches the bearer token only when a session exists", async () => {
    const api = await freshApi()
    fetchMock.mockImplementation(async () => jsonResponse(200, {}))

    await api.getConversion("j1")
    let headers = new Headers(fetchMock.mock.calls[0][1]?.headers)
    expect(headers.get("Authorization")).toBeNull()

    session("jwt-123")
    await api.getConversion("j1")
    headers = new Headers(fetchMock.mock.calls[1][1]?.headers)
    expect(headers.get("Authorization")).toBe("Bearer jwt-123")
  })

  it("posts conversions as multipart with the contract field names", async () => {
    const api = await freshApi()
    fetchMock.mockResolvedValueOnce(jsonResponse(202, { job_id: "j9" }))

    const file = new File(["<tei/>"], "summa.xml", { type: "text/xml" })
    const result = await api.createConversion({
      file,
      sourceFormat: "tei",
      name: "summa",
    })

    expect(result).toEqual({ jobId: "j9" })
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toMatch(/\/convert$/)
    const form = init?.body as FormData
    expect(form.get("source_format")).toBe("tei")
    expect(form.get("name")).toBe("summa")
    expect(form.get("description")).toBe("")
    expect(form.get("file")).toBe(file)
  })

  it("memoizes capabilities and falls back to the pessimistic posture", async () => {
    const api = await freshApi()
    fetchMock.mockResolvedValue(
      jsonResponse(200, { auth_required: false, hub_writable: false }),
    )

    const first = await api.fetchCapabilities()
    const second = await api.fetchCapabilities()
    expect(first).toEqual({ authRequired: false, hubWritable: false })
    expect(second).toBe(first)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const failing = await freshApi()
    fetchMock.mockReset()
    fetchMock.mockRejectedValueOnce(new TypeError("offline"))
    await expect(failing.fetchCapabilities()).resolves.toEqual({
      authRequired: true,
      hubWritable: false,
    })
    // A failed probe is not cached — the next call asks again.
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { auth_required: false, hub_writable: true }),
    )
    await expect(failing.fetchCapabilities()).resolves.toEqual({
      authRequired: false,
      hubWritable: true,
    })
  })

  it("treats validation failures as skipped, never throwing", async () => {
    const api = await freshApi()
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { valid: true, stats: { max_slot: 30102 } }),
    )
    await expect(api.validateConversion("j1")).resolves.toEqual({
      status: "valid",
      reasons: undefined,
      stats: { max_slot: 30102 },
    })

    fetchMock.mockRejectedValueOnce(new TypeError("offline"))
    await expect(api.validateConversion("j1")).resolves.toEqual({
      status: "skipped",
    })
  })

  it("posts a job-scoped restore and rejects Hub archives", async () => {
    const api = await freshApi()
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { versions: [{ id: "v1.3", label: "v1.3", current: true }] }),
    )
    const body = await api.restoreCorpusVersion({ kind: "job", key: "j1" }, "v1.0")
    expect(body.versions[0].id).toBe("v1.3")
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toMatch(/\/convert\/j1\/restore$/)
    expect(init?.method).toBe("POST")
    expect(JSON.parse(String(init?.body))).toEqual({ version_id: "v1.0" })

    const hubError = await api
      .restoreCorpusVersion({ kind: "hub", key: "summa.corpus" }, "v1.0")
      .catch((error: unknown) => error)
    expect(hubError).toBeInstanceOf(api.CorporaApiError)
    expect((hubError as InstanceType<typeof api.CorporaApiError>).kind).toBe(
      "read-only",
    )
  })

  it("fetches a job-scoped path diff with encoded version selectors", async () => {
    const api = await freshApi()
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        from: { id: "v1", label: "v1.0" },
        to: { id: "v2", label: "v1.1" },
        files: [
          {
            path: "manifest.yml",
            kind: "modified",
            before: { size: 100 },
            after: { size: 120 },
          },
        ],
      }),
    )

    const body = await api.fetchCorpusVersionDiff(
      { kind: "job", key: "j1" },
      "v1.0",
      "v1.1",
    )
    expect(body.files[0].path).toBe("manifest.yml")
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      "/convert/j1/diff?from=v1.0&to=v1.1",
    )

    const hubError = await api
      .fetchCorpusVersionDiff({ kind: "hub", key: "summa.corpus" }, "v1.0", "v1.1")
      .catch((error: unknown) => error)
    expect(hubError).toBeInstanceOf(api.CorporaApiError)
    expect((hubError as InstanceType<typeof api.CorporaApiError>).kind).toBe(
      "read-only",
    )
  })

  it("downloads the archive as a blob", async () => {
    const api = await freshApi()
    fetchMock.mockResolvedValueOnce(new Response("corpus-bytes"))
    const blob = await api.downloadConversion("j1")
    expect(await blob.text()).toBe("corpus-bytes")
  })

  it("builds Hub filename candidates from the library document", async () => {
    const api = await freshApi()
    expect(
      api.hubFilenameCandidates({
        filename: "summa-theologia-1200-ENG.xml",
        name: "Summa Theologia (1200, ENG)",
      }),
    ).toEqual([
      "summa-theologia-1200-ENG.corpus",
      "Summa Theologia (1200, ENG).corpus",
    ])
    expect(api.asCorpusFilename("BHSA.corpus")).toBe("BHSA.corpus")
  })

  it("loads a conversion job index and never lists Hub storage", async () => {
    const api = await freshApi()
    const index = {
      toc: null,
      sections: { levels: ["book"], items: [] },
      node_types: [{ type: "word", count: 10, avg_slots: 1, is_slot: true }],
    }
    fetchMock.mockResolvedValueOnce(jsonResponse(200, index))

    const archive = await api.loadCorpusArchive({
      jobId: "j-summa",
      source: "upload",
      filename: "summa-theologiae.corpus",
      name: "Summa Theologiae",
    })
    expect(archive).toEqual({
      kind: "job",
      key: "j-summa",
      index,
    })
    expect(String(fetchMock.mock.calls[0][0])).toMatch(
      /\/convert\/j-summa\/index$/,
    )
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/storage"))).toBe(
      false,
    )
  })

  it("returns null for an expired job id without throwing", async () => {
    const api = await freshApi()
    fetchMock.mockResolvedValueOnce(jsonResponse(404, { detail: "Unknown job id" }))
    await expect(
      api.loadCorpusArchive({
        jobId: "gone",
        source: "upload",
        filename: "summa.corpus",
        name: "Summa",
      }),
    ).resolves.toBeNull()
  })

  it("does not list Hub storage for an upload without a job id", async () => {
    const api = await freshApi()
    await expect(
      api.loadCorpusArchive({
        jobId: null,
        source: "upload",
        filename: "summa.corpus",
        name: "Summa",
      }),
    ).resolves.toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("lists Hub storage only for Hugging Face imports", async () => {
    const api = await freshApi()
    const index = {
      toc: null,
      sections: { levels: ["book"], items: [] },
      node_types: [{ type: "word", count: 10 }],
    }
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(200, [
          {
            filename: "BHSA.corpus",
            size_bytes: 12,
            repo_id: "exegia/corpora",
            url: "https://huggingface.co/datasets/exegia/corpora",
          },
        ]),
      )
      .mockResolvedValueOnce(jsonResponse(200, index))

    const archive = await api.loadCorpusArchive({
      source: "huggingface",
      filename: "BHSA.corpus",
      name: "BHSA",
    })
    expect(archive).toEqual({ kind: "hub", key: "BHSA.corpus", index })
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/storage$/)
    expect(String(fetchMock.mock.calls[1][0])).toMatch(/\/storage\/BHSA.corpus\/index$/)
  })

  it("fetches index, content, and a node through job-scoped paths", async () => {
    const api = await freshApi()
    const job = { kind: "job" as const, key: "j1" }
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { toc: null, sections: null, node_types: [] }),
    )
    await api.fetchCorpusIndex(job)
    expect(String(fetchMock.mock.calls[0][0])).toContain("/convert/j1/index")

    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        ref: "Genesis 1",
        format: "text-orig-full",
        passages: [
          {
            ref: "Genesis 1:1",
            text: "in the beginning",
            node: 3,
            tokens: [{ text: "in", after: " ", node: 1 }],
          },
        ],
        total: 1,
        offset: 0,
        limit: 20,
        next_offset: null,
      }),
    )
    const content = await api.fetchCorpusContent(job, {
      ref: "Genesis 1",
      limit: 20,
    })
    expect(content.passages[0]?.tokens?.[0]?.node).toBe(1)
    expect(String(fetchMock.mock.calls[1][0])).toContain("ref=Genesis+1")

    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        node: 1,
        otype: "word",
        features: {},
        text: "in",
        occurrences: 7,
      }),
    )
    const node = await api.fetchCorpusNode(job, 1)
    expect(node.occurrences).toBe(7)
    expect(String(fetchMock.mock.calls[2][0])).toContain("/convert/j1/nodes/1")

    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        versions: [
          {
            id: "packaged",
            label: "v1.0",
            title: "Converted",
            at: "2026-08-08T13:14:00Z",
            current: true,
            files: [{ path: "manifest.yml", kind: "added" }],
            author: { sub: "u1", name: "Ada" },
            approved_by: { sub: "u1", name: "Ada" },
            notes: ["Initial package"],
          },
        ],
      }),
    )
    const versions = await api.fetchCorpusVersions(job)
    expect(versions.versions[0]?.id).toBe("packaged")
    expect(versions.versions[0]?.files).toEqual([
      { path: "manifest.yml", kind: "added" },
    ])
    expect(versions.versions[0]?.author).toEqual({ sub: "u1", name: "Ada" })
    expect(versions.versions[0]?.approved_by).toEqual({
      sub: "u1",
      name: "Ada",
    })
    expect(String(fetchMock.mock.calls[3][0])).toContain("/convert/j1/versions")

    fetchMock.mockResolvedValueOnce(new Response("archive-bytes"))
    const blob = await api.downloadExploreCorpus(job)
    expect(await blob.text()).toBe("archive-bytes")
    expect(String(fetchMock.mock.calls[4][0])).toContain("/convert/j1/download")
  })
})
