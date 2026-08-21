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
import { readCorpusArchive } from "@/lib/corpus-archive"
import { runConversion } from "@/lib/corpus-convert"
import type { ConversionEntry, ConversionLog } from "@/lib/corpus-convert"
import { extractCorpusHistory } from "@/lib/corpus-history"
import { AppLayout } from "@/components/layouts/app-layout"
import CorpusRoute, { clientAction, clientLoader } from "@/routes/corpus/index"

vi.mock("@/lib/corpus", () => ({
  listCorpusDocuments: vi.fn(),
  createCorpusDocument: vi.fn(),
  deleteCorpusDocument: vi.fn(),
  getCorpusDocument: vi.fn(),
  uploadCorpusFile: vi.fn(),
}))

// Only the transport is scripted; the pure derivations stay real so the
// drawer renders exactly what a real run would.
vi.mock("@/lib/corpus-convert", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/corpus-convert")>()),
  runConversion: vi.fn(),
}))

vi.mock("@/lib/corpus-archive", () => ({
  readCorpusArchive: vi.fn(),
}))

vi.mock("@/lib/corpus-history", () => ({
  extractCorpusHistory: vi.fn(),
  fetchHuggingFaceHistory: vi.fn(),
}))

type Outcome = "queued" | "ready" | "error"

/** Instant scripted transport walking the entry to the given outcome. */
function scriptConversion(outcome: Outcome) {
  vi.mocked(runConversion).mockImplementation(async (_file, initial, onChange) => {
    let entry = initial
    const emit = (patch: Partial<ConversionEntry>, log?: ConversionLog) => {
      entry = {
        ...entry,
        ...patch,
        logs: log ? [...entry.logs, log] : entry.logs,
      }
      onChange(entry)
    }
    emit(
      { status: "uploading" },
      { step: "receive", text: `> ${entry.name}`, tone: "info" },
    )
    emit({ jobId: "j1" })
    emit(
      { status: "queued" },
      { step: "validate", text: "> Parsing nodes…", tone: "info" },
    )
    if (outcome === "queued") return entry
    emit(
      { status: "converting" },
      { step: "convert", text: "> Building dataset…", tone: "info" },
    )
    if (outcome === "error") {
      emit(
        { status: "error", error: "IndexError — job j1", finishedAt: Date.now() },
        { step: "convert", text: "✗ IndexError — job j1", tone: "error" },
      )
      return entry
    }
    emit({ status: "validating", validation: { status: "running" } })
    emit(
      {
        status: "ready",
        finishedAt: Date.now(),
        validation: { status: "valid", stats: { max_slot: 30_102 } },
        corpusName: entry.name.replace(/\.[^.]+$/, ".corpus"),
        corpusSize: entry.size,
        corpusBlob: new Blob(["corpus-bytes"]),
      },
      {
        step: "index",
        text: "✓ Archive downloaded — corpus ready",
        tone: "success",
      },
    )
    return entry
  })
}

function doc(overrides: Partial<CorpusDocument> = {}): CorpusDocument {
  return {
    id: "d1",
    name: "peshitta",
    source: "upload",
    path: "d1/peshitta.corpus",
    filename: "peshitta.corpus",
    uploadedAt: "2026-07-10T00:00:00Z",
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
    commits: [],
    ...overrides,
  }
}

const peshitta = doc({
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
})

const septuagint = doc({
  id: "d2",
  name: "septuagint",
  corpusType: "text",
  sourceFormat: "text-fabric",
  licence: "CC BY-SA 4.0",
  language: "Greek",
  sizeBytes: 42_100_000,
  docsCount: 53,
  status: "converted",
  convertedAt: "2026-07-28T00:00:00Z",
  description: null,
  toc: null,
})

function renderRoute() {
  // The conversion pill, the Convert/Upload actions, and the conversion
  // panel render from the app layout, so the route mounts inside it.
  const Stub = createRoutesStub([
    {
      Component: AppLayout,
      HydrateFallback: () => null,
      children: [
        {
          path: "/corpus",
          Component: CorpusRoute,
          HydrateFallback: () => null,
          // biome-ignore lint: route module functions match at runtime
          loader: clientLoader as never,
          action: clientAction as never,
        },
      ],
    },
  ])
  return render(<Stub initialEntries={["/corpus"]} />)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(listCorpusDocuments).mockResolvedValue([peshitta, septuagint])
})

