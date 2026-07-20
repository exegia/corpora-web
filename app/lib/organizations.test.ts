import { beforeEach, describe, expect, it, vi } from "vitest"
import { createOrganization, listOrganizations } from "@/lib/organizations"
import { getSupabase } from "@/lib/supabase"

vi.mock("@/lib/supabase", () => ({ getSupabase: vi.fn() }))

function mockQuery(result: {
  data: unknown
  error: { message?: string } | null
}) {
  const terminal = vi.fn().mockResolvedValue(result)
  const chain = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    order: terminal,
    single: terminal,
  }
  const from = vi.fn(() => chain)
  vi.mocked(getSupabase).mockReturnValue({ from } as never)
  return { from, chain }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("listOrganizations", () => {
  it("lists organizations ordered by name", async () => {
    const rows = [{ id: "o1", name: "Peshitta Institute", website: null }]
    const { from, chain } = mockQuery({ data: rows, error: null })
    await expect(listOrganizations()).resolves.toEqual(rows)
    expect(from).toHaveBeenCalledWith("organizations")
    expect(chain.order).toHaveBeenCalledWith("name", { ascending: true })
  })

  it("surfaces failures as DataError", async () => {
    mockQuery({ data: null, error: { message: "boom" } })
    await expect(listOrganizations()).rejects.toMatchObject({ code: "unknown" })
  })
})

describe("createOrganization", () => {
  it("rejects an empty name before any network call (FR-014)", async () => {
    const { from } = mockQuery({ data: null, error: null })
    await expect(createOrganization({ name: "   " })).rejects.toMatchObject({
      code: "validation",
    })
    expect(from).not.toHaveBeenCalled()
  })

  it("inserts a trimmed name and optional website", async () => {
    const row = { id: "o1", name: "Peshitta Institute", website: "https://pi.example" }
    const { chain } = mockQuery({ data: row, error: null })
    await expect(
      createOrganization({ name: "  Peshitta Institute  ", website: "https://pi.example" }),
    ).resolves.toEqual(row)
    expect(chain.insert).toHaveBeenCalledWith({
      name: "Peshitta Institute",
      website: "https://pi.example",
    })
  })
})
