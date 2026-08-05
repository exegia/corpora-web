import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createRoutesStub } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  attachCorpusToProject,
  detachCorpusFromProject,
  listCorpusDocuments,
} from "@/lib/corpus"
import { attachLicence, detachLicence, listLicences } from "@/lib/licenses"
import { createOrganization, listOrganizations } from "@/lib/organizations"
import {
  assertEditable,
  classifyProject,
  DataError,
  deleteProject,
  getProject,
  linkCorpus,
  listCorpusOptions,
  type ProjectDetail,
  setProjectOrganization,
  unlinkCorpus,
  updateProject,
  updateProjectStatus,
} from "@/lib/projects"
import { getSuperadmin } from "@/lib/users"
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
    assertEditable: vi.fn(),
  }
})

vi.mock("@/lib/licenses", () => ({
  listLicences: vi.fn(),
  attachLicence: vi.fn(),
  detachLicence: vi.fn(),
}))

vi.mock("@/lib/organizations", () => ({
  listOrganizations: vi.fn(),
  createOrganization: vi.fn(),
}))

vi.mock("@/lib/users", () => ({
  getSuperadmin: vi.fn(),
}))

vi.mock("@/lib/corpus", () => ({
  attachCorpusToProject: vi.fn(),
  detachCorpusFromProject: vi.fn(),
  listCorpusDocuments: vi.fn(),
}))

const detail: ProjectDetail = {
  id: "p1",
  name: "Peshitta Study",
  description: "Aramaic OT sources",
  status: "draft",
  type: null,
  languages: [],
  category: null,
  creator: { id: "u1", name: "Ada Researcher", username: "ada" },
  organization: null,
  licenses: [],
  corpus: null,
  commits: [],
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
  ],
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

const softwareLicense = {
  ...catalogLicense,
  id: "GPL-3.0",
  title: "GNU GPL v3",
  domains: { content: false, data: false, software: true },
}

const attachedLicence = {
  ...catalogLicense,
  agreedAt: "2026-07-06T00:00:00Z",
  agreedBy: detail.creator,
}

/** A project passing every ready-for-review requirement. */
const readyDetail: ProjectDetail = {
  ...detail,
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
  vi.mocked(assertEditable).mockResolvedValue()
  vi.mocked(getSuperadmin).mockResolvedValue({
    id: "u9",
    name: "Emmanuel",
    username: "manny",
    email: "manny.defreitas7@gmail.com",
  })
  vi.mocked(listLicences).mockResolvedValue([catalogLicense, softwareLicense])
  vi.mocked(listCorpusDocuments).mockResolvedValue([
    {
      id: "d1",
      name: "peshitta",
      source: "upload",
      path: "d1/peshitta.corpus",
      filename: "peshitta.corpus",
      uploadedAt: "2026-07-10T00:00:00Z",
      commits: [],
    },
    {
      id: "d2",
      name: "onkelos",
      source: "huggingface",
      path: "https://huggingface.co/datasets/x/onkelos",
      filename: null,
      uploadedAt: "2026-07-11T00:00:00Z",
      commits: [],
    },
  ])
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
  it("renders the project header, corpus section, and references", async () => {
    renderRoute()
    expect(
      await screen.findByRole("heading", { level: 1, name: "Peshitta Study" }),
    ).toBeInTheDocument()
    // The heading paints from the awaited project, ahead of the panels, so it
    // is no longer a proxy for "everything has loaded" — await panel content.
    expect(await screen.findByText("No corpus attached")).toBeInTheDocument()
    expect(screen.getByText("Peshitta OT")).toBeInTheDocument()
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

    await screen.findByRole("heading", { level: 1, name: "Peshitta Study" })
    await user.click(screen.getByRole("button", { name: "Edit" }))
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

    await screen.findByRole("heading", { level: 1, name: "Peshitta Study" })
    await user.click(screen.getByRole("button", { name: "Delete" }))
    const confirm = await screen.findByRole("button", { name: "Delete project" })
    expect(confirm).toBeDisabled()
    await user.type(screen.getByRole("textbox"), "DELETE")
    await user.click(confirm)

    await waitFor(() => expect(deleteProject).toHaveBeenCalledWith("p1"))
    expect(
      await screen.findByRole("heading", { name: "Projects list" }),
    ).toBeInTheDocument()
  })
})

