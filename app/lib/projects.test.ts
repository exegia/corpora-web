import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  allowedStatusChanges,
  assertEditable,
  classifyProject,
  createProject,
  DataError,
  deleteProject,
  getProject,
  isProjectReadOnly,
  languageOptionsFor,
  linkCorpus,
  listCorpusOptions,
  listProjects,
  type ProjectDetail,
  refuseStatusChange,
  reviewIssues,
  setProjectOrganization,
  unlinkCorpus,
  updateProject,
  updateProjectStatus,
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
  status: "draft",
  type: null,
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
        status: "draft",
        type: null,
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
    await expect(
      createProject({ name: "   ", userId: "u1" }),
    ).rejects.toMatchObject({ code: "validation" })
    expect(from).not.toHaveBeenCalled()
  })

  it("rejects a missing creator before any network call (FR-015)", async () => {
    const { from } = mockSupabase([])
    await expect(
      createProject({ name: "Peshitta Study", userId: "  " }),
    ).rejects.toMatchObject({
      code: "validation",
      message: expect.stringContaining("creator"),
    })
    expect(from).not.toHaveBeenCalled()
  })

  it("inserts a trimmed name with the creating user and returns the summary", async () => {
    const { builders } = mockSupabase([{ data: projectRow, error: null }])
    const project = await createProject({
      name: "  Peshitta Study  ",
      userId: "u1",
    })
    expect(project.id).toBe("p1")
    expect(builders[0].insert).toHaveBeenCalledWith({
      name: "Peshitta Study",
      description: null,
      user_id: "u1",
    })
  })
})

/** Detail fixture for the pure status-workflow helpers. */
function makeDetail(overrides: Partial<ProjectDetail> = {}): ProjectDetail {
  return {
    id: "p1",
    name: "Peshitta Study",
    description: null,
    status: "draft",
    type: null,
    languages: [],
    category: null,
    creator: { id: "u1", name: "Ada Researcher", username: "ada" },
    organization: null,
    licenses: [],
    corpora: [],
    corpus: null,
    commits: [],
    createdAt: "2026-07-01T00:00:00Z",
    updatedAt: "2026-07-02T00:00:00Z",
    ...overrides,
  }
}

const attachedLicence = {
  id: "CC-BY-4.0",
  title: "Creative Commons Attribution 4.0",
  url: null,
  domains: { content: true, data: false, software: false },
  status: "active" as const,
  family: null,
  maintainer: null,
  agreedAt: "2026-07-06T00:00:00Z",
  agreedBy: { id: "u1", name: "Ada Researcher", username: "ada" },
}

const readyDetail = makeDetail({
  licenses: [attachedLicence],
  type: "bible",
  languages: ["hebrew"],
  corpus: {
    id: "d1",
    name: "peshitta",
    source: "upload",
    path: "d1/peshitta.corpus",
    filename: "peshitta.corpus",
    uploadedAt: "2026-07-10T00:00:00Z",
  },
})

describe("status workflow (003)", () => {
  it("lists every unmet review requirement", () => {
    const issues = reviewIssues(makeDetail())
    expect(issues).toHaveLength(3)
    expect(issues.join(" ")).toMatch(/licence/i)
    expect(issues.join(" ")).toMatch(/classify/i)
    expect(issues.join(" ")).toMatch(/corpus/i)
    expect(reviewIssues(readyDetail)).toEqual([])
  })

  it("offers ready-for-review only when the requirements pass", () => {
    expect(allowedStatusChanges(makeDetail(), false)).toEqual([])
    expect(allowedStatusChanges(readyDetail, false)).toEqual(["ready-for-review"])
  })

  it("only returns legacy started/failed projects to draft", () => {
    expect(allowedStatusChanges(makeDetail({ status: "started" }), false)).toEqual([
      "draft",
    ])
    expect(allowedStatusChanges(makeDetail({ status: "failed" }), false)).toEqual([
      "draft",
    ])
  })

  it("reserves review and publish decisions for the superadmin", () => {
    const inReview = makeDetail({ status: "ready-for-review" })
    expect(allowedStatusChanges(inReview, false)).toEqual([])
    expect(allowedStatusChanges(inReview, true)).toEqual(["published", "draft"])

    const published = makeDetail({ status: "published" })
    expect(allowedStatusChanges(published, false)).toEqual([])
    expect(allowedStatusChanges(published, true)).toEqual(["draft"])
  })

  it("explains why a transition is refused", () => {
    expect(refuseStatusChange(makeDetail(), "ready-for-review", false)).toMatch(
      /not ready for review/i,
    )
    expect(
      refuseStatusChange(makeDetail({ status: "ready-for-review" }), "published", false),
    ).toMatch(/superadmin/i)
    expect(refuseStatusChange(readyDetail, "ready-for-review", false)).toBeNull()
    expect(refuseStatusChange(makeDetail(), "archived" as never, true)).toMatch(
      /not a valid/i,
    )
  })

  it("marks only ready-for-review as read-only", () => {
    expect(isProjectReadOnly("ready-for-review")).toBe(true)
    expect(isProjectReadOnly("draft")).toBe(false)
    expect(isProjectReadOnly("published")).toBe(false)
  })

  it("narrows the language vocabulary for quran and bible", () => {
    expect(languageOptionsFor("quran")).toEqual(["arabic", "english"])
    expect(languageOptionsFor("bible")).toEqual([
      "greek",
      "aramaic",
      "hebrew",
      "latin",
      "french",
      "english",
      "syriac",
    ])
    expect(languageOptionsFor("tanakh").length).toBeGreaterThan(7)
  })
})

