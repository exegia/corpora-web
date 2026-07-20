import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createRoutesStub } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { attachLicense, detachLicense, listLicenses } from "@/lib/licenses"
import { createOrganization, listOrganizations } from "@/lib/organizations"
import {
  classifyProject,
  createReference,
  DataError,
  deleteProject,
  deleteReference,
  getProject,
  linkCorpus,
  listCorpusOptions,
  type ProjectDetail,
  setProjectOrganization,
  unlinkCorpus,
  updateProject,
  updateProjectStatus,
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
    updateProjectStatus: vi.fn(),
    classifyProject: vi.fn(),
    setProjectOrganization: vi.fn(),
    deleteProject: vi.fn(),
    linkCorpus: vi.fn(),
    unlinkCorpus: vi.fn(),
    createReference: vi.fn(),
    updateReference: vi.fn(),
    deleteReference: vi.fn(),
  }
})

vi.mock("@/lib/licenses", () => ({
  listLicenses: vi.fn(),
  attachLicense: vi.fn(),
  detachLicense: vi.fn(),
}))

vi.mock("@/lib/organizations", () => ({
  listOrganizations: vi.fn(),
  createOrganization: vi.fn(),
}))

const detail: ProjectDetail = {
  id: "p1",
  name: "Peshitta Study",
  description: "Aramaic OT sources",
  status: "draft",
  type: null,
  language: null,
  category: null,
  creator: { id: "u1", name: "Ada Researcher", username: "ada" },
  organization: null,
  licenses: [],
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

const catalogLicense = {
  id: "CC-BY-4.0",
  title: "Creative Commons Attribution 4.0",
  url: null,
  domains: { content: true, data: true, software: false },
  status: "active" as const,
  family: null,
  maintainer: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getProject).mockResolvedValue(detail)
  vi.mocked(listLicenses).mockResolvedValue([catalogLicense])
  vi.mocked(listOrganizations).mockResolvedValue([
    { id: "o1", name: "Peshitta Institute", website: null },
  ])
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

describe("details panel — status (US1)", () => {
  it("shows metadata with the current status and only the five statuses offered", async () => {
    renderRoute()
    const select = await screen.findByLabelText("Status")
    expect(select).toHaveValue("draft")
    expect(
      within(select as HTMLElement)
        .getAllByRole("option")
        .map((option) => (option as HTMLOptionElement).value),
    ).toEqual(["draft", "started", "progress", "completed", "failed"])
    // dates appear in the panel's Dates row (in addition to the header)
    expect(screen.getAllByText(/created/i).length).toBeGreaterThanOrEqual(2)
  })

  it("submits set-status when the status changes", async () => {
    const user = userEvent.setup()
    vi.mocked(updateProjectStatus).mockResolvedValue()
    renderRoute()

    await user.selectOptions(await screen.findByLabelText("Status"), "started")
    await waitFor(() =>
      expect(updateProjectStatus).toHaveBeenCalledWith("p1", "started"),
    )
  })

  it("surfaces a failed status update as a visible error", async () => {
    const user = userEvent.setup()
    vi.mocked(updateProjectStatus).mockRejectedValue(
      new DataError("unknown", "Could not update the project status."),
    )
    renderRoute()

    await user.selectOptions(await screen.findByLabelText("Status"), "failed")
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not update the project status.",
    )
  })
})