describe("references — corpus links (003)", () => {
  it("references a library corpus from the dialog and blocks duplicates", async () => {
    const user = userEvent.setup()
    vi.mocked(linkCorpus).mockResolvedValue()
    renderRoute()

    await user.click(
      await screen.findByRole("button", { name: "Add reference" }),
    )
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText("Referenced")).toBeInTheDocument()
    expect(
      within(dialog).getAllByRole("button", { name: "Reference" }),
    ).toHaveLength(1)

    await user.click(within(dialog).getByRole("button", { name: "Reference" }))
    await waitFor(() => expect(linkCorpus).toHaveBeenCalledWith("p1", "c3"))
  })

  it("removes a reference without touching the library", async () => {
    const user = userEvent.setup()
    vi.mocked(unlinkCorpus).mockResolvedValue()
    renderRoute()

    const row = (await screen.findByText("Peshitta OT")).closest("li")
    if (!row) throw new Error("reference row not found")
    await user.click(within(row).getByRole("button", { name: "Remove" }))
    await waitFor(() => expect(unlinkCorpus).toHaveBeenCalledWith("p1", "c1"))
  })
})

describe("details panel — status workflow (003)", () => {
  it("disables Ready for review and lists the checklist while requirements are unmet", async () => {
    renderRoute()
    const ready = await screen.findByRole("button", { name: "Ready for review" })
    expect(ready).toBeDisabled()
    // no other status action from a plain draft
    expect(
      screen.queryByRole("button", { name: "Change to draft" }),
    ).not.toBeInTheDocument()
    // the unmet requirements are listed as a checklist
    expect(screen.getByText("Licence attached and agreed")).toBeInTheDocument()
    expect(screen.getByText("Corpus attached")).toBeInTheDocument()
  })

  it("enables Ready for review once licence, classification, and corpus pass", async () => {
    vi.mocked(getProject).mockResolvedValue(readyDetail)
    renderRoute()
    expect(
      await screen.findByRole("button", { name: "Ready for review" }),
    ).toBeEnabled()
  })

  it("submits set-status with the loaded project and superadmin flag", async () => {
    const user = userEvent.setup()
    vi.mocked(getProject).mockResolvedValue(readyDetail)
    vi.mocked(updateProjectStatus).mockResolvedValue()
    renderRoute()

    await user.click(
      await screen.findByRole("button", { name: "Ready for review" }),
    )
    await waitFor(() =>
      expect(updateProjectStatus).toHaveBeenCalledWith(
        expect.objectContaining({ id: "p1" }),
        "ready-for-review",
        true,
      ),
    )
  })

  it("lets the superadmin publish or return a project in review", async () => {
    const user = userEvent.setup()
    vi.mocked(getProject).mockResolvedValue({
      ...readyDetail,
      status: "ready-for-review",
    })
    vi.mocked(updateProjectStatus).mockResolvedValue()
    renderRoute()

    // the double group: publish, or send back to draft
    const publish = await screen.findByRole("button", { name: "Publish" })
    expect(
      screen.getByRole("button", { name: "Change to draft" }),
    ).toBeInTheDocument()
    await user.click(publish)
    await waitFor(() =>
      expect(updateProjectStatus).toHaveBeenCalledWith(
        expect.objectContaining({ id: "p1" }),
        "published",
        true,
      ),
    )
  })

  it("surfaces a refused status change as a visible error", async () => {
    const user = userEvent.setup()
    vi.mocked(getProject).mockResolvedValue(readyDetail)
    vi.mocked(updateProjectStatus).mockRejectedValue(
      new DataError("validation", "Only the superadmin can approve."),
    )
    renderRoute()

    await user.click(
      await screen.findByRole("button", { name: "Ready for review" }),
    )
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Only the superadmin can approve.",
    )
  })
})

describe("read-only while in review (003)", () => {
  beforeEach(() => {
    vi.mocked(getProject).mockResolvedValue({
      ...readyDetail,
      status: "ready-for-review",
    })
  })

  it("hides every editing affordance and shows the review banner", async () => {
    renderRoute()
    // The banner is an AlertBlock, whose root carries role="alert"; the
    // title and description are separate children, so match on text content.
    expect(await screen.findByRole("alert")).toHaveTextContent(/in review/i)
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Classify" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Add licence" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Add reference" })).toBeDisabled()
  })

  it("rejects mutating actions server-side via assertEditable", async () => {
    vi.mocked(assertEditable).mockRejectedValue(
      new DataError("validation", "This project is in review and read-only."),
    )
    const request = new Request("http://localhost/project/p1", {
      method: "POST",
      body: new URLSearchParams({ intent: "classify", type: "regular" }),
    })
    const result = await clientAction({
      request,
      params: { projectId: "p1" },
      context: {},
    } as never)
    expect(result).toEqual({
      ok: false,
      error: "This project is in review and read-only.",
    })
    expect(classifyProject).not.toHaveBeenCalled()
  })
})

