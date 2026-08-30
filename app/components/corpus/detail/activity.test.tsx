import type { ReactElement } from "react"
import { render, screen } from "@testing-library/react"
import { createRoutesStub } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import CorporaApi from "@/lib/api"
import type { CorpusArchive, CorpusVersion, VersionsResponse } from "@/lib/api"
import type { CorpusDocument } from "@/lib/corpus"
import Activity from "./activity"

vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>()
  return {
    ...original,
    default: {
      ...original.default,
      fetchCorpusVersions: vi.fn(async () => ({ versions: [] })),
    },
  }
})

function renderActivity(ui: ReactElement) {
  const Stub = createRoutesStub([
    {
      path: "/",
      Component: () => ui,
      HydrateFallback: () => null,
      action: async () => ({ ok: true }),
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

const archive: CorpusArchive = {
  kind: "job",
  key: "j-summa",
  index: { toc: null, sections: null, node_types: [] },
}

beforeEach(() => {
  vi.mocked(CorporaApi.fetchCorpusVersions).mockReset()
  vi.mocked(CorporaApi.fetchCorpusVersions).mockResolvedValue({ versions: [] })
})

describe("Activity", () => {
  it("shows an empty Version history when there is no archive, not minted labels", () => {
    renderActivity(<Activity archive={null} document={document} />)
    expect(
      screen.getByRole("heading", { name: "Version history" }),
    ).toBeInTheDocument()
    expect(screen.getByText("No version history yet.")).toBeInTheDocument()
    expect(screen.queryByText("v1.1")).not.toBeInTheDocument()
    expect(screen.queryByText("Initial upload")).not.toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Activity" })).toBeInTheDocument()
    expect(screen.getByText("Conversion succeeded")).toBeInTheDocument()
    expect(screen.getByText("Upload received")).toBeInTheDocument()
    expect(screen.getByText("Corpus created")).toBeInTheDocument()
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
    vi.mocked(CorporaApi.fetchCorpusVersions).mockReturnValue(
      new Promise((next) => {
        resolve = next
      }),
    )
    renderActivity(<Activity archive={archive} document={document} />)
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
    expect(screen.queryByText("Corpus created")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Restore" })).not.toBeInTheDocument()
  })

  it("lists versions newest first", async () => {
    vi.mocked(CorporaApi.fetchCorpusVersions).mockResolvedValue({
      versions: [
        {
          id: "v1",
          label: "v1.0",
          title: "Converted",
          at: "2026-08-08T13:14:00Z",
          current: false,
        },
        {
          id: "v2",
          label: "v1.1",
          title: "Now",
          at: "2026-08-09T10:00:00Z",
          current: true,
        },
      ],
    })
    renderActivity(<Activity archive={archive} document={document} />)
    const newest = await screen.findByText("v1.1")
    const oldest = screen.getByText("v1.0")
    expect(
      newest.compareDocumentPosition(oldest) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it("enables Restore on a non-current version for a job-scoped archive", async () => {
    vi.mocked(CorporaApi.fetchCorpusVersions).mockResolvedValue({
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
    renderActivity(<Activity archive={archive} document={document} />)
    expect(await screen.findByText("v1.0")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Restore" })).toBeEnabled()
  })

  it("keeps Restore disabled on a Hub archive", async () => {
    vi.mocked(CorporaApi.fetchCorpusVersions).mockResolvedValue({
      versions: [
        {
          id: "v1",
          label: "v1.0",
          title: "Converted",
          at: "2026-08-08T13:14:00Z",
          current: false,
        },
        {
          id: "v2",
          label: "v1.1",
          title: "Now",
          at: "2026-08-09T10:00:00Z",
          current: true,
        },
      ],
    })
    const hub: CorpusArchive = {
      kind: "hub",
      key: "summa.corpus",
      index: { toc: null, sections: null, node_types: [] },
    }
    renderActivity(<Activity archive={hub} document={document} />)
    expect(await screen.findByText("v1.0")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Restore" })).toBeDisabled()
  })

  it("shows the empty Version history when the versions fetch fails", async () => {
    vi.mocked(CorporaApi.fetchCorpusVersions).mockRejectedValue(new Error("offline"))
    renderActivity(<Activity archive={archive} document={document} />)
    expect(
      await screen.findByText("No version history yet."),
    ).toBeInTheDocument()
    expect(screen.queryByText("v1.1")).not.toBeInTheDocument()
    expect(screen.getByText("Upload received")).toBeInTheDocument()
  })
})
