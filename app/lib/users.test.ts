import { beforeEach, describe, expect, it, vi } from "vitest"
import { DataError } from "@/lib/projects"
import { getSupabase } from "@/lib/supabase"
import { listUsers } from "@/lib/users"

vi.mock("@/lib/supabase", () => ({ getSupabase: vi.fn() }))

function mockQuery(result: {
  data: unknown
  error: { message?: string } | null
}) {
  const order = vi.fn().mockResolvedValue(result)
  const select = vi.fn(() => ({ order }))
  const from = vi.fn(() => ({ select }))
  vi.mocked(getSupabase).mockReturnValue({ from } as never)
  return { from, select, order }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("listUsers", () => {
  it("reads the user_directory table ordered by name", async () => {
    const rows = [
      { id: "u1", name: "Ada Researcher", username: "ada", email: "ada@corpora.local" },
      { id: "u2", name: null, username: "ben", email: "ben@corpora.local" },
    ]
    const { from, order } = mockQuery({ data: rows, error: null })

    await expect(listUsers()).resolves.toEqual(rows)
    expect(from).toHaveBeenCalledWith("user_directory")
    expect(order).toHaveBeenCalledWith("name", { ascending: true })
  })

  it("returns an empty list when the directory has no rows", async () => {
    mockQuery({ data: null, error: null })
    await expect(listUsers()).resolves.toEqual([])
  })

  it("surfaces failures as DataError, never silently", async () => {
    mockQuery({ data: null, error: { message: "boom" } })
    await expect(listUsers()).rejects.toMatchObject({
      name: "DataError",
      code: "unknown",
    })
    await expect(listUsers()).rejects.toBeInstanceOf(DataError)
  })
})