describe("/corpus library", () => {
  it("lists documents in the table with their metadata", async () => {
    renderRoute()
    expect(await screen.findByText("peshitta")).toBeInTheDocument()
    expect(screen.getByText("septuagint")).toBeInTheDocument()
    // Converted metadata renders; legacy rows degrade to fallbacks.
    expect(screen.getByText("text-fabric · CC BY-SA 4.0")).toBeInTheDocument()
    expect(screen.getByText(".corpus · No licence")).toBeInTheDocument()
    expect(screen.getByText("Text")).toBeInTheDocument()
    expect(screen.getByText("Greek")).toBeInTheDocument()
    expect(screen.getByText("40.1 MB")).toBeInTheDocument()
    expect(screen.getByText("2 corpuses")).toBeInTheDocument()
  })

  it("links each row to its detail page", async () => {
    renderRoute()
    const link = await screen.findByRole("link", { name: "septuagint" })
    expect(link).toHaveAttribute("href", "/corpus/d2")
  })

  it("shows the empty state when nothing is uploaded", async () => {
    vi.mocked(listCorpusDocuments).mockResolvedValue([])
    renderRoute()
    expect(
      await screen.findByText("The corpus library is empty"),
    ).toBeInTheDocument()
  })

  it("filters rows by the search query", async () => {
    const user = userEvent.setup()
    renderRoute()

    await user.type(await screen.findByLabelText("Search corpuses"), "sept")
    expect(screen.getByText("septuagint")).toBeInTheDocument()
    expect(screen.queryByText("peshitta")).not.toBeInTheDocument()
    expect(screen.getByText("1 corpus")).toBeInTheDocument()
  })

  it("shows a no-results message when filters exclude everything", async () => {
    const user = userEvent.setup()
    renderRoute()

    await user.type(
      await screen.findByLabelText("Search corpuses"),
      "does-not-exist",
    )
    expect(
      screen.getByText("No corpuses match the current filters."),
    ).toBeInTheDocument()
  })

  it("paginates past six documents", async () => {
    vi.mocked(listCorpusDocuments).mockResolvedValue(
      Array.from({ length: 8 }, (_, i) =>
        doc({ id: `p${i}`, name: `corpus-${i}` }),
      ),
    )
    const user = userEvent.setup()
    renderRoute()

    expect(await screen.findByText("corpus-0")).toBeInTheDocument()
    expect(screen.getByText("Showing 1–6 of 8 corpuses")).toBeInTheDocument()
    expect(screen.queryByText("corpus-7")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Prev" })).toBeDisabled()

    await user.click(screen.getByRole("button", { name: "Next" }))
    expect(screen.getByText("corpus-7")).toBeInTheDocument()
    expect(screen.queryByText("corpus-0")).not.toBeInTheDocument()
    expect(screen.getByText("Showing 7–8 of 8 corpuses")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled()
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
    vi.mocked(createCorpusDocument).mockResolvedValue(doc({ id: "d9" }))
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

  it("shows the running pill and the drawer while a conversion is in flight", async () => {
    const user = userEvent.setup()
    scriptConversion("queued")
    renderRoute()

    const input = await screen.findByLabelText("Convert source file")
    await user.upload(
      input,
      new File(["<xml/>"], "summa.xml", { type: "text/xml" }),
    )

    // The drawer opens itself; Base UI marks the page behind it aria-hidden,
    // so assertions here go by text, never by role (and never a bare
    // role="status" — the active step's Spinner is one).
    expect(
      (await screen.findAllByText("Converting")).length,
    ).toBeGreaterThan(0)
    expect(screen.getByText("summa.xml · Step 2 of 4")).toBeInTheDocument()
    expect(screen.getByText("Validating source")).toBeInTheDocument()
    expect(screen.getByText("In progress")).toBeInTheDocument()
    expect(screen.getByText("> Parsing nodes…")).toBeInTheDocument()
    // The pill in the (aria-hidden) header behind the drawer.
    expect(document.body.textContent).toContain("Converting summa.xml")
    expect(document.body.textContent).toContain("Step 2 of 4")
  })

  it("persists a finished conversion with the archive's own metadata", async () => {
    const user = userEvent.setup()
    scriptConversion("ready")
    const commits = [
      {
        sha: "a1b2c3d",
        message: "Initial import",
        authorName: "Ada",
        authorEmail: null,
        branch: "main",
        committedAt: "2026-08-01T00:00:00.000Z",
      },
    ]
    vi.mocked(readCorpusArchive).mockResolvedValue({
      name: "Summa Theologia",
      description: "The Summa, converted from TEI.",
      language: "English",
      corpusType: "text",
      version: "1.0",
      sections: [{ title: "Prima Pars", nodes: 8442, words: 312004 }],
    })
    vi.mocked(extractCorpusHistory).mockResolvedValue(commits)
    vi.mocked(uploadCorpusFile).mockResolvedValue("d9/summa.corpus")
    vi.mocked(createCorpusDocument).mockResolvedValue(doc({ id: "d9" }))
    renderRoute()

    const input = await screen.findByLabelText("Convert source file")
    await user.upload(
      input,
      new File(["<xml/>"], "summa.xml", { type: "text/xml" }),
    )

    await waitFor(() =>
      expect(createCorpusDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Summa Theologia",
          source: "upload",
          path: "d9/summa.corpus",
          filename: "summa.corpus",
          sourceFormat: "tei",
          corpusType: "text",
          language: "English",
          description: "The Summa, converted from TEI.",
          toc: [{ title: "Prima Pars", nodes: 8442, words: 312004 }],
          nodes: 30_102,
          status: "converted",
          commits,
        }),
      ),
    )
    // The stored archive is the downloaded blob, renamed .corpus.
    const stored = vi.mocked(uploadCorpusFile).mock.calls[0][0]
    expect(stored.name).toBe("summa.corpus")
    expect(await screen.findByText("Conversion complete")).toBeInTheDocument()
    // Both the header pill's link and the file card's link target the
    // persisted row (the panel no longer aria-hides the header behind it).
    const links = await screen.findAllByRole("link", { name: "View corpus" })
    expect(links).toHaveLength(2)
    for (const link of links) {
      expect(link).toHaveAttribute("href", "/corpus/d9")
    }
    expect(document.body.textContent).toContain("summa.xml converted")
  })

  it("marks the failed step and reruns the pipeline on Retry", async () => {
    const user = userEvent.setup()
    scriptConversion("error")
    renderRoute()

    const input = await screen.findByLabelText("Convert source file")
    await user.upload(
      input,
      new File(["<xml/>"], "summa-fail.xml", { type: "text/xml" }),
    )

    expect(await screen.findByText("Conversion failed")).toBeInTheDocument()
    expect(screen.getByText("✗ IndexError — job j1")).toBeInTheDocument()
    expect(
      screen.getByText("Conversion failed. See the failed step above."),
    ).toBeInTheDocument()
    expect(createCorpusDocument).not.toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: "Retry" }))
    await waitFor(() => expect(runConversion).toHaveBeenCalledTimes(2))
  })

  it("deletes a document after a confirmation step", async () => {
    const user = userEvent.setup()
    vi.mocked(listCorpusDocuments).mockResolvedValue([peshitta])
    vi.mocked(deleteCorpusDocument).mockResolvedValue()
    renderRoute()

    await user.click(await screen.findByRole("button", { name: "Delete" }))
    expect(deleteCorpusDocument).not.toHaveBeenCalled()

    // Gated until DELETE is typed.
    const confirm = screen.getByRole("button", { name: "Delete corpus" })
    expect(confirm).toBeDisabled()
    await user.type(screen.getByRole("textbox"), "DELETE")
    expect(confirm).toBeEnabled()
    await user.click(confirm)

    await waitFor(() => expect(deleteCorpusDocument).toHaveBeenCalledWith("d1"))
  })

  it("refuses to delete a document until DELETE is typed exactly", async () => {
    const user = userEvent.setup()
    vi.mocked(listCorpusDocuments).mockResolvedValue([peshitta])
    vi.mocked(deleteCorpusDocument).mockResolvedValue()
    renderRoute()

    await user.click(await screen.findByRole("button", { name: "Delete" }))
    const confirm = screen.getByRole("button", { name: "Delete corpus" })

    // Wrong case must not unlock it — the friction is the point.
    await user.type(screen.getByRole("textbox"), "delete")
    expect(confirm).toBeDisabled()

    await user.clear(screen.getByRole("textbox"))
    await user.type(screen.getByRole("textbox"), "DELET")
    expect(confirm).toBeDisabled()

    expect(deleteCorpusDocument).not.toHaveBeenCalled()
  })
})
