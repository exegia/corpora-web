import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  attachLicence,
  createLicence,
  detachLicence,
  fetchLicenceText,
  getLicence,
  listLicences,
  saveLicenceText,
  updateLicence,
} from "@/lib/licenses"
import { getSupabase } from "@/lib/supabase"

vi.mock("@/lib/supabase", () => ({ getSupabase: vi.fn() }))

interface MockResult {
  data: unknown
  error: { code?: string; message?: string } | null
}

interface MockBuilder {
  calls: { method: string; args: unknown[] }[]
  table: string
  // biome-ignore lint: chainable test double
  [method: string]: any
}

const CHAIN_METHODS = [
  "select",
  "insert",
  "update",
  "delete",
  "eq",
  "order",
  "maybeSingle",
]

function createBuilder(table: string, result: MockResult): MockBuilder {
  const builder = { calls: [], table } as unknown as MockBuilder
  for (const method of CHAIN_METHODS) {
    builder[method] = vi.fn((...args: unknown[]) => {
      builder.calls.push({ method, args })
      return builder
    })
  }
  builder.then = (
    resolve: (value: MockResult) => unknown,
    reject?: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(resolve, reject)
  return builder
}

function mockSupabase(results: MockResult[]) {
  const builders: MockBuilder[] = []
  const queue = [...results]
  const from = vi.fn((table: string) => {
    const result = queue.shift() ?? { data: null, error: null }
    const builder = createBuilder(table, result)
    builders.push(builder)
    return builder
  })
  vi.mocked(getSupabase).mockReturnValue({ from } as never)
  return { from, builders }
}

const catalogRow = {
  id: "CC-BY-4.0",
  title: "Creative Commons Attribution 4.0",
  url: "https://example.org/cc-by",
  domain_content: true,
  domain_data: true,
  domain_software: false,
  family: "Creative Commons",
  maintainer: null,
  status: "active",
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("listLicences", () => {
  it("maps catalog rows with domain flags, ordered by title", async () => {
    const { builders } = mockSupabase([{ data: [catalogRow], error: null }])
    const licenses = await listLicences()
    expect(builders[0].table).toBe("licences")
    expect(builders[0].order).toHaveBeenCalledWith("title", { ascending: true })
    expect(licenses).toEqual([
      {
        id: "CC-BY-4.0",
        title: "Creative Commons Attribution 4.0",
        url: "https://example.org/cc-by",
        domains: { content: true, data: true, software: false },
        status: "active",
        family: "Creative Commons",
        maintainer: null,
      },
    ])
  })

  it("returns an empty catalog before the seed is loaded (FR-011)", async () => {
    mockSupabase([{ data: [], error: null }])
    await expect(listLicences()).resolves.toEqual([])
  })

  it("surfaces failures as DataError", async () => {
    mockSupabase([{ data: null, error: { message: "boom" } }])
    await expect(listLicences()).rejects.toMatchObject({ code: "unknown" })
  })
})

const detailRow = {
  ...catalogRow,
  is_generic: false,
  legacy_ids: ["CC-BY-4"],
  od_conformance: "approved",
  osd_conformance: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: null,
  full_text: null,
}

describe("getLicence", () => {
  it("maps the full detail row including conformance fields", async () => {
    const { builders } = mockSupabase([{ data: detailRow, error: null }])
    const licence = await getLicence("CC-BY-4.0")
    expect(builders[0].table).toBe("licences")
    expect(builders[0].eq).toHaveBeenCalledWith("id", "CC-BY-4.0")
    expect(licence).toMatchObject({
      id: "CC-BY-4.0",
      domains: { content: true, data: true, software: false },
      isGeneric: false,
      legacyIds: ["CC-BY-4"],
      odConformance: "approved",
      osdConformance: null,
      createdAt: "2026-01-01T00:00:00Z",
    })
  })

  it("returns null when the licence does not exist", async () => {
    mockSupabase([{ data: null, error: null }])
    await expect(getLicence("nope")).resolves.toBeNull()
  })

  it("surfaces failures as DataError", async () => {
    mockSupabase([{ data: null, error: { message: "boom" } }])
    await expect(getLicence("CC-BY-4.0")).rejects.toMatchObject({
      code: "unknown",
    })
  })
})

describe("updateLicence", () => {
  const input = {
    title: "Creative Commons Attribution 4.0",
    url: "https://example.org/cc-by",
    family: "Creative Commons",
    maintainer: "CC",
    status: "active" as const,
    domains: { content: true, data: false, software: false },
  }

  it("updates the stored fields and stamps updated_at", async () => {
    const { builders } = mockSupabase([
      { data: { id: "CC-BY-4.0" }, error: null },
    ])
    await updateLicence("CC-BY-4.0", input)
    expect(builders[0].table).toBe("licences")
    expect(builders[0].update).toHaveBeenCalledWith(
      expect.objectContaining({
        title: input.title,
        url: input.url,
        family: input.family,
        maintainer: "CC",
        status: "active",
        domain_content: true,
        domain_data: false,
        domain_software: false,
        updated_at: expect.any(String),
      }),
    )
    expect(builders[0].eq).toHaveBeenCalledWith("id", "CC-BY-4.0")
  })

  it("requires a title before any network call", async () => {
    const { from } = mockSupabase([])
    await expect(
      updateLicence("CC-BY-4.0", { ...input, title: "  " }),
    ).rejects.toMatchObject({ code: "validation" })
    expect(from).not.toHaveBeenCalled()
  })

  it("maps a missing licence to not-found", async () => {
    mockSupabase([{ data: null, error: null }])
    await expect(updateLicence("nope", input)).rejects.toMatchObject({
      code: "not-found",
    })
  })
})

describe("saveLicenceText", () => {
  it("stores the text and stamps updated_at", async () => {
    const { builders } = mockSupabase([
      { data: { id: "CC-BY-4.0" }, error: null },
    ])
    await saveLicenceText("CC-BY-4.0", "# Licence body")
    expect(builders[0].table).toBe("licences")
    expect(builders[0].update).toHaveBeenCalledWith(
      expect.objectContaining({
        full_text: "# Licence body",
        updated_at: expect.any(String),
      }),
    )
    expect(builders[0].eq).toHaveBeenCalledWith("id", "CC-BY-4.0")
  })

  it("maps a missing licence to not-found", async () => {
    mockSupabase([{ data: null, error: null }])
    await expect(saveLicenceText("nope", "text")).rejects.toMatchObject({
      code: "not-found",
    })
  })
})

describe("createLicence", () => {
  const input = {
    id: "MIT",
    title: "MIT License",
    url: null,
    family: null,
    maintainer: null,
    status: "active" as const,
    domains: { content: false, data: false, software: true },
  }

  it("inserts the catalog row and returns the id", async () => {
    const { builders } = mockSupabase([{ data: null, error: null }])
    await expect(createLicence(input)).resolves.toBe("MIT")
    expect(builders[0].table).toBe("licences")
    expect(builders[0].insert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "MIT",
        title: "MIT License",
        status: "active",
        domain_software: true,
      }),
    )
  })

  it("requires an identifier before any network call", async () => {
    const { from } = mockSupabase([])
    await expect(createLicence({ ...input, id: " " })).rejects.toMatchObject({
      code: "validation",
    })
    expect(from).not.toHaveBeenCalled()
  })

  it("maps a duplicate identifier to a validation error", async () => {
    mockSupabase([{ data: null, error: { code: "23505" } }])
    await expect(createLicence(input)).rejects.toMatchObject({
      code: "validation",
    })
  })
})

