import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createRoutesStub } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { deleteCorpusDocument, getCorpusDocument } from "@/lib/corpus"
import type { CorpusDocument } from "@/lib/corpus"
import { isCorpusDetailData } from "@/components/breadcrumb/utils"
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

const summa: CorpusDocument = {
  id: "d2",
  name: "Summa Theologia (1200, ENG)",
  source: "upload",
  path: "conversions/d2/summa.xml",
  filename: "summa-theologia-1200-ENG.xml",
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

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getCorpusDocument).mockResolvedValue(summa)
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
    expect(screen.getByText("4.2 MB")).toBeInTheDocument()
    expect(screen.getByText("30,102")).toBeInTheDocument()
    expect(screen.getByText("613")).toBeInTheDocument()
    expect(screen.getByText("English")).toBeInTheDocument()
    // Source format shows twice: the header's format badge and the card row.
    expect(screen.getAllByText("text-fabric")).toHaveLength(2)
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
    const table = screen.getByRole("table")
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
  })

  it("opens the Documents reader from an Overview section row", async () => {
    const user = userEvent.setup()
    renderRoute()
    await user.click(await screen.findByRole("button", { name: "Prima Pars" }))
    expect(await screen.findByRole("heading", { name: "Prima Pars" })).toBeInTheDocument()
    expect(screen.getByRole("navigation", { name: "Section contents" })).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: /Quaestio 1/ }),
    ).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Documents" })).toHaveAttribute(
      "data-active",
    )
  })

  it("opens word details from a highlighted lemma", async () => {
    const user = userEvent.setup()
    renderRoute()
    await user.click(await screen.findByRole("button", { name: "Prima Pars" }))
    const tokens = await screen.findAllByRole("button", { name: "doctrina" })
    await user.click(tokens[0]!)
    expect(
      await screen.findByRole("heading", { name: "doctrina" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Morphology")).toBeInTheDocument()
    expect(screen.getByText("Nominative")).toBeInTheDocument()
  })

  it("renders structure, analytics, and activity from the explorer tabs", async () => {
    const user = userEvent.setup()
    renderRoute()
    await screen.findByRole("tab", { name: "Overview" })

    await user.click(screen.getByRole("tab", { name: "Structure" }))
    expect(
      await screen.findByRole("heading", { name: "Document hierarchy" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Expand Summa Theologia (1200, ENG)" }),
    ).toBeInTheDocument()
    expect(screen.queryByText("quaestio")).not.toBeInTheDocument()
    expect(screen.queryByText("Slot type")).not.toBeInTheDocument()

    await user.click(
      screen.getByRole("button", { name: "Expand Summa Theologia (1200, ENG)" }),
    )
    expect(await screen.findByText("Prima Pars")).toBeInTheDocument()
    expect(screen.getByText("Supplementum")).toBeInTheDocument()
    // Children of the corpus are the two toc books, not a corpus-wide type total.
    expect(screen.getByText("2")).toBeInTheDocument()
    expect(screen.getByText("119")).toBeInTheDocument()
    expect(screen.queryByText("234,175")).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Expand Prima Pars" }))
    expect(
      await screen.findByRole("status", { name: "Loading children" }),
    ).toBeInTheDocument()
    expect(await screen.findByText("Q.1 · Sacred doctrine")).toBeInTheDocument()
    expect(screen.queryByText("Slot type")).not.toBeInTheDocument()

    await user.click(screen.getByRole("tab", { name: "Analytics" }))
    expect(
      await screen.findByRole("heading", { name: "Nodes by type" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Words per document")).toBeInTheDocument()
    expect(screen.getByText("65.8 %")).toBeInTheDocument()

    await user.click(screen.getByRole("tab", { name: "Activity" }))
    expect(
      await screen.findByRole("heading", { name: "Version history" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Conversion succeeded")).toBeInTheDocument()
    expect(screen.getByText("Initial upload")).toBeInTheDocument()
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
