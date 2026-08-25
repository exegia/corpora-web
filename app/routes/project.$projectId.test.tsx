import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createRoutesStub } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import Corpus from "@/lib/corpus"
import Licences from "@/lib/licenses"
import Organization from "@/lib/organization"
import Project, { type ProjectDetail } from "@/lib/projects"
import User from "@/lib/user"
import WorkspaceRoute, {
  clientAction,
  clientLoader,
} from "@/routes/project.$projectId"

vi.mock("@/lib/projects", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/projects")>()
  // Only the namespaced members the route calls are replaced; `Errors` is
  // spread by reference so `instanceof Project.Errors.DataError` still holds.
  return {
    ...original,
    default: {
      ...original.default,
      Queries: {
        ...original.default.Queries,
        getProject: vi.fn(),
        listCorpusOptions: vi.fn(),
      },
      Mutations: {
        ...original.default.Mutations,
        updateProject: vi.fn(),
        updateProjectStatus: vi.fn(),
        classifyProject: vi.fn(),
        setProjectOrganization: vi.fn(),
        deleteProject: vi.fn(),
        linkCorpus: vi.fn(),
        unlinkCorpus: vi.fn(),
        assertEditable: vi.fn(),
      },
    },
  }
})

vi.mock("@/lib/licenses", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/licenses")>()
  return {
    ...original,
    default: {
      ...original.default,
      // getLicence/resolveLicenceText are only reached when the View dialog
      // opens, but replacing a namespace drops whatever it leaves out.
      Catalog: { ...original.default.Catalog, listLicences: vi.fn(), getLicence: vi.fn() },
      Text: { ...original.default.Text, resolveLicenceText: vi.fn() },
      Attachment: {
        ...original.default.Attachment,
        attachLicence: vi.fn(),
        agreeLicence: vi.fn(),
        detachLicence: vi.fn(),
      },
    },
  }
})

vi.mock("@/lib/organization", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/organization")>()
  return {
    ...original,
    default: {
      ...original.default,
      listOrganizations: vi.fn(),
      createOrganization: vi.fn(),
    },
  }
})

vi.mock("@/lib/user", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/user")>()
  return {
    ...original,
    default: { ...original.default, getSuperadmin: vi.fn() },
  }
})

vi.mock("@/lib/corpus", async (importOriginal) => {
  // Spread the original so constant exports (TYPE_ICONS) stay real.
  const original = await importOriginal<typeof import("@/lib/corpus")>()
  return {
    ...original,
    default: {
      ...original.default,
      Documents: {
        ...original.default.Documents,
        attachCorpusToProject: vi.fn(),
        detachCorpusFromProject: vi.fn(),
        listCorpusDocuments: vi.fn(),
      },
    },
  }
})

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
  vi.mocked(Project.Queries.getProject).mockResolvedValue(detail)
  vi.mocked(Project.Mutations.assertEditable).mockResolvedValue()
  vi.mocked(User.getSuperadmin).mockResolvedValue({
    id: "u9",
    name: "Emmanuel",
    username: "manny",
    email: "manny.defreitas7@gmail.com",
  })
  vi.mocked(Licences.Catalog.listLicences).mockResolvedValue([catalogLicense, softwareLicense])
  const noMetadata = {
    corpusType: null,
    sourceFormat: null,
    licence: null,
    language: null,
    sizeBytes: null,
    docsCount: null,
    nodes: null,
    words: null,
    status: null,
    convertedAt: null,
    description: null,
    toc: null,
    jobId: null,
  }
  vi.mocked(Corpus.Documents.listCorpusDocuments).mockResolvedValue([
    {
      id: "d1",
      name: "peshitta",
      source: "upload",
      path: "d1/peshitta.corpus",
      filename: "peshitta.corpus",
      uploadedAt: "2026-07-10T00:00:00Z",
      commits: [],
      ...noMetadata,
    },
    {
      id: "d2",
      name: "onkelos",
      source: "huggingface",
      path: "https://huggingface.co/datasets/x/onkelos",
      filename: null,
      uploadedAt: "2026-07-11T00:00:00Z",
      commits: [],
      ...noMetadata,
    },
  ])
  vi.mocked(Organization.listOrganizations).mockResolvedValue([
    { id: "o1", name: "Peshitta Institute", website: null },
  ])
  vi.mocked(Project.Queries.listCorpusOptions).mockResolvedValue([
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
    vi.mocked(Project.Queries.getProject).mockResolvedValue(null)
    renderRoute()
    expect(
      await screen.findByText("This project no longer exists"),
    ).toBeInTheDocument()
  })

  it("renames the project via the edit dialog", async () => {
    const user = userEvent.setup()
    vi.mocked(Project.Mutations.updateProject).mockResolvedValue({ ...detail, name: "Renamed" })
    renderRoute()

    await screen.findByRole("heading", { level: 1, name: "Peshitta Study" })
    await user.click(screen.getByRole("button", { name: "Edit" }))
    const nameInput = await screen.findByLabelText("Name")
    await user.clear(nameInput)
    await user.type(nameInput, "Renamed")
    await user.click(screen.getByRole("button", { name: "Save changes" }))

    await waitFor(() =>
      expect(Project.Mutations.updateProject).toHaveBeenCalledWith("p1", {
        name: "Renamed",
        description: "Aramaic OT sources",
      }),
    )
  })

  it("deletes the project after confirmation and redirects to the list", async () => {
    const user = userEvent.setup()
    vi.mocked(Project.Mutations.deleteProject).mockResolvedValue()
    renderRoute()

    await screen.findByRole("heading", { level: 1, name: "Peshitta Study" })
    await user.click(screen.getByRole("button", { name: "Delete" }))
    const confirm = await screen.findByRole("button", { name: "Delete project" })
    expect(confirm).toBeDisabled()
    await user.type(screen.getByRole("textbox"), "DELETE")
    await user.click(confirm)

    await waitFor(() => expect(Project.Mutations.deleteProject).toHaveBeenCalledWith("p1"))
    expect(
      await screen.findByRole("heading", { name: "Projects list" }),
    ).toBeInTheDocument()
  })
})