describe("fetchLicenceText", () => {
  function response(body: string, contentType = "text/plain", ok = true) {
    return {
      ok,
      headers: new Headers({ "content-type": contentType }),
      text: async () => body,
    }
  }

  it("returns the SPDX text with MDX syntax characters escaped", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response("Copyright <year> {holder}"))
    vi.stubGlobal("fetch", fetchMock)
    await expect(
      fetchLicenceText({ id: "MIT", url: null }),
    ).resolves.toBe("Copyright \\<year> \\{holder}")
    expect(fetchMock).toHaveBeenCalledWith(
      "https://raw.githubusercontent.com/spdx/license-list-data/main/text/MIT.txt",
    )
    vi.unstubAllGlobals()
  })

  it("skips HTML responses and falls through to the next source", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response("<html>", "text/html"))
      .mockResolvedValueOnce(response("plain licence"))
    vi.stubGlobal("fetch", fetchMock)
    await expect(
      fetchLicenceText({ id: "X", url: "https://example.org/x.txt" }),
    ).resolves.toBe("plain licence")
    expect(fetchMock).toHaveBeenCalledTimes(2)
    vi.unstubAllGlobals()
  })

  it("returns null when every source fails", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"))
    vi.stubGlobal("fetch", fetchMock)
    await expect(fetchLicenceText({ id: "X", url: null })).resolves.toBeNull()
    vi.unstubAllGlobals()
  })
})

describe("attachLicence", () => {
  it("inserts the attachment with the agreeing user and touches the project", async () => {
    const { builders } = mockSupabase([
      { data: null, error: null }, // insert project_licenses
      { data: null, error: null }, // touchProject update
    ])
    await attachLicence("p1", "CC-BY-4.0", "u1")
    expect(builders[0].table).toBe("project_licences")
    expect(builders[0].insert).toHaveBeenCalledWith({
      project_id: "p1",
      licence_id: "CC-BY-4.0",
      agreed_by_user_id: "u1",
    })
    expect(builders[1].table).toBe("projects")
    expect(builders[1].update).toHaveBeenCalledWith(
      expect.objectContaining({ updated_at: expect.any(String) }),
    )
  })

  it("maps a duplicate attachment to already-attached (FR-010)", async () => {
    mockSupabase([{ data: null, error: { code: "23505" } }])
    await expect(attachLicence("p1", "CC-BY-4.0", "u1")).rejects.toMatchObject({
      code: "already-attached",
    })
  })

  it("requires an agreeing user before any network call (FR-012)", async () => {
    const { from } = mockSupabase([])
    await expect(attachLicence("p1", "CC-BY-4.0", " ")).rejects.toMatchObject({
      code: "validation",
    })
    expect(from).not.toHaveBeenCalled()
  })
})

describe("detachLicence", () => {
  it("deletes only the one attachment, filtered by both keys (FR-013)", async () => {
    const { builders } = mockSupabase([
      { data: [{ licence_id: "CC-BY-4.0" }], error: null },
      { data: null, error: null }, // touchProject
    ])
    await detachLicence("p1", "CC-BY-4.0")
    expect(builders[0].table).toBe("project_licences")
    expect(builders[0].delete).toHaveBeenCalled()
    expect(builders[0].eq).toHaveBeenCalledWith("project_id", "p1")
    expect(builders[0].eq).toHaveBeenCalledWith("licence_id", "CC-BY-4.0")
  })

  it("maps a missing attachment to not-found", async () => {
    mockSupabase([{ data: [], error: null }])
    await expect(detachLicence("p1", "GPL-3.0")).rejects.toMatchObject({
      code: "not-found",
    })
  })
})