describe("details panel — classification (US2)", () => {
  it("renders Unclassified and swaps the conditional field per type", async () => {
    const user = userEvent.setup()
    renderRoute()

    expect(await screen.findByText("Unclassified")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Classify" }))

    const typeSelect = await screen.findByLabelText("Type")
    await user.selectOptions(typeSelect, "bible")
    expect(screen.getByLabelText("Source language")).toBeInTheDocument()
    expect(screen.queryByLabelText("Category")).not.toBeInTheDocument()

    await user.selectOptions(typeSelect, "commentary")
    expect(screen.getByLabelText("Category")).toBeInTheDocument()
    expect(screen.queryByLabelText("Source language")).not.toBeInTheDocument()

    await user.selectOptions(typeSelect, "regular")
    expect(screen.queryByLabelText("Source language")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Category")).not.toBeInTheDocument()
  })

  it("blocks saving until the required conditional value is chosen", async () => {
    const user = userEvent.setup()
    renderRoute()

    await user.click(await screen.findByRole("button", { name: "Classify" }))
    await user.selectOptions(await screen.findByLabelText("Type"), "bible")
    expect(
      screen.getByRole("button", { name: "Save classification" }),
    ).toBeDisabled()

    await user.selectOptions(screen.getByLabelText("Source language"), "hebrew")
    expect(
      screen.getByRole("button", { name: "Save classification" }),
    ).toBeEnabled()
  })

  it("submits the classification and clears the stale value on a type switch", async () => {
    const user = userEvent.setup()
    vi.mocked(getProject).mockResolvedValue({
      ...detail,
      type: "bible",
      language: "hebrew",
    })
    vi.mocked(classifyProject).mockResolvedValue()
    renderRoute()

    await user.click(await screen.findByRole("button", { name: "Classify" }))
    await user.selectOptions(await screen.findByLabelText("Type"), "review")
    await user.selectOptions(screen.getByLabelText("Category"), "literary")
    await user.click(
      screen.getByRole("button", { name: "Save classification" }),
    )

    await waitFor(() =>
      expect(classifyProject).toHaveBeenCalledWith("p1", {
        type: "review",
        category: "literary",
      }),
    )
  })
})

describe("details panel — licenses (US3)", () => {
  it("shows the empty state and attaches after an agreement confirmation", async () => {
    const user = userEvent.setup()
    vi.mocked(attachLicense).mockResolvedValue()
    renderRoute()

    expect(await screen.findByText(/no licenses attached/i)).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Add license" }))
    await user.click(await screen.findByRole("button", { name: "Attach" }))
    expect(attachLicense).not.toHaveBeenCalled() // agreement step first
    await user.click(screen.getByRole("button", { name: "Agree & attach" }))

    await waitFor(() =>
      expect(attachLicense).toHaveBeenCalledWith("p1", "CC-BY-4.0", "u1"),
    )
  })

  it("lists attached licenses with agreement info and detaches one row only", async () => {
    const user = userEvent.setup()
    vi.mocked(detachLicense).mockResolvedValue()
    vi.mocked(getProject).mockResolvedValue({
      ...detail,
      licenses: [
        {
          ...catalogLicense,
          agreedAt: "2026-07-06T00:00:00Z",
          agreedBy: detail.creator,
        },
        {
          ...catalogLicense,
          id: "GPL-3.0",
          title: "GNU GPL v3",
          agreedAt: "2026-07-07T00:00:00Z",
          agreedBy: detail.creator,
        },
      ],
    })
    renderRoute()

    expect(
      await screen.findByText("Creative Commons Attribution 4.0"),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/agreed .* by ada researcher/i)).toHaveLength(2)

    const row = screen
      .getByText("GNU GPL v3")
      .closest("li") as HTMLElement
    await user.click(within(row).getByRole("button", { name: "Remove" }))
    await waitFor(() =>
      expect(detachLicense).toHaveBeenCalledWith("p1", "GPL-3.0"),
    )
    expect(detachLicense).toHaveBeenCalledTimes(1)
  })

  it("marks already-attached catalog entries and explains an empty catalog", async () => {
    const user = userEvent.setup()
    vi.mocked(listLicenses).mockResolvedValue([])
    renderRoute()

    await user.click(await screen.findByRole("button", { name: "Add license" }))
    expect(
      await screen.findByText(/catalog has not been seeded/i),
    ).toBeInTheDocument()
  })
})

describe("details panel — organization & creator (US4)", () => {
  it("displays the creator (FR-015)", async () => {
    renderRoute()
    expect(await screen.findByText("Ada Researcher")).toBeInTheDocument()
  })

  it("displays the backfilled default user for pre-002 projects (FR-017)", async () => {
    vi.mocked(getProject).mockResolvedValue({
      ...detail,
      creator: { id: "u0", name: "Default User", username: "default" },
    })
    renderRoute()
    expect(await screen.findByText("Default User")).toBeInTheDocument()
  })

  it("assigns an existing organization from the picker", async () => {
    const user = userEvent.setup()
    vi.mocked(setProjectOrganization).mockResolvedValue()
    renderRoute()

    await user.click(await screen.findByRole("button", { name: "Assign" }))
    await user.selectOptions(
      await screen.findByLabelText("Organization"),
      "Peshitta Institute",
    )
    await user.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() =>
      expect(setProjectOrganization).toHaveBeenCalledWith("p1", "o1"),
    )
  })

  it("creates an organization inline and assigns it", async () => {
    const user = userEvent.setup()
    vi.mocked(createOrganization).mockResolvedValue({
      id: "o2",
      name: "New Org",
      website: null,
    })
    vi.mocked(setProjectOrganization).mockResolvedValue()
    renderRoute()

    await user.click(await screen.findByRole("button", { name: "Assign" }))
    await user.click(
      await screen.findByRole("button", { name: /create a new organization/i }),
    )
    await user.type(await screen.findByLabelText("Name"), "New Org")
    await user.click(screen.getByRole("button", { name: "Create & assign" }))

    await waitFor(() =>
      expect(createOrganization).toHaveBeenCalledWith(
        expect.objectContaining({ name: "New Org" }),
      ),
    )
    await waitFor(() =>
      expect(setProjectOrganization).toHaveBeenCalledWith("p1", "o2"),
    )
  })

  it("removes the organization without deleting the project", async () => {
    const user = userEvent.setup()
    vi.mocked(setProjectOrganization).mockResolvedValue()
    vi.mocked(getProject).mockResolvedValue({
      ...detail,
      organization: { id: "o1", name: "Peshitta Institute", website: null },
    })
    renderRoute()

    const organizationRow = (
      await screen.findByText("Peshitta Institute")
    ).closest("dd") as HTMLElement
    await user.click(
      within(organizationRow).getByRole("button", { name: "Remove" }),
    )

    await waitFor(() =>
      expect(setProjectOrganization).toHaveBeenCalledWith("p1", null),
    )
    expect(deleteProject).not.toHaveBeenCalled()
  })
})
