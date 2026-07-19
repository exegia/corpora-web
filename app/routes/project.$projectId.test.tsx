import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createRoutesStub } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  createReference,
  DataError,
  deleteProject,
  deleteReference,
  getProject,
  linkCorpus,
  listCorpusOptions,
  type ProjectDetail,
  unlinkCorpus,
  updateProject,
  updateReference,
} from "@/lib/projects"
import WorkspaceRoute, {
  clientAction,
  clientLoader,
} from "@/routes/project.$projectId"

vi.mock("@/lib/projects", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/projects")>()
  return {
    ...original,
    getProject: vi.fn(),
    listCorpusOptions: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
    linkCorpus: vi.fn(),
    unlinkCorpus: vi.fn(),
    createReference: vi.fn(),
    updateReference: vi.fn(),
    deleteReference: vi.fn(),
  }
})

const detail: ProjectDetail = {
  id: "p1",
  name: "Peshitta Study",
  description: "Aramaic OT sources",
  createdAt: "2026-07-01T00:00:00Z",
  updatedAt: "2026-07-02T00:00:00Z",
  corpora: [
    {
      corpusId: "c1",
      linkedAt: "2026-07-03T00:00:00Z",
      corpus: {
        uid: "u1",
        name: "Peshitta OT",
        language: "Aramaic",
        type: "bible",
        category: "religious",
        version: "1.2.0",
        available: true,
      },
    },
    {
      corpusId: "c2",
      linkedAt: "2026-07-04T00:00:00Z",
      corpus: {
        uid: "u2",
        name: "Targum Onkelos",
        language: "Aramaic",
        type: "bible",
        category: "religious",
        version: "0.9.0",
        available: false,
      },
    },
  ],
  references: [
    {
      id: "r1",
      projectId: "p1",
      title: "Aramaic Grammar",
      authors: "Muraoka, T.",
      year: 2011,
      publication: null,
      url: null,
      createdAt: "2026-07-05T00:00:00Z",
      updatedAt: "2026-07-05T00:00:00Z",
    },
  ],
}

function renderRoute() {
  const Stub = createRoutesStub([
    {
      path: "/project/:projectId",
      Component: WorkspaceRoute,
      HydrateFallback: () => null,
      // biome-ignore lint: route module functions match at runtime
      loader: clientLoader as never,
      action: clientAction as never,
    },
    { path: "/project", Component: () => <h1>Projects list</h1> },
  ])
  return render(<Stub initialEntries={["/project/p1"]} />)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getProject).mockResolvedValue(detail)
  vi.mocked(listCorpusOptions).mockResolvedValue([
    {
      id: "c1",
      name: "Peshitta OT",
      language: "Aramaic",
      type: "bible",
      available: true,
      alreadyLinked: true,
    },
    {
      id: "c3",
      name: "Syriac Lexicon",
      language: "Syriac",
      type: "lexicon",
      available: true,
      alreadyLinked: false,
    },
  ])
})

