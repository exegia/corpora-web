import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fetchCorpusVersions } from "@/lib/corpora-api"
import type { CorpusArchive, CorpusVersion, VersionsResponse } from "@/lib/corpora-api"
import type { CorpusDocument } from "@/lib/corpus"
import Activity from "./activity"

vi.mock("@/lib/corpora-api", () => ({
  fetchCorpusVersions: vi.fn(async () => ({ versions: [] })),
}))

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

const archive: CorpusArchive = {
  kind: "job",
  key: "j-summa",
  index: { toc: null, sections: null, node_types: [] },
}

beforeEach(() => {
  vi.mocked(fetchCorpusVersions).mockReset()
  vi.mocked(fetchCorpusVersions).mockResolvedValue({ versions: [] })
})

describe("Activity", () => {
  it("shows an empty Version history when there is no archive, not minted labels", () => {
    render(<Activity archive={null} document={document} />)
    expect(
      screen.getByRole("heading", { name: "Version history" }),
    ).toBeInTheDocument()
    expect(screen.getByText("No version history yet.")).toBeInTheDocument()
    expect(screen.queryByText("v1.1")).not.toBeInTheDocument()
    expect(screen.queryByText("Initial upload")).not.toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Activity" })).toBeInTheDocument()
    expect(screen.getByText("Conversion succeeded")).toBeInTheDocument()
    expect(screen.getByText("Upload received")).toBeInTheDocument()
  })

  it("renders API versions with files, author, and approver", async () => {
    const version: CorpusVersion = {
      id: "v1",
      label: "v1.0",
      title: "Converted",
      at: "2026-08-08T13:14:00Z",
      current: true,
      notes: ["Initial package"],
      files: [{ path: "manifest.yml", kind: "added" }],
      author: { sub: "u1", name: "Ada" },
      approved_by: { sub: "u2", name: "Grace" },
    }
    let resolve!: (body: VersionsResponse) => void
    vi.mocked(fetchCorpusVersions).mockReturnValue(
      new Promise((next) => {
        resolve = next
      }),
    )
    render(<Activity archive={archive} document={document} />)
    expect(
      screen.getByRole("status", { name: "Loading version history" }),
    ).toBeInTheDocument()
    resolve({ versions: [version] })
    expect(await screen.findByText("v1.0")).toBeInTheDocument()
    expect(screen.getByText("Converted")).toBeInTheDocument()
    expect(screen.getByText("manifest.yml")).toBeInTheDocument()
    expect(screen.getByText("added")).toBeInTheDocument()
    expect(screen.getByText("Ada")).toBeInTheDocument()
    expect(screen.getByText("Approved by Grace")).toBeInTheDocument()
    expect(screen.getByText("— Initial package")).toBeInTheDocument()
    expect(screen.queryByText("Initial upload")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Restore" })).not.toBeInTheDocument()
  })

  it("keeps Restore disabled on a non-current version", async () => {
    vi.mocked(fetchCorpusVersions).mockResolvedValue({
      versions: [
        {
          id: "v2",
          label: "v1.1",
          title: "Title change",
          at: "2026-08-09T10:00:00Z",
          current: true,
          files: [{ path: "manifest.yml", kind: "modified" }],
          author: { sub: "u1", name: "Ada" },
        },
        {
          id: "v1",
          label: "v1.0",
          title: "Converted",
          at: "2026-08-08T13:14:00Z",
          current: false,
          files: [{ path: "manifest.yml", kind: "added" }],
          author: { sub: "u1", name: "Ada" },
        },
      ],
    })
    render(<Activity archive={archive} document={document} />)
    expect(await screen.findByText("v1.0")).toBeInTheDocument()
    const restore = screen.getByRole("button", { name: "Restore" })
    expect(restore).toBeDisabled()
  })

  it("shows the empty Version history when the versions fetch fails", async () => {
    vi.mocked(fetchCorpusVersions).mockRejectedValue(new Error("offline"))
    render(<Activity archive={archive} document={document} />)
    expect(
      await screen.findByText("No version history yet."),
    ).toBeInTheDocument()
    expect(screen.queryByText("v1.1")).not.toBeInTheDocument()
    expect(screen.getByText("Upload received")).toBeInTheDocument()
  })
})
