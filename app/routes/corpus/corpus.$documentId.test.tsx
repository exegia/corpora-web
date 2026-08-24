import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createRoutesStub } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { isCorpusDetailData } from "@/components/breadcrumb/utils"
import {
  fetchCorpusContent,
  fetchCorpusNode,
  fetchCorpusVersions,
  loadCorpusArchive,
} from "@/lib/corpora-api"
import { deleteCorpusDocument, getCorpusDocument } from "@/lib/corpus"
import type { CorpusDocument } from "@/lib/corpus"
import CorpusDetailRoute, {
  clientAction,
  clientLoader,
} from "@/routes/corpus/corpus.$documentId"

vi.mock("@/lib/corpus", () => ({
  listCorpusDocuments: vi.fn(),
  createCorpusDocument: vi.fn(),
  deleteCorpusDocument: vi.fn(),
  getCorpusDocument: vi.fn(),
  uploadCorpusFile: vi.fn(),
}))

vi.mock("@/lib/corpora-api", () => ({
  loadCorpusArchive: vi.fn(async () => null),
  fetchCorpusContent: vi.fn(),
  fetchCorpusNode: vi.fn(),
  fetchCorpusSections: vi.fn(),
  fetchCorpusVersions: vi.fn(async () => ({ versions: [] })),
  downloadExploreCorpus: vi.fn(),
  downloadStoredCorpus: vi.fn(),
}))

const summa: CorpusDocument = {
  id: "d2",
  name: "Summa Theologia (1200, ENG)",
  source: "upload",
  path: "conversions/d2/summa.xml",
  filename: "summa-theologiae.corpus",
  jobId: "j-summa",
  uploadedAt: "2026-08-08T13:10:00Z",
  corpusType: "text",
  sourceFormat: "text-fabric",
  licence: "CC BY-SA 4.0",
  language: "English",
  sizeBytes: 4_400_000,
  docsCount: 613,
  nodes: 30_102,
  words: 1_135_799,
  status: "converted",
  convertedAt: "2026-08-08T13:14:00Z",
  description: "The Summa, converted from TEI.",
  toc: [
    { title: "Prima Pars", nodes: 8442, words: 312004 },
    { title: "Supplementum", nodes: 997, words: null },
  ],
  commits: [],
}

function renderRoute() {
  const Stub = createRoutesStub([
    {
      path: "/corpus/:documentId",
      Component: CorpusDetailRoute,
      HydrateFallback: () => null,
      // biome-ignore lint: route module functions match at runtime
      loader: clientLoader as never,
      action: clientAction as never,
    },
    {
      path: "/corpus",
      Component: () => <p>Back at the library</p>,
    },
  ])
  return render(<Stub initialEntries={["/corpus/d2"]} />)
}

const hubIndex = {
  toc: null,
  sections: {
    levels: ["book", "chapter"],
    items: [
      {
        title: "Prima Pars",
        ref: "Prima Pars",
        child_count: 1,
        nodes: 8442,
        words: 312004,
        children: [{ title: "Q.1", ref: "Prima Pars, Q.1" }],
      },
    ],
  },
  node_types: [
    { type: "word", count: 80, avg_slots: 1, is_slot: true },
    { type: "clause", count: 20, avg_slots: 4, is_slot: false },
  ],
}

const jobArchive = {
  kind: "job" as const,
  key: "j-summa",
  index: hubIndex,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getCorpusDocument).mockResolvedValue(summa)
  vi.mocked(loadCorpusArchive).mockResolvedValue(null)
  vi.mocked(fetchCorpusVersions).mockResolvedValue({ versions: [] })
})

