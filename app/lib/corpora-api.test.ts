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
  return import("@/lib/corpora-api")
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

  it("downloads the archive as a blob", async () => {
    const api = await freshApi()
    fetchMock.mockResolvedValueOnce(new Response("corpus-bytes"))
    const blob = await api.downloadConversion("j1")
    expect(await blob.text()).toBe("corpus-bytes")
  })
})
