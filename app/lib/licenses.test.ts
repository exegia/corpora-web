import { beforeEach, describe, expect, it, vi } from "vitest"
import { attachLicense, detachLicense, listLicenses } from "@/lib/licenses"
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

const CHAIN_METHODS = ["select", "insert", "update", "delete", "eq", "order"]

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

describe("listLicenses", () => {
  it("maps catalog rows with domain flags, ordered by title", async () => {
    const { builders } = mockSupabase([{ data: [catalogRow], error: null }])
    const licenses = await listLicenses()
    expect(builders[0].table).toBe("licenses")
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
    await expect(listLicenses()).resolves.toEqual([])
  })

  it("surfaces failures as DataError", async () => {
    mockSupabase([{ data: null, error: { message: "boom" } }])
    await expect(listLicenses()).rejects.toMatchObject({ code: "unknown" })
  })
})

describe("attachLicense", () => {
  it("inserts the attachment with the agreeing user and touches the project", async () => {
    const { builders } = mockSupabase([
      { data: null, error: null }, // insert project_licenses
      { data: null, error: null }, // touchProject update
    ])
    await attachLicense("p1", "CC-BY-4.0", "u1")
    expect(builders[0].table).toBe("project_licenses")
    expect(builders[0].insert).toHaveBeenCalledWith({
      project_id: "p1",
      license_id: "CC-BY-4.0",
      agreed_by_user_id: "u1",
    })
    expect(builders[1].table).toBe("projects")
    expect(builders[1].update).toHaveBeenCalledWith(
      expect.objectContaining({ updated_at: expect.any(String) }),
    )
  })

  it("maps a duplicate attachment to already-attached (FR-010)", async () => {
    mockSupabase([{ data: null, error: { code: "23505" } }])
    await expect(attachLicense("p1", "CC-BY-4.0", "u1")).rejects.toMatchObject({
      code: "already-attached",
    })
  })

  it("requires an agreeing user before any network call (FR-012)", async () => {
    const { from } = mockSupabase([])
    await expect(attachLicense("p1", "CC-BY-4.0", " ")).rejects.toMatchObject({
      code: "validation",
    })
    expect(from).not.toHaveBeenCalled()
  })
})

describe("detachLicense", () => {
  it("deletes only the one attachment, filtered by both keys (FR-013)", async () => {
    const { builders } = mockSupabase([
      { data: [{ license_id: "CC-BY-4.0" }], error: null },
      { data: null, error: null }, // touchProject
    ])
    await detachLicense("p1", "CC-BY-4.0")
    expect(builders[0].table).toBe("project_licenses")
    expect(builders[0].delete).toHaveBeenCalled()
    expect(builders[0].eq).toHaveBeenCalledWith("project_id", "p1")
    expect(builders[0].eq).toHaveBeenCalledWith("license_id", "CC-BY-4.0")
  })

  it("maps a missing attachment to not-found", async () => {
    mockSupabase([{ data: [], error: null }])
    await expect(detachLicense("p1", "GPL-3.0")).rejects.toMatchObject({
      code: "not-found",
    })
  })
})
