import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createRoutesStub } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  createCorpusDocument,
  deleteCorpusDocument,
  listCorpusDocuments,
  uploadCorpusFile,
} from "@/lib/corpus"
import type { CorpusDocument } from "@/lib/corpus"
import { extractCorpusHistory } from "@/lib/corpus-history"
import CorpusRoute, { clientAction, clientLoader } from "@/routes/corpus"

vi.mock("@/lib/corpus", () => ({
  listCorpusDocuments: vi.fn(),
  createCorpusDocument: vi.fn(),
  deleteCorpusDocument: vi.fn(),
  uploadCorpusFile: vi.fn(),
}))

vi.mock("@/lib/corpus-history", () => ({
  extractCorpusHistory: vi.fn(),
}))

const peshitta: CorpusDocument = {
  id: "d1",
  name: "peshitta",
  source: "upload",
  path: "d1/peshitta.corpus",
  filename: "peshitta.corpus",
  uploadedAt: "2026-07-10T00:00:00Z",
  commits: [
    {
      id: "cm1",
      sha: "a1b2c3d4e5f",
      message: "Initial import",
      authorName: "Ada",
      authorEmail: "ada@example.org",
      branch: "main",
      committedAt: "2026-07-01T00:00:00Z",
    },
  ],
}

function renderRoute() {
  const Stub = createRoutesStub([
    {
      path: "/corpus",
      Component: CorpusRoute,
      HydrateFallback: () => null,
      // biome-ignore lint: route module functions match at runtime
      loader: clientLoader as never,
      action: clientAction as never,
    },
  ])
  return render(<Stub initialEntries={["/corpus"]} />)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(listCorpusDocuments).mockResolvedValue([peshitta])
})

describe("/corpus library", () => {
  it("lists documents with their version history", async () => {
    renderRoute()
    expect(await screen.findByText("peshitta")).toBeInTheDocument()
    expect(screen.getByText("Initial import")).toBeInTheDocument()
    expect(screen.getByText(/ada · .* · main @ a1b2c3d/i)).toBeInTheDocument()
  })

  it("shows the empty state when nothing is uploaded", async () => {
    vi.mocked(listCorpusDocuments).mockResolvedValue([])
    renderRoute()
    expect(
      await screen.findByText("The corpus library is empty"),
    ).toBeInTheDocument()
  })

  it("uploads a .corpus file and records its extracted history", async () => {
    const user = userEvent.setup()
    const commits = [
      {
        sha: "a1b2c3d",
        message: "Initial import",
        authorName: "Ada",
        authorEmail: "ada@example.org",
        branch: "main",
        committedAt: "2026-07-01T00:00:00.000Z",
      },
    ]
    vi.mocked(extractCorpusHistory).mockResolvedValue(commits)
    vi.mocked(uploadCorpusFile).mockResolvedValue("d9/genesis.corpus")
    vi.mocked(createCorpusDocument).mockResolvedValue({
      ...peshitta,
      id: "d9",
    })
    renderRoute()

    const input = await screen.findByLabelText("Upload .corpus file")
    const file = new File(["zip-bytes"], "genesis.corpus", {
      type: "application/zip",
    })
    await user.upload(input, file)

    await waitFor(() =>
      expect(createCorpusDocument).toHaveBeenCalledWith({
        name: "genesis",
        source: "upload",
        path: "d9/genesis.corpus",
        filename: "genesis.corpus",
        commits,
      }),
    )
  })

  it("registers a Hugging Face corpus", async () => {
    const user = userEvent.setup()
    vi.mocked(createCorpusDocument).mockResolvedValue(peshitta)
    renderRoute()

    const input = await screen.findByLabelText("Hugging Face URL")
    await user.type(input, "https://huggingface.co/datasets/x/onkelos")
    await user.click(screen.getByRole("button", { name: "Add" }))

    await waitFor(() =>
      expect(createCorpusDocument).toHaveBeenCalledWith({
        name: "x/onkelos",
        source: "huggingface",
        path: "https://huggingface.co/datasets/x/onkelos",
        filename: null,
        commits: [],
      }),
    )
  })

  it("deletes a document after a confirmation step", async () => {
    const user = userEvent.setup()
    vi.mocked(deleteCorpusDocument).mockResolvedValue()
    renderRoute()

    await user.click(await screen.findByRole("button", { name: "Delete" }))
    expect(deleteCorpusDocument).not.toHaveBeenCalled()
    await user.click(screen.getByRole("button", { name: "Delete corpus" }))

    await waitFor(() => expect(deleteCorpusDocument).toHaveBeenCalledWith("d1"))
  })
})