describe("updateProjectStatus", () => {
  it("updates the status and touches updated_at", async () => {
    const { builders } = mockSupabase([{ data: { id: "p1" }, error: null }])
    await updateProjectStatus(readyDetail, "ready-for-review", false)
    expect(builders[0].table).toBe("projects")
    expect(builders[0].update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "ready-for-review",
        updated_at: expect.any(String),
      }),
    )
    expect(builders[0].eq).toHaveBeenCalledWith("id", "p1")
  })

  it("rejects an unknown status before any network call", async () => {
    const { from } = mockSupabase([])
    await expect(
      updateProjectStatus(makeDetail(), "archived" as never, true),
    ).rejects.toMatchObject({ code: "validation" })
    expect(from).not.toHaveBeenCalled()
  })

  it("rejects a non-superadmin publish before any network call", async () => {
    const { from } = mockSupabase([])
    await expect(
      updateProjectStatus(
        makeDetail({ status: "ready-for-review" }),
        "published",
        false,
      ),
    ).rejects.toMatchObject({ code: "validation" })
    expect(from).not.toHaveBeenCalled()
  })

  it("lets the superadmin publish a project in review", async () => {
    const { builders } = mockSupabase([{ data: { id: "p1" }, error: null }])
    await updateProjectStatus(
      makeDetail({ status: "ready-for-review" }),
      "published",
      true,
    )
    expect(builders[0].update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "published" }),
    )
  })

  it("maps a missing row to not-found", async () => {
    mockSupabase([{ data: null, error: null }])
    await expect(
      updateProjectStatus(makeDetail({ id: "gone", status: "started" }), "draft", false),
    ).rejects.toMatchObject({ code: "not-found" })
  })
})