describe("details panel — classification (US2)", () => {
  it("renders Unclassified and swaps the conditional field per type", async () => {
    const user = userEvent.setup()
    renderRoute()

    expect(await screen.findByText("Unclassified")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Classify" }))

    await user.click(await screen.findByLabelText("Type"))
    await user.click(await screen.findByRole("option", { name: "bible" }))
    expect(screen.getByLabelText("Source languages")).toBeInTheDocument()
    expect(screen.queryByLabelText("Category")).not.toBeInTheDocument()

    await user.click(screen.getByLabelText("Type"))
    await user.click(await screen.findByRole("option", { name: "commentary" }))
    expect(screen.getByLabelText("Category")).toBeInTheDocument()
    expect(screen.queryByLabelText("Source languages")).not.toBeInTheDocument()

    await user.click(screen.getByLabelText("Type"))
    await user.click(await screen.findByRole("option", { name: "regular" }))
    expect(screen.queryByLabelText("Source languages")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Category")).not.toBeInTheDocument()
  })

  it("narrows the language options for quran to arabic and english", async () => {
    const user = userEvent.setup()
    renderRoute()

    await user.click(await screen.findByRole("button", { name: "Classify" }))
    await user.click(await screen.findByLabelText("Type"))
    await user.click(await screen.findByRole("option", { name: "quran" }))

    await user.click(screen.getByLabelText("Source languages"))
    const options = await screen.findAllByRole("option")
    expect(options.map((option) => option.textContent)).toEqual([
      "Arabic",
      "English",
    ])
  })

  it("blocks saving until the required conditional value is chosen", async () => {
    const user = userEvent.setup()
    renderRoute()

    await user.click(await screen.findByRole("button", { name: "Classify" }))
    await user.click(await screen.findByLabelText("Type"))
    await user.click(await screen.findByRole("option", { name: "bible" }))
    expect(
      screen.getByRole("button", { name: "Save classification" }),
    ).toBeDisabled()

    await user.click(screen.getByLabelText("Source languages"))
    await user.click(await screen.findByRole("option", { name: "Hebrew" }))
    // multiple selection keeps the popup open; close it to reach the footer
    await user.keyboard("{Escape}")
    expect(
      screen.getByRole("button", { name: "Save classification" }),
    ).toBeEnabled()
  })

  it("submits the classification and clears the stale value on a type switch", async () => {
    const user = userEvent.setup()
    vi.mocked(getProject).mockResolvedValue({
      ...detail,
      type: "bible",
      languages: ["hebrew"],
    })
    vi.mocked(classifyProject).mockResolvedValue()
    renderRoute()

    await user.click(await screen.findByRole("button", { name: "Classify" }))
    await user.click(await screen.findByLabelText("Type"))
    await user.click(await screen.findByRole("option", { name: "review" }))
    await user.click(screen.getByLabelText("Category"))
    await user.click(await screen.findByRole("option", { name: "literary" }))
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

describe("details panel — licences (US3)", () => {
  it("filters out non-content licences and attaches after an agreement step", async () => {
    const user = userEvent.setup()
    vi.mocked(attachLicence).mockResolvedValue()
    renderRoute()

    expect(await screen.findByText(/no licences attached/i)).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Add licence" }))

    // GPL is software-only — it has no business in a content catalog
    expect(
      await screen.findByText("Creative Commons Attribution 4.0"),
    ).toBeInTheDocument()
    expect(screen.queryByText("GNU GPL v3")).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Attach" }))
    expect(attachLicence).not.toHaveBeenCalled() // agreement step first
    await user.click(screen.getByRole("button", { name: "Agree & attach" }))

    await waitFor(() =>
      expect(attachLicence).toHaveBeenCalledWith("p1", "CC-BY-4.0", "u1"),
    )
  })

  it("searches the catalog by title", async () => {
    const user = userEvent.setup()
    renderRoute()

    await user.click(await screen.findByRole("button", { name: "Add licence" }))
    const search = await screen.findByLabelText("Search licences")
    await user.type(search, "creative")
    expect(
      screen.getByText("Creative Commons Attribution 4.0"),
    ).toBeInTheDocument()

    await user.clear(search)
    await user.type(search, "does-not-exist")
    expect(await screen.findByText(/no licence matches/i)).toBeInTheDocument()
  })

  it("lists attached licences with agreement info and detaches one row only", async () => {
    const user = userEvent.setup()
    vi.mocked(detachLicence).mockResolvedValue()
    vi.mocked(getProject).mockResolvedValue({
      ...detail,
      licenses: [
        attachedLicence,
        {
          ...attachedLicence,
          id: "CC0-1.0",
          title: "CC0 Public Domain",
          agreedAt: "2026-07-07T00:00:00Z",
        },
      ],
    })
    renderRoute()

    expect(
      await screen.findByText("Creative Commons Attribution 4.0"),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/agreed .* by ada researcher/i)).toHaveLength(2)

    const row = screen.getByText("CC0 Public Domain").closest("tr") as HTMLElement
    await user.click(within(row).getByRole("button", { name: "Remove" }))
    await waitFor(() =>
      expect(detachLicence).toHaveBeenCalledWith("p1", "CC0-1.0"),
    )
    expect(detachLicence).toHaveBeenCalledTimes(1)
  })

  it("explains an empty content catalog", async () => {
    const user = userEvent.setup()
    vi.mocked(listLicences).mockResolvedValue([softwareLicense])
    renderRoute()

    await user.click(await screen.findByRole("button", { name: "Add licence" }))
    expect(
      await screen.findByText(/catalog has not been seeded/i),
    ).toBeInTheDocument()
  })
})

describe("corpus section (003)", () => {
  it("imports a corpus from the library and marks the imported one", async () => {
    const user = userEvent.setup()
    vi.mocked(attachCorpusToProject).mockResolvedValue()
    renderRoute()

    await user.click(
      await screen.findByRole("button", { name: "Import corpus" }),
    )
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText("onkelos")).toBeInTheDocument()

    await user.click(within(dialog).getAllByRole("button", { name: "Import" })[0])
    await waitFor(() =>
      expect(attachCorpusToProject).toHaveBeenCalledWith("p1", "d1"),
    )
  })

  it("points at the Corpus page when the library is empty", async () => {
    const user = userEvent.setup()
    vi.mocked(listCorpusDocuments).mockResolvedValue([])
    renderRoute()

    await user.click(
      await screen.findByRole("button", { name: "Import corpus" }),
    )
    expect(
      await screen.findByText(/corpus library is empty/i),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Corpus" })).toHaveAttribute(
      "href",
      "/corpus",
    )
  })

  it("shows the version history and detaches without deleting the document", async () => {
    const user = userEvent.setup()
    vi.mocked(detachCorpusFromProject).mockResolvedValue()
    vi.mocked(getProject).mockResolvedValue({
      ...readyDetail,
      commits: [
        {
          id: "cm1",
          sha: "a1b2c3d4e5f",
          message: "Fix verse numbering\n\nDetails…",
          authorName: "Ada",
          authorEmail: "ada@example.org",
          branch: "main",
          committedAt: "2026-07-05T00:00:00Z",
        },
      ],
    })
    renderRoute()

    expect(await screen.findByText("peshitta")).toBeInTheDocument()
    expect(screen.getByText("Fix verse numbering")).toBeInTheDocument()
    expect(screen.getByText(/ada · .* · main @ a1b2c3d/i)).toBeInTheDocument()

    const card = screen.getByText("peshitta").closest("div.flex")
    const remove = screen
      .getAllByRole("button", { name: "Remove" })
      .find((button) => card?.parentElement?.contains(button))
    if (!remove) throw new Error("corpus remove button not found")
    await user.click(remove)
    await waitFor(() =>
      expect(detachCorpusFromProject).toHaveBeenCalledWith("p1"),
    )
  })
})

describe("details panel — organization & creator (US4)", () => {
  it("displays the creator (FR-015)", async () => {
    renderRoute()
    expect(await screen.findByText("Ada Researcher")).toBeInTheDocument()
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