describe("/corpus/:documentId detail", () => {
  it("renders the header and details card from the loaded document", async () => {
    renderRoute()
    expect(
      await screen.findByRole("heading", { name: "Summa Theologia (1200, ENG)" }),
    ).toBeInTheDocument()
    expect(screen.getByText("converted")).toBeInTheDocument()
    expect(
      screen.getByText("The Summa, converted from TEI."),
    ).toBeInTheDocument()
    // Details sit behind the deferred Hub archive <Await>.
    expect(await screen.findByText("4.2 MB")).toBeInTheDocument()
    expect(screen.getByText("30,102")).toBeInTheDocument()
    expect(screen.getByText("613")).toBeInTheDocument()
    expect(screen.getByText("English")).toBeInTheDocument()
    // Header file type is .corpus; source format stays on the details card.
    expect(screen.getByText(".corpus")).toBeInTheDocument()
    expect(screen.getByText("text-fabric")).toBeInTheDocument()
    // Header + details card both open the licence sheet.
    const licenceTriggers = screen.getAllByRole("button", { name: "CC BY-SA 4.0" })
    expect(licenceTriggers.length).toBeGreaterThanOrEqual(1)
    expect(licenceTriggers[0]).toHaveAttribute("data-slot", "sheet-trigger")
  })

  it("shows the Overview sections and enables the explorer tabs", async () => {
    renderRoute()
    expect(await screen.findByRole("tab", { name: "Overview" })).toBeEnabled()
    for (const name of ["Documents", "Structure", "Analytics", "Activity"]) {
      expect(screen.getByRole("tab", { name })).toBeEnabled()
      expect(screen.getByRole("tab", { name })).not.toHaveAttribute("data-disabled")
    }
    const table = await screen.findByRole("table")
    expect(table).toHaveTextContent("Prima Pars")
    expect(table).toHaveTextContent("8,442")
    expect(table).toHaveTextContent("312,004")
    expect(table).toHaveTextContent("Supplementum")
  })

  it("shows an explicit empty state for rows without section data", async () => {
    vi.mocked(getCorpusDocument).mockResolvedValue({ ...summa, toc: null })
    renderRoute()
    expect(
      await screen.findByText("No section data was captured for this corpus."),
    ).toBeInTheDocument()
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })

  it("renders a not-found state when the document is gone", async () => {
    vi.mocked(getCorpusDocument).mockResolvedValue(null)
    renderRoute()
    expect(
      await screen.findByText("This corpus no longer exists"),
    ).toBeInTheDocument()
  })

  it("keeps the breadcrumb contract: loader returns a `document` key", async () => {
    const data = await clientLoader({
      params: { documentId: "d2" },
      request: new Request("http://localhost/corpus/d2"),
      context: {},
    } as never)
    expect(isCorpusDetailData(data)).toBe(true)
    expect(data.document?.name).toBe("Summa Theologia (1200, ENG)")
    expect(await data.archive).toBeNull()
  })

  it("fills Overview and Analytics from a conversion job when toc is empty", async () => {
    const user = userEvent.setup()
    vi.mocked(getCorpusDocument).mockResolvedValue({ ...summa, toc: null })
    vi.mocked(loadCorpusArchive).mockResolvedValue(jobArchive)
    renderRoute()
    const table = await screen.findByRole("table")
    expect(table).toHaveTextContent("Prima Pars")
    expect(
      screen.queryByText("No section data was captured for this corpus."),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole("tab", { name: "Analytics" }))
    expect(
      await screen.findByRole("heading", { name: "Nodes by type" }),
    ).toBeInTheDocument()
    expect(screen.getByText("80 %")).toBeInTheDocument()
    expect(screen.queryByText("65.8 %")).not.toBeInTheDocument()
  })

  it("reads job passages when opening a section from a conversion result", async () => {
    const user = userEvent.setup()
    vi.mocked(loadCorpusArchive).mockResolvedValue(jobArchive)
    vi.mocked(fetchCorpusContent).mockResolvedValue({
      ref: "Prima Pars, Q.1",
      format: "text-orig-full",
      passages: [{ ref: "p1", text: "Sic venit doctrina", node: 9 }],
      total: 1,
      offset: 0,
      limit: 20,
      next_offset: null,
    })
    renderRoute()
    await user.click(await screen.findByRole("button", { name: "Prima Pars" }))
    expect(
      await screen.findByRole("heading", { name: "Prima Pars" }),
    ).toBeInTheDocument()
    expect(await screen.findByRole("button", { name: "Q.1" })).toBeInTheDocument()
    expect(await screen.findByRole("button", { name: "Sic" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "doctrina" })).toBeInTheDocument()
    expect(fetchCorpusContent).toHaveBeenCalledWith(jobArchive, {
      ref: "Prima Pars, Q.1",
      limit: 20,
    })
  })

  it("opens the Documents reader from an Overview section row", async () => {
    const user = userEvent.setup()
    renderRoute()
    await user.click(await screen.findByRole("button", { name: "Prima Pars" }))
    expect(await screen.findByRole("heading", { name: "Prima Pars" })).toBeInTheDocument()
    expect(
      await screen.findByText(
        "No live archive is available for this corpus yet.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Documents" })).toHaveAttribute(
      "data-active",
    )
  })

  it("opens word details from a job slot node", async () => {
    const user = userEvent.setup()
    vi.mocked(loadCorpusArchive).mockResolvedValue(jobArchive)
    vi.mocked(fetchCorpusContent).mockResolvedValue({
      ref: "Prima Pars, Q.1",
      format: "text-orig-full",
      passages: [{ ref: "p1", text: "Sic venit doctrina", node: 9 }],
      total: 1,
      offset: 0,
      limit: 20,
      next_offset: null,
    })
    vi.mocked(fetchCorpusNode)
      .mockResolvedValueOnce({
        node: 9,
        otype: "verse",
        is_slot: false,
        slot_type: "word",
        first_slot: 1,
        last_slot: 3,
        section_ref: "Prima Pars, Q.1",
        text: "Sic venit doctrina",
        features: {},
        annotation: null,
        node_types: ["verse", "word"],
      })
      .mockResolvedValueOnce({
        node: 3,
        otype: "word",
        is_slot: true,
        slot_type: "word",
        first_slot: 3,
        last_slot: 3,
        section_ref: "Prima Pars, Q.1",
        text: "doctrina",
        features: {
          lemma: "doctrina",
          sp: "Noun",
          case: "Nominative",
          gn: "f",
          nu: "sg",
        },
        annotation: null,
        node_types: ["word"],
      })
    renderRoute()
    await user.click(await screen.findByRole("button", { name: "Prima Pars" }))
    await user.click(await screen.findByRole("button", { name: "doctrina" }))
    expect(
      await screen.findByRole("heading", { name: "doctrina" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Morphology")).toBeInTheDocument()
    expect(screen.getByText("Nominative")).toBeInTheDocument()
    expect(fetchCorpusNode).toHaveBeenCalledWith(jobArchive, 9)
    expect(fetchCorpusNode).toHaveBeenCalledWith(jobArchive, 3)
  })

  it("inspects a word from passage tokens without guessing slots", async () => {
    const user = userEvent.setup()
    vi.mocked(loadCorpusArchive).mockResolvedValue(jobArchive)
    vi.mocked(fetchCorpusContent).mockResolvedValue({
      ref: "Prima Pars, Q.1",
      format: "text-orig-full",
      passages: [
        {
          ref: "p1",
          text: "Sic venit doctrina",
          node: 9,
          tokens: [
            { text: "Sic", after: " ", node: 1 },
            { text: "venit", after: " ", node: 2 },
            { text: "doctrina", after: "", node: 3 },
          ],
        },
      ],
      total: 1,
      offset: 0,
      limit: 20,
      next_offset: null,
    })
    vi.mocked(fetchCorpusNode).mockResolvedValue({
      node: 3,
      otype: "word",
      is_slot: true,
      slot_type: "word",
      first_slot: 3,
      last_slot: 3,
      section_ref: "Prima Pars, Q.1",
      text: "doctrina",
      features: { lemma: "doctrina", sp: "Noun" },
      annotation: null,
      node_types: ["word"],
      context: [{ node: 9, otype: "question", ref: "Q.1" }],
      occurrences: 12,
      occurrences_in_section: 2,
    })
    renderRoute()
    await user.click(await screen.findByRole("button", { name: "Prima Pars" }))
    await user.click(await screen.findByRole("button", { name: "doctrina" }))
    expect(
      await screen.findByRole("heading", { name: "doctrina" }),
    ).toBeInTheDocument()
    expect(screen.getByText(/12 in corpus/)).toBeInTheDocument()
    expect(fetchCorpusNode).toHaveBeenCalledTimes(1)
    expect(fetchCorpusNode).toHaveBeenCalledWith(jobArchive, 3)
  })

  it("renders structure, analytics, and activity from the explorer tabs", async () => {
    const user = userEvent.setup()
    renderRoute()
    await screen.findByRole("tab", { name: "Overview" })

    await user.click(screen.getByRole("tab", { name: "Structure" }))
    expect(
      await screen.findByText(
        "No live archive is available for this corpus yet.",
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("heading", { name: "Document hierarchy" }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole("tab", { name: "Analytics" }))
    expect(
      await screen.findByRole("heading", { name: "Nodes by type" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Words per document")).toBeInTheDocument()
    expect(
      screen.getAllByText(
        "No node-type counts were published for this corpus.",
      ).length,
    ).toBeGreaterThan(0)
    expect(screen.queryByText("65.8 %")).not.toBeInTheDocument()

    await user.click(screen.getByRole("tab", { name: "Activity" }))
    expect(
      await screen.findByRole("heading", { name: "Version history" }),
    ).toBeInTheDocument()
    expect(screen.getByText("No version history yet.")).toBeInTheDocument()
    expect(screen.queryByText("v1.1")).not.toBeInTheDocument()
    expect(screen.queryByText("Initial upload")).not.toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Activity" })).toBeInTheDocument()
    expect(screen.getByText("Conversion succeeded")).toBeInTheDocument()
    expect(screen.getByText("Upload received")).toBeInTheDocument()
  })

  it("renders Activity versions from the archive API, not minted labels", async () => {
    const user = userEvent.setup()
    vi.mocked(loadCorpusArchive).mockResolvedValue(jobArchive)
    vi.mocked(fetchCorpusVersions).mockResolvedValue({
      versions: [
        {
          id: "v1",
          label: "v1.0",
          title: "Converted",
          at: "2026-08-08T13:14:00Z",
          current: true,
          files: [{ path: "manifest.yml", kind: "added" }],
          author: { sub: "u1", name: "Ada" },
        },
      ],
    })
    renderRoute()
    await user.click(await screen.findByRole("tab", { name: "Activity" }))
    expect(
      await screen.findByRole("heading", { name: "Version history" }),
    ).toBeInTheDocument()
    expect(await screen.findByText("v1.0")).toBeInTheDocument()
    expect(screen.getByText("manifest.yml")).toBeInTheDocument()
    expect(screen.getByText("Ada")).toBeInTheDocument()
    expect(screen.queryByText("Initial upload")).not.toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Activity" })).toBeInTheDocument()
    expect(screen.getByText("Upload received")).toBeInTheDocument()
  })

  it("expands the structure tree from the job index", async () => {
    const user = userEvent.setup()
    vi.mocked(loadCorpusArchive).mockResolvedValue(jobArchive)
    renderRoute()
    await user.click(await screen.findByRole("tab", { name: "Structure" }))
    expect(
      await screen.findByRole("heading", { name: "Document hierarchy" }),
    ).toBeInTheDocument()
    await user.click(
      screen.getByRole("button", { name: "Expand Summa Theologia (1200, ENG)" }),
    )
    expect(await screen.findByText("Prima Pars")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Expand Prima Pars" }))
    expect(await screen.findByText("Q.1")).toBeInTheDocument()
  })

  it("deletes after the DELETE gate and redirects to the library", async () => {
    const user = userEvent.setup()
    vi.mocked(deleteCorpusDocument).mockResolvedValue()
    renderRoute()

    await user.click(await screen.findByRole("button", { name: "Delete" }))
    const confirm = screen.getByRole("button", { name: "Delete corpus" })
    expect(confirm).toBeDisabled()
    await user.type(screen.getByRole("textbox"), "DELETE")
    await user.click(confirm)

    await waitFor(() => expect(deleteCorpusDocument).toHaveBeenCalledWith("d2"))
    expect(await screen.findByText("Back at the library")).toBeInTheDocument()
  })
})