describe("assertEditable", () => {
  it("passes for a draft project", async () => {
    mockSupabase([{ data: { status: "draft" }, error: null }])
    await expect(assertEditable("p1")).resolves.toBeUndefined()
  })

  it("rejects edits while the project is in review", async () => {
    mockSupabase([{ data: { status: "ready-for-review" }, error: null }])
    await expect(assertEditable("p1")).rejects.toMatchObject({
      code: "validation",
      message: expect.stringContaining("read-only"),
    })
  })

  it("maps a missing project to not-found", async () => {
    mockSupabase([{ data: null, error: null }])
    await expect(assertEditable("gone")).rejects.toMatchObject({
      code: "not-found",
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

const creatorRow = { id: "u1", name: "Ada Researcher", username: "ada" }

/** Full detail row shape as the nested select returns it (002/003). */
const detailRow = {
  ...projectRow,
  language: null,
  category: null,
  corpus_documents: null,
  user_directory: creatorRow,
  organizations: null,
  project_licences: [],
  project_corpora: [],
  corpus_commits: [],
}

describe("getProject", () => {
  it("returns null when the project is missing", async () => {
    mockSupabase([{ data: null, error: null }])
    expect(await getProject("gone")).toBeNull()
  })

  it("surfaces stale corpora via available=false and tolerates missing corpus rows", async () => {
    mockSupabase([
      {
        data: {
          ...detailRow,
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
        },
        error: null,
      },
    ])
    const project = await getProject("p1")
    expect(project?.corpora).toHaveLength(2)
    expect(project?.corpora[0].corpus?.available).toBe(false)
    expect(project?.corpora[1].corpus).toBeNull()
  })

  it("maps creator, organization, and attached licenses (002)", async () => {
    mockSupabase([
      {
        data: {
          ...detailRow,
          type: "bible",
          language: ["aramaic"],
          organizations: { id: "o1", name: "Peshitta Institute", website: null },
          project_licences: [
            {
              agreed_at: "2026-07-06T00:00:00Z",
              licences: {
                id: "CC-BY-4.0",
                title: "Creative Commons Attribution 4.0",
                url: "https://example.org/cc-by",
                domain_content: true,
                domain_data: true,
                domain_software: false,
                family: "Creative Commons",
                maintainer: null,
                status: "active",
              },
              user_directory: creatorRow,
            },
          ],
        },
        error: null,
      },
    ])
    const project = await getProject("p1")
    expect(project?.creator).toEqual(creatorRow)
    expect(project?.organization?.name).toBe("Peshitta Institute")
    expect(project?.languages).toEqual(["aramaic"])
    expect(project?.licenses).toEqual([
      {
        id: "CC-BY-4.0",
        title: "Creative Commons Attribution 4.0",
        url: "https://example.org/cc-by",
        domains: { content: true, data: true, software: false },
        status: "active",
        family: "Creative Commons",
        maintainer: null,
        agreedAt: "2026-07-06T00:00:00Z",
        agreedBy: creatorRow,
      },
    ])
  })
})

describe("classifyProject", () => {
  it.each([
    ["scriptural type + languages", { type: "bible", languages: ["hebrew", "greek"] }, { type: "bible", language: ["hebrew", "greek"], category: null }],
    ["categorized type + category", { type: "review", category: "literary" }, { type: "review", language: null, category: "literary" }],
    ["neutral type", { type: "regular" }, { type: "regular", language: null, category: null }],
    ["cleared classification", null, { type: null, language: null, category: null }],
  ] as const)(
    "writes %s atomically in one update",
    async (_label, classification, expected) => {
      const { builders } = mockSupabase([{ data: { id: "p1" }, error: null }])
      await classifyProject("p1", classification as never)
      expect(builders[0].table).toBe("projects")
      expect(builders[0].update).toHaveBeenCalledWith(
        expect.objectContaining({ ...expected, updated_at: expect.any(String) }),
      )
    },
  )

  it.each([
    ["scriptural type without a language", { type: "bible", languages: [] }],
    ["quran with a language outside its vocabulary", { type: "quran", languages: ["hebrew"] }],
    ["categorized type without a category", { type: "commentary" }],
    ["unknown type", { type: "novel" }],
  ] as const)("rejects %s before any network call", async (_label, input) => {
    const { from } = mockSupabase([])
    await expect(classifyProject("p1", input as never)).rejects.toMatchObject({
      code: "validation",
    })
    expect(from).not.toHaveBeenCalled()
  })

  it("maps a missing row to not-found", async () => {
    mockSupabase([{ data: null, error: null }])
    await expect(
      classifyProject("gone", { type: "regular" }),
    ).rejects.toMatchObject({ code: "not-found" })
  })
})

describe("setProjectOrganization", () => {
  it("assigns an organization and touches updated_at", async () => {
    const { builders } = mockSupabase([{ data: { id: "p1" }, error: null }])
    await setProjectOrganization("p1", "o1")
    expect(builders[0].update).toHaveBeenCalledWith(
      expect.objectContaining({ organization_id: "o1", updated_at: expect.any(String) }),
    )
  })

  it("clears the organization with null", async () => {
    const { builders } = mockSupabase([{ data: { id: "p1" }, error: null }])
    await setProjectOrganization("p1", null)
    expect(builders[0].update).toHaveBeenCalledWith(
      expect.objectContaining({ organization_id: null }),
    )
  })

  it("maps a missing row to not-found", async () => {
    mockSupabase([{ data: null, error: null }])
    await expect(setProjectOrganization("gone", null)).rejects.toMatchObject({
      code: "not-found",
    })
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

describe("getProject corpus mapping (003)", () => {
  it("maps the imported corpus document and its history newest-first", async () => {
    mockSupabase([
      {
        data: {
          ...detailRow,
          corpus_documents: {
            id: "d1",
            name: "peshitta",
            source: "upload",
            path: "d1/peshitta.corpus",
            filename: "peshitta.corpus",
            uploaded_at: "2026-07-10T00:00:00Z",
            corpus_commits: [
              {
                id: "cm1",
                sha: "a1b2c3d",
                message: "Initial import",
                author_name: "Ada",
                author_email: "ada@example.org",
                branch: "main",
                committed_at: "2026-07-01T00:00:00Z",
              },
              {
                id: "cm2",
                sha: "e4f5a6b",
                message: "Fix verse numbering",
                author_name: "Ada",
                author_email: "ada@example.org",
                branch: "main",
                committed_at: "2026-07-05T00:00:00Z",
              },
            ],
          },
        },
        error: null,
      },
    ])
    const project = await getProject("p1")
    expect(project?.corpus).toEqual({
      id: "d1",
      name: "peshitta",
      source: "upload",
      path: "d1/peshitta.corpus",
      filename: "peshitta.corpus",
      uploadedAt: "2026-07-10T00:00:00Z",
    })
    expect(project?.commits.map((commit) => commit.sha)).toEqual([
      "e4f5a6b",
      "a1b2c3d",
    ])
  })

  it("returns a null corpus when no upload or URL is recorded", async () => {
    mockSupabase([{ data: detailRow, error: null }])
    const project = await getProject("p1")
    expect(project?.corpus).toBeNull()
    expect(project?.commits).toEqual([])
  })
})

describe("DataError", () => {
  it("is an Error with a stable code", () => {
    const error = new DataError("validation", "A title is required.")
    expect(error).toBeInstanceOf(Error)
    expect(error.code).toBe("validation")
  })
})
