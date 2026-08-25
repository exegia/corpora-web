import type { ReactElement } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createRoutesStub } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ShellPanelsContext } from "@/components/layouts/shell-panels"
import type { CorpusDocument } from "@/lib/corpus"
import DetailsCard from "./details-card"

const panels = {
  openPanel: vi.fn(),
  setOpen: vi.fn(),
  resizePanel: vi.fn(),
}

function renderCard(ui: ReactElement) {
  const Stub = createRoutesStub([
    {
      path: "/",
      Component: () => (
        <ShellPanelsContext.Provider value={panels as never}>
          {ui}
        </ShellPanelsContext.Provider>
      ),
      HydrateFallback: () => null,
    },
  ])
  return render(<Stub initialEntries={["/"]} />)
}

const document: CorpusDocument = {
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
  toc: [],
  commits: [],
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("DetailsCard", () => {
  it("shows the corpus title and description", () => {
    renderCard(<DetailsCard document={document} />)
    expect(screen.getByText("Title")).toBeInTheDocument()
    expect(screen.getByText("Summa Theologia (1200, ENG)")).toBeInTheDocument()
    expect(screen.getByText("Description")).toBeInTheDocument()
    expect(
      screen.getByText("The Summa, converted from TEI."),
    ).toBeInTheDocument()
  })

  it("renders an Edit button that opens the right panel", async () => {
    const user = userEvent.setup()
    renderCard(<DetailsCard document={document} />)
    const edit = screen.getByRole("button", { name: "Edit" })
    expect(edit).toBeInTheDocument()
    await user.click(edit)
    expect(panels.resizePanel).toHaveBeenCalledWith(468)
    expect(panels.openPanel).toHaveBeenCalledWith("right", expect.anything())
  })
})
