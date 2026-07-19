import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  createProject,
  createReference,
  DataError,
  deleteProject,
  deleteReference,
  getProject,
  linkCorpus,
  listCorpusOptions,
  listProjects,
  unlinkCorpus,
  updateProject,
  updateReference,
} from "@/lib/projects"
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
  "single",
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

/** Queue of results consumed in from() call order; records builders for asserts. */
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

const projectRow = {
  id: "p1",
  name: "Peshitta Study",
  description: null,
  created_at: "2026-07-01T00:00:00Z",
  updated_at: "2026-07-02T00:00:00Z",
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("listProjects", () => {
  it("maps rows to summaries ordered by updated_at desc", async () => {
    const { builders } = mockSupabase([{ data: [projectRow], error: null }])
    const projects = await listProjects()
    expect(projects).toEqual([
      {
        id: "p1",
        name: "Peshitta Study",
        description: null,
        createdAt: "2026-07-01T00:00:00Z",
        updatedAt: "2026-07-02T00:00:00Z",
      },
    ])
    expect(builders[0].order).toHaveBeenCalledWith("updated_at", {
      ascending: false,
    })
  })

  it("wraps failures in DataError instead of failing silently", async () => {
    mockSupabase([{ data: null, error: { message: "connection refused" } }])
    await expect(listProjects()).rejects.toMatchObject({
      name: "DataError",
      code: "unknown",
      message: expect.stringContaining("Could not load projects"),
    })
  })
})

describe("createProject", () => {
  it("rejects an empty name before any network call", async () => {
    const { from } = mockSupabase([])
    await expect(createProject({ name: "   " })).rejects.toMatchObject({
      code: "validation",
    })
    expect(from).not.toHaveBeenCalled()
  })

  it("inserts a trimmed name and returns the summary", async () => {
    const { builders } = mockSupabase([{ data: projectRow, error: null }])
    const project = await createProject({ name: "  Peshitta Study  " })
    expect(project.id).toBe("p1")
    expect(builders[0].insert).toHaveBeenCalledWith({
      name: "Peshitta Study",
      description: null,
    })
  })
})

describe("updateProject", () => {
  it("maps a missing row to a not-found DataError", async () => {
    mockSupabase([{ data: null, error: null }])
    await expect(updateProject("gone", { name: "X" })).rejects.toMatchObject({
      code: "not-found",
    })
  })
})

describe("deleteProject", () => {
  it("deletes by id", async () => {
    const { builders } = mockSupabase([{ data: [{ id: "p1" }], error: null }])
    await deleteProject("p1")
    expect(builders[0].table).toBe("projects")
    expect(builders[0].eq).toHaveBeenCalledWith("id", "p1")
  })

  it("maps zero deleted rows to not-found", async () => {
    mockSupabase([{ data: [], error: null }])
    await expect(deleteProject("gone")).rejects.toMatchObject({
      code: "not-found",
    })
  })
})

describe("getProject", () => {
  it("returns null when the project is missing", async () => {
    mockSupabase([{ data: null, error: null }])
    expect(await getProject("gone")).toBeNull()
  })

  it("surfaces stale corpora via available=false and tolerates missing corpus rows", async () => {
    mockSupabase([
      {
        data: {
          ...projectRow,
          project_corpora: [
            {
              corpus_id: "c1",
              linked_at: "2026-07-03T00:00:00Z",
              corpora: {
                uid: "u1",
                name: "Peshitta OT",
                language: "Aramaic",
                type: "bible",
                category: "religious",
                version: "1.0.0",
                available: false,
              },
            },
            { corpus_id: "c2", linked_at: "2026-07-04T00:00:00Z", corpora: null },
          ],
          project_references: [],
        },
        error: null,
      },
    ])
    const project = await getProject("p1")
    expect(project?.corpora).toHaveLength(2)
    expect(project?.corpora[0].corpus?.available).toBe(false)
    expect(project?.corpora[1].corpus).toBeNull()
  })
})

describe("listCorpusOptions", () => {
  it("flags corpora already linked to the project", async () => {
    mockSupabase([
      {
        data: [
          { id: "c1", name: "A", language: null, type: null, available: true },
          { id: "c2", name: "B", language: null, type: null, available: true },
        ],
        error: null,
      },
      { data: [{ corpus_id: "c2" }], error: null },
    ])
    const options = await listCorpusOptions("p1")
    expect(options.map((o) => [o.id, o.alreadyLinked])).toEqual([
      ["c1", false],
      ["c2", true],
    ])
  })
})

describe("linkCorpus", () => {
  it("maps a duplicate link (23505) to already-linked and skips the touch", async () => {
    const { from } = mockSupabase([
      { data: null, error: { code: "23505", message: "duplicate key" } },
    ])
    await expect(linkCorpus("p1", "c1")).rejects.toMatchObject({
      code: "already-linked",
    })
    expect(from).toHaveBeenCalledTimes(1)
  })

  it("inserts the link and bumps the project's updated_at", async () => {
    const { builders } = mockSupabase([
      { data: null, error: null },
      { data: null, error: null },
    ])
    await linkCorpus("p1", "c1")
    expect(builders[0].table).toBe("project_corpora")
    expect(builders[0].insert).toHaveBeenCalledWith({
      project_id: "p1",
      corpus_id: "c1",
    })
    expect(builders[1].table).toBe("projects")
    expect(builders[1].update).toHaveBeenCalled()
  })
})

describe("unlinkCorpus", () => {
  it("deletes only the join row — never the corpus — and touches the project", async () => {
    const { builders, from } = mockSupabase([
      { data: null, error: null },
      { data: null, error: null },
    ])
    await unlinkCorpus("p1", "c1")
    expect(builders[0].table).toBe("project_corpora")
    expect(builders[0].delete).toHaveBeenCalled()
    expect(from).not.toHaveBeenCalledWith("corpora")
    expect(builders[1].table).toBe("projects")
  })
})

const referenceRow = {
  id: "r1",
  project_id: "p1",
  title: "Aramaic Grammar",
  authors: null,
  year: null,
  publication: null,
  url: null,
  created_at: "2026-07-05T00:00:00Z",
  updated_at: "2026-07-05T00:00:00Z",
}

describe("references", () => {
  it("rejects an empty title before any network call", async () => {
    const { from } = mockSupabase([])
    await expect(createReference("p1", { title: " " })).rejects.toMatchObject({
      code: "validation",
    })
    expect(from).not.toHaveBeenCalled()
  })

  it("creates a reference and bumps the project's updated_at", async () => {
    const { builders } = mockSupabase([
      { data: referenceRow, error: null },
      { data: null, error: null },
    ])
    const reference = await createReference("p1", { title: "Aramaic Grammar" })
    expect(reference.projectId).toBe("p1")
    expect(builders[0].table).toBe("project_references")
    expect(builders[1].table).toBe("projects")
    expect(builders[1].update).toHaveBeenCalled()
  })

  it("maps a missing reference on update to not-found", async () => {
    mockSupabase([{ data: null, error: null }])
    await expect(updateReference("gone", { title: "X" })).rejects.toMatchObject({
      code: "not-found",
    })
  })

  it("deletes a reference and touches its project", async () => {
    const { builders } = mockSupabase([
      { data: [{ id: "r1", project_id: "p1" }], error: null },
      { data: null, error: null },
    ])
    await deleteReference("r1")
    expect(builders[0].table).toBe("project_references")
    expect(builders[1].table).toBe("projects")
  })

  it("maps zero deleted rows to not-found", async () => {
    mockSupabase([{ data: [], error: null }])
    await expect(deleteReference("gone")).rejects.toMatchObject({
      code: "not-found",
    })
  })
})

describe("DataError", () => {
  it("is an Error with a stable code", () => {
    const error = new DataError("validation", "A title is required.")
    expect(error).toBeInstanceOf(Error)
    expect(error.code).toBe("validation")
  })
})