describe("/project/:projectId workspace", () => {
  it("renders the project header, corpora, and references", async () => {
    renderRoute()
    expect(
      await screen.findByRole("heading", { level: 1, name: "Peshitta Study" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Peshitta OT")).toBeInTheDocument()
    expect(screen.getByText("Aramaic Grammar")).toBeInTheDocument()
  })

  it("shows the no-longer-exists state when the project is gone", async () => {
    vi.mocked(getProject).mockResolvedValue(null)
    renderRoute()
    expect(
      await screen.findByText("This project no longer exists"),
    ).toBeInTheDocument()
  })

  it("renames the project via the edit dialog", async () => {
    const user = userEvent.setup()
    vi.mocked(updateProject).mockResolvedValue({ ...detail, name: "Renamed" })
    renderRoute()

    // the header's Edit comes first in the DOM; reference rows have their own
    await screen.findByRole("heading", { level: 1, name: "Peshitta Study" })
    await user.click(screen.getAllByRole("button", { name: "Edit" })[0])
    const nameInput = await screen.findByLabelText("Name")
    await user.clear(nameInput)
    await user.type(nameInput, "Renamed")
    await user.click(screen.getByRole("button", { name: "Save changes" }))

    await waitFor(() =>
      expect(updateProject).toHaveBeenCalledWith("p1", {
        name: "Renamed",
        description: "Aramaic OT sources",
      }),
    )
  })

  it("deletes the project after confirmation and redirects to the list", async () => {
    const user = userEvent.setup()
    vi.mocked(deleteProject).mockResolvedValue()
    renderRoute()

    // the header's Delete comes first in the DOM; reference rows have their own
    await screen.findByRole("heading", { level: 1, name: "Peshitta Study" })
    await user.click(screen.getAllByRole("button", { name: "Delete" })[0])
    await user.click(
      await screen.findByRole("button", { name: "Delete project" }),
    )

    await waitFor(() => expect(deleteProject).toHaveBeenCalledWith("p1"))
    expect(
      await screen.findByRole("heading", { name: "Projects list" }),
    ).toBeInTheDocument()
  })

  it("links a corpus from the dialog and blocks re-linking", async () => {
    const user = userEvent.setup()
    vi.mocked(linkCorpus).mockResolvedValue()
    renderRoute()

    await user.click(
      await screen.findByRole("button", { name: "Link corpus" }),
    )
    const dialog = await screen.findByRole("dialog")
    // the already-linked corpus offers no Link button, only a "Linked" badge
    expect(within(dialog).getByText("Linked")).toBeInTheDocument()
    expect(within(dialog).getAllByRole("button", { name: "Link" })).toHaveLength(1)

    await user.click(within(dialog).getByRole("button", { name: "Link" }))
    await waitFor(() => expect(linkCorpus).toHaveBeenCalledWith("p1", "c3"))
  })

  it("renders a stale link as unavailable with a remove affordance", async () => {
    renderRoute()
    expect(await screen.findByText("Targum Onkelos")).toBeInTheDocument()
    expect(screen.getByText("Unavailable")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument()
  })

  it("unlinks a corpus without touching the library", async () => {
    const user = userEvent.setup()
    vi.mocked(unlinkCorpus).mockResolvedValue()
    renderRoute()

    await user.click(await screen.findByRole("button", { name: "Unlink" }))
    await waitFor(() => expect(unlinkCorpus).toHaveBeenCalledWith("p1", "c1"))
  })

  it("adds a reference with a title", async () => {
    const user = userEvent.setup()
    vi.mocked(createReference).mockResolvedValue(detail.references[0])
    renderRoute()

    await user.click(
      await screen.findByRole("button", { name: /add reference/i }),
    )
    await user.type(await screen.findByLabelText("Title"), "New Article")
    await user.click(screen.getByRole("button", { name: "Add reference" }))

    await waitFor(() =>
      expect(createReference).toHaveBeenCalledWith(
        "p1",
        expect.objectContaining({ title: "New Article" }),
      ),
    )
  })

  it("shows the validation message when the reference title is missing", async () => {
    const user = userEvent.setup()
    vi.mocked(createReference).mockRejectedValue(
      new DataError("validation", "A title is required."),
    )
    renderRoute()

    await user.click(
      await screen.findByRole("button", { name: /add reference/i }),
    )
    await user.click(screen.getByRole("button", { name: "Add reference" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "A title is required.",
    )
  })

  it("edits an existing reference", async () => {
    const user = userEvent.setup()
    vi.mocked(updateReference).mockResolvedValue(detail.references[0])
    renderRoute()

    const row = (await screen.findByText("Aramaic Grammar")).closest("li")
    if (!row) throw new Error("reference row not found")
    await user.click(within(row).getByRole("button", { name: "Edit" }))

    const titleInput = await screen.findByLabelText("Title")
    expect(titleInput).toHaveValue("Aramaic Grammar")
    await user.clear(titleInput)
    await user.type(titleInput, "Aramaic Grammar, 2nd ed.")
    await user.click(screen.getByRole("button", { name: "Save changes" }))

    await waitFor(() =>
      expect(updateReference).toHaveBeenCalledWith(
        "r1",
        expect.objectContaining({ title: "Aramaic Grammar, 2nd ed." }),
      ),
    )
  })

  it("deletes a reference after a confirmation", async () => {
    const user = userEvent.setup()
    vi.mocked(deleteReference).mockResolvedValue()
    renderRoute()

    const row = (await screen.findByText("Aramaic Grammar")).closest("li")
    if (!row) throw new Error("reference row not found")
    await user.click(within(row).getByRole("button", { name: "Delete" }))
    await user.click(
      await screen.findByRole("button", { name: "Delete reference" }),
    )

    await waitFor(() => expect(deleteReference).toHaveBeenCalledWith("r1"))
  })
})
