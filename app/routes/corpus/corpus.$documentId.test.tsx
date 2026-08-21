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
    expect(screen.getByText("XML")).toBeInTheDocument()
    expect(screen.getByText("converted")).toBeInTheDocument()
    expect(
      screen.getByText("The Summa, converted from TEI."),
    ).toBeInTheDocument()
    expect(screen.getByText("4.2 MB")).toBeInTheDocument()
    expect(screen.getByText("30,102")).toBeInTheDocument()
    expect(screen.getByText("613")).toBeInTheDocument()
    expect(screen.getByText("English")).toBeInTheDocument()
    expect(screen.getByText("text-fabric")).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "CC BY-SA 4.0" }),
    ).toHaveAttribute("href", "/licenses")
  })

  it("shows the Overview sections and disables the undesigned tabs", async () => {
    renderRoute()
    expect(await screen.findByRole("tab", { name: "Overview" })).toBeEnabled()
    for (const name of ["Documents", "Structure", "Activity"]) {
      // Base UI disables tabs via data-disabled, not the disabled attribute.
      expect(screen.getByRole("tab", { name })).toHaveAttribute("data-disabled")
    }
    // Sections come from the toc captured at conversion time.
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