describe("references — corpus links (003)", () => {
  it("references a library corpus from the dialog and blocks duplicates", async () => {
    const user = userEvent.setup()
    vi.mocked(Project.Mutations.linkCorpus).mockResolvedValue()
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
    await waitFor(() => expect(Project.Mutations.linkCorpus).toHaveBeenCalledWith("p1", "c3"))
  })

  it("removes a reference without touching the library", async () => {
    const user = userEvent.setup()
    vi.mocked(Project.Mutations.unlinkCorpus).mockResolvedValue()
    renderRoute()

    const row = (await screen.findByText("Peshitta OT")).closest("li")
    if (!row) throw new Error("reference row not found")
    await user.click(within(row).getByRole("button", { name: "Remove" }))
    await waitFor(() => expect(Project.Mutations.unlinkCorpus).toHaveBeenCalledWith("p1", "c1"))
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
    vi.mocked(Project.Queries.getProject).mockResolvedValue(readyDetail)
    renderRoute()
    expect(
      await screen.findByRole("button", { name: "Ready for review" }),
    ).toBeEnabled()
  })

  it("submits set-status with the loaded project and superadmin flag", async () => {
    const user = userEvent.setup()
    vi.mocked(Project.Queries.getProject).mockResolvedValue(readyDetail)
    vi.mocked(Project.Mutations.updateProjectStatus).mockResolvedValue()
    renderRoute()

    await user.click(
      await screen.findByRole("button", { name: "Ready for review" }),
    )
    await waitFor(() =>
      expect(Project.Mutations.updateProjectStatus).toHaveBeenCalledWith(
        expect.objectContaining({ id: "p1" }),
        "ready-for-review",
        true,
      ),
    )
  })

  it("lets the superadmin publish or return a project in review", async () => {
    const user = userEvent.setup()
    vi.mocked(Project.Queries.getProject).mockResolvedValue({
      ...readyDetail,
      status: "ready-for-review",
    })
    vi.mocked(Project.Mutations.updateProjectStatus).mockResolvedValue()
    renderRoute()

    // the double group: publish, or send back to draft
    const publish = await screen.findByRole("button", { name: "Publish" })
    expect(
      screen.getByRole("button", { name: "Change to draft" }),
    ).toBeInTheDocument()
    await user.click(publish)
    await waitFor(() =>
      expect(Project.Mutations.updateProjectStatus).toHaveBeenCalledWith(
        expect.objectContaining({ id: "p1" }),
        "published",
        true,
      ),
    )
  })

  it("surfaces a refused status change as a visible error", async () => {
    const user = userEvent.setup()
    vi.mocked(Project.Queries.getProject).mockResolvedValue(readyDetail)
    vi.mocked(Project.Mutations.updateProjectStatus).mockRejectedValue(
      new Project.Errors.DataError("validation", "Only the superadmin can approve."),
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
    vi.mocked(Project.Queries.getProject).mockResolvedValue({
      ...readyDetail,
      status: "ready-for-review",
      // Remove is gated on `!readOnly && project.organization` — without an
      // organization here, asserting its absence would prove nothing.
      organization: { id: "o1", name: "Peshitta Institute", website: null },
    })
  })

  it("hides every editing affordance and shows the review banner", async () => {
    renderRoute()
    // The banner is an AlertBlock, whose root carries role="alert"; the
    // title and description are separate children, so match on text content.
    expect(await screen.findByRole("alert")).toHaveTextContent(/in review/i)
    // The banner is outside the Suspense boundary, so it resolves first: the
    // panels have to be awaited before anything inside them can be asserted
    // absent, or every queryByRole below passes for the wrong reason.
    expect(
      await screen.findByRole("button", { name: "Add licence" }),
    ).toBeDisabled()
    expect(screen.getByRole("button", { name: "Add reference" })).toBeDisabled()
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Add classification" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Add organization" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Add website" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument()
  })

  it("rejects mutating actions server-side via assertEditable", async () => {
    vi.mocked(Project.Mutations.assertEditable).mockRejectedValue(
      new Project.Errors.DataError("validation", "This project is in review and read-only."),
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
    expect(Project.Mutations.classifyProject).not.toHaveBeenCalled()
  })
})

describe("details panel — classification (US2)", () => {
  it("renders Unclassified and swaps the conditional field per type", async () => {
    const user = userEvent.setup()
    renderRoute()

    // Unclassified now reads as the affordance to classify.
    await user.click(
      await screen.findByRole("button", { name: "Add classification" }),
    )

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

    await user.click(await screen.findByRole("button", { name: "Add classification" }))
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

    await user.click(await screen.findByRole("button", { name: "Add classification" }))
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
    vi.mocked(Project.Queries.getProject).mockResolvedValue({
      ...detail,
      type: "bible",
      languages: ["hebrew"],
    })
    vi.mocked(Project.Mutations.classifyProject).mockResolvedValue()
    renderRoute()

    // Already classified, so the value itself is the trigger.
    await user.click(
      await screen.findByRole("button", { name: "Edit classification" }),
    )
    await user.click(await screen.findByLabelText("Type"))
    await user.click(await screen.findByRole("option", { name: "review" }))
    await user.click(screen.getByLabelText("Category"))
    await user.click(await screen.findByRole("option", { name: "literary" }))
    await user.click(
      screen.getByRole("button", { name: "Save classification" }),
    )

    await waitFor(() =>
      expect(Project.Mutations.classifyProject).toHaveBeenCalledWith("p1", {
        type: "review",
        category: "literary",
      }),
    )
  })
})

describe("details panel — value-as-trigger rows", () => {
  it("previews the creator on the value itself", async () => {
    const user = userEvent.setup()
    renderRoute()

    const trigger = await screen.findByRole("button", {
      name: "About Ada Researcher",
    })
    await user.hover(trigger)
    expect(await screen.findByText("@ada")).toBeInTheDocument()
  })

  // The website lives on the organization record, so its empty state has to
  // route to the organization editor rather than a field of its own.
  it("offers Add website and opens the organization editor", async () => {
    const user = userEvent.setup()
    renderRoute()

    await user.click(await screen.findByRole("button", { name: "Add website" }))
    expect(await screen.findByLabelText("Organization")).toBeInTheDocument()
  })
})

describe("details panel — licences (US3)", () => {
  it("defaults to content licences and attaches after an agreement step", async () => {
    const user = userEvent.setup()
    vi.mocked(Licences.Attachment.attachLicence).mockResolvedValue()
    vi.mocked(Licences.Catalog.getLicence).mockResolvedValue({} as never)
    vi.mocked(Licences.Text.resolveLicenceText).mockResolvedValue("# CC BY 4.0")
    renderRoute()

    expect(await screen.findByText(/no licences attached/i)).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Add licence" }))

    // GPL is software-only — the domain filter starts on content
    expect(
      await screen.findByText("Creative Commons Attribution 4.0"),
    ).toBeInTheDocument()
    expect(screen.queryByText("GNU GPL v3")).not.toBeInTheDocument()

    // Agreeing happens inside the viewer, so the licence cannot be attached
    // without it having been shown.
    await user.click(
      screen.getByRole("button", {
        name: "View Creative Commons Attribution 4.0 (CC-BY-4.0)",
      }),
    )
    expect(Licences.Attachment.attachLicence).not.toHaveBeenCalled()
    await user.click(
      await screen.findByRole("button", { name: "Agree & attach" }),
    )

    await waitFor(() =>
      expect(Licences.Attachment.attachLicence).toHaveBeenCalledWith("p1", "CC-BY-4.0", "u1"),
    )
  })

  it("reveals software licences when the domain filter is widened", async () => {
    const user = userEvent.setup()
    renderRoute()

    await user.click(await screen.findByRole("button", { name: "Add licence" }))
    expect(screen.queryByText("GNU GPL v3")).not.toBeInTheDocument()

    // Each toggle counts what it would show, independent of what is selected:
    // the catalog holds one content/data licence and one software-only one.
    expect(
      screen.getByRole("button", { name: "content, 1 licence" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "data, 1 licence" }),
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole("button", { name: "software, 1 licence" }),
    )
    expect(await screen.findByText("GNU GPL v3")).toBeInTheDocument()
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

  // An attached licence has a View button on the page *and* a row in the
  // catalog drawer over it. The drawer is modal, so only one is ever in the
  // accessibility tree — but the names still have to differ, because a
  // querySelector-level click (or a future non-modal surface) sees both.
  it("names the catalog's View apart from the attached row's", async () => {
    const user = userEvent.setup()
    vi.mocked(Project.Queries.getProject).mockResolvedValue({
      ...detail,
      licenses: [attachedLicence],
    })
    vi.mocked(Licences.Catalog.listLicences).mockResolvedValue([
      catalogLicense,
      { ...catalogLicense, id: "CC-BY-4.0-legacy", status: "retired" },
    ])
    renderRoute()

    const onPage = "View Creative Commons Attribution 4.0"
    // CC-BY-4.0 is attached, so its catalog row offers Remove; the retired
    // alias is not, so that one still offers View.
    const inCatalog = "Remove Creative Commons Attribution 4.0 (CC-BY-4.0)"
    expect(await screen.findByRole("button", { name: onPage })).toBeVisible()

    await user.click(screen.getByRole("button", { name: "Add licence" }))
    expect(
      await screen.findByRole("button", { name: inCatalog }),
    ).toBeInTheDocument()
    // The catalog collides with itself too: a retired licence keeps the title
    // of the id that superseded it, so the id is what tells the rows apart.
    expect(
      screen.getByRole("button", {
        name: "View Creative Commons Attribution 4.0 (CC-BY-4.0-legacy)",
      }),
    ).toBeInTheDocument()

    // A string `name` is a whole-accessible-name match, so this does not also
    // pick up the catalog's longer label.
    expect(screen.queryByRole("button", { name: onPage })).not.toBeInTheDocument()
  })

  // Attached and agreed are separate states — the DB pairs agreed_at with
  // agreed_by, and `Licences.Attachment.agreeLicence` can settle an older attachment on its own.
  it("marks only agreed catalog rows as Agreed and detaches from the row", async () => {
    const user = userEvent.setup()
    vi.mocked(Licences.Attachment.detachLicence).mockResolvedValue()
    vi.mocked(Licences.Catalog.listLicences).mockResolvedValue([
      catalogLicense,
      { ...catalogLicense, id: "CC0-1.0", title: "CC0 Public Domain" },
    ])
    vi.mocked(Project.Queries.getProject).mockResolvedValue({
      ...detail,
      licenses: [
        attachedLicence,
        // Attached, never agreed — the pair is null together (FR-012).
        {
          ...attachedLicence,
          id: "CC0-1.0",
          title: "CC0 Public Domain",
          agreedAt: null,
          agreedBy: null,
        },
      ],
    })
    renderRoute()

    await user.click(await screen.findByRole("button", { name: "Add licence" }))
    const remove = await screen.findByRole("button", {
      name: "Remove Creative Commons Attribution 4.0 (CC-BY-4.0)",
    })
    const agreedRow = remove.closest("li") as HTMLElement
    const pendingRow = screen
      .getByRole("button", { name: "Remove CC0 Public Domain (CC0-1.0)" })
      .closest("li") as HTMLElement

    expect(within(agreedRow).getByText("Agreed")).toBeInTheDocument()
    expect(within(pendingRow).queryByText("Agreed")).not.toBeInTheDocument()

    await user.click(remove)
    await waitFor(() =>
      expect(Licences.Attachment.detachLicence).toHaveBeenCalledWith("p1", "CC-BY-4.0"),
    )
    expect(Licences.Attachment.detachLicence).toHaveBeenCalledTimes(1)
  })

  it("lists attached licences with agreement info and detaches one row only", async () => {
    const user = userEvent.setup()
    vi.mocked(Licences.Attachment.detachLicence).mockResolvedValue()
    vi.mocked(Project.Queries.getProject).mockResolvedValue({
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
    // The confirmation and its provenance are separate lines on the row's
    // trailing edge, so they are asserted separately.
    expect(screen.getAllByText("Agreed")).toHaveLength(2)
    expect(screen.getAllByText(/by Ada Researcher$/)).toHaveLength(2)

    const row = screen.getByText("CC0 Public Domain").closest("li") as HTMLElement
    await user.click(
      within(row).getByRole("button", { name: "Remove CC0 Public Domain" }),
    )
    await waitFor(() =>
      expect(Licences.Attachment.detachLicence).toHaveBeenCalledWith("p1", "CC0-1.0"),
    )
    expect(Licences.Attachment.detachLicence).toHaveBeenCalledTimes(1)
  })

  it("leads with a pending attachment and records the agreement", async () => {
    const user = userEvent.setup()
    vi.mocked(Licences.Attachment.agreeLicence).mockResolvedValue()
    vi.mocked(Project.Queries.getProject).mockResolvedValue({
      ...detail,
      licenses: [
        { ...attachedLicence, id: "CC0-1.0", title: "CC0 Public Domain" },
        // Attached but not yet agreed — the pair is null together (FR-012).
        { ...attachedLicence, agreedAt: null, agreedBy: null },
      ],
    })
    renderRoute()

    // Pending sorts ahead of agreed, whatever order the rows arrive in.
    const titles = (await screen.findAllByText(/Creative Commons|CC0/)).map(
      (node) => node.textContent,
    )
    expect(titles[0]).toContain("Creative Commons Attribution 4.0")

    await user.click(screen.getByRole("button", { name: "Review & Agree" }))
    await waitFor(() =>
      expect(Licences.Attachment.agreeLicence).toHaveBeenCalledWith("p1", "CC-BY-4.0", "u1"),
    )
  })

  it("hides the agreement control while the project is in review", async () => {
    vi.mocked(Project.Queries.getProject).mockResolvedValue({
      ...detail,
      status: "ready-for-review",
      licenses: [{ ...attachedLicence, agreedAt: null, agreedBy: null }],
    })
    renderRoute()

    // The title proves the pending card rendered — only its controls are gone.
    expect(
      await screen.findByText("Creative Commons Attribution 4.0"),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Review & Agree" }),
    ).not.toBeInTheDocument()
  })

  it("opens the licence text in a modal from the row's View control", async () => {
    const user = userEvent.setup()
    const detailLicence = { ...catalogLicense, fullText: "## Section 1" }
    vi.mocked(Licences.Catalog.getLicence).mockResolvedValue(detailLicence as never)
    vi.mocked(Licences.Text.resolveLicenceText).mockResolvedValue(
      "You are free to share and adapt.",
    )
    vi.mocked(Project.Queries.getProject).mockResolvedValue({
      ...detail,
      licenses: [attachedLicence],
    })
    renderRoute()

    // The control is hover-revealed, never unmounted, so it stays clickable.
    await user.click(
      await screen.findByRole("button", {
        name: "View Creative Commons Attribution 4.0",
      }),
    )
    expect(
      await screen.findByText("You are free to share and adapt."),
    ).toBeInTheDocument()
    expect(Licences.Catalog.getLicence).toHaveBeenCalledWith("CC-BY-4.0")
  })

  it("explains an unseeded catalog", async () => {
    const user = userEvent.setup()
    vi.mocked(Licences.Catalog.listLicences).mockResolvedValue([])
    renderRoute()

    await user.click(await screen.findByRole("button", { name: "Add licence" }))
    expect(
      await screen.findByText(/catalog has not been seeded/i),
    ).toBeInTheDocument()
  })

  // A stocked catalog that the filter empties is a different situation from an
  // unseeded one — the fix is a toggle, not a migration.
  it("distinguishes a filtered-empty catalog from an unseeded one", async () => {
    const user = userEvent.setup()
    vi.mocked(Licences.Catalog.listLicences).mockResolvedValue([softwareLicense])
    renderRoute()

    await user.click(await screen.findByRole("button", { name: "Add licence" }))
    expect(
      await screen.findByText(/no licence matches this filter/i),
    ).toBeInTheDocument()
    expect(
      screen.queryByText(/catalog has not been seeded/i),
    ).not.toBeInTheDocument()
  })
})

describe("corpus section (003)", () => {
  it("imports a corpus from the library and marks the imported one", async () => {
    const user = userEvent.setup()
    vi.mocked(Corpus.Documents.attachCorpusToProject).mockResolvedValue()
    renderRoute()

    await user.click(
      await screen.findByRole("button", { name: "Import corpus" }),
    )
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText("onkelos")).toBeInTheDocument()

    await user.click(within(dialog).getAllByRole("button", { name: "Import" })[0])
    await waitFor(() =>
      expect(Corpus.Documents.attachCorpusToProject).toHaveBeenCalledWith("p1", "d1"),
    )
  })

  it("points at the Corpus page when the library is empty", async () => {
    const user = userEvent.setup()
    vi.mocked(Corpus.Documents.listCorpusDocuments).mockResolvedValue([])
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
    vi.mocked(Corpus.Documents.detachCorpusFromProject).mockResolvedValue()
    vi.mocked(Project.Queries.getProject).mockResolvedValue({
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
      expect(Corpus.Documents.detachCorpusFromProject).toHaveBeenCalledWith("p1"),
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
    vi.mocked(Project.Mutations.setProjectOrganization).mockResolvedValue()
    renderRoute()

    await user.click(await screen.findByRole("button", { name: "Add organization" }))
    // A coss Select, not a native <select>: open the popup and pick the option.
    await user.click(await screen.findByLabelText("Organization"))
    await user.click(
      await screen.findByRole("option", { name: "Peshitta Institute" }),
    )
    await user.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() =>
      expect(Project.Mutations.setProjectOrganization).toHaveBeenCalledWith("p1", "o1"),
    )
  })

  it("creates an organization inline and assigns it", async () => {
    const user = userEvent.setup()
    vi.mocked(Organization.createOrganization).mockResolvedValue({
      id: "o2",
      name: "New Org",
      website: null,
    })
    vi.mocked(Project.Mutations.setProjectOrganization).mockResolvedValue()
    renderRoute()

    await user.click(await screen.findByRole("button", { name: "Add organization" }))
    await user.click(
      await screen.findByRole("button", { name: /create a new organization/i }),
    )
    await user.type(await screen.findByLabelText("Name"), "New Org")
    await user.click(screen.getByRole("button", { name: "Create & assign" }))

    await waitFor(() =>
      expect(Organization.createOrganization).toHaveBeenCalledWith(
        expect.objectContaining({ name: "New Org" }),
      ),
    )
    await waitFor(() =>
      expect(Project.Mutations.setProjectOrganization).toHaveBeenCalledWith("p1", "o2"),
    )
  })

  // The badge used to link out to the website. It now opens the organization
  // editor — the URL has its own row, so the link was the redundant one.
  it("opens the organization editor from the badge and links the website row", async () => {
    vi.mocked(Project.Queries.getProject).mockResolvedValue({
      ...detail,
      organization: {
        id: "o1",
        name: "Peshitta Institute",
        website: "https://peshitta.example",
      },
    })
    renderRoute()

    expect(
      await screen.findByRole("link", { name: "https://peshitta.example" }),
    ).toHaveAttribute("href", "https://peshitta.example")

    const badge = screen.getByRole("button", { name: "Edit organization" })
    // Invalid HTML otherwise: the remove control is a sibling of the badge.
    expect(badge.querySelector("button")).toBeNull()
  })

  it("removes the organization without deleting the project", async () => {
    const user = userEvent.setup()
    vi.mocked(Project.Mutations.setProjectOrganization).mockResolvedValue()
    vi.mocked(Project.Queries.getProject).mockResolvedValue({
      ...detail,
      organization: { id: "o1", name: "Peshitta Institute", website: null },
    })
    renderRoute()

    // The organization name is the edit affordance now; clearing happens by
    // picking "No organization" in the dialog.
    await user.click(
      await screen.findByRole("button", { name: "Edit organization" }),
    )
    await user.click(await screen.findByLabelText("Organization"))
    await user.click(
      await screen.findByRole("option", { name: "No organization" }),
    )
    await user.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() =>
      expect(Project.Mutations.setProjectOrganization).toHaveBeenCalledWith("p1", null),
    )
    expect(Project.Mutations.deleteProject).not.toHaveBeenCalled()
  })
})
