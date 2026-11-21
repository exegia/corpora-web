import { screen, render, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Provider } from "jotai"
import { createRoutesStub, useOutletContext } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import CorporaApi, { type CorpusArchive } from "@/lib/api"
import Corpus, { type ConversionEntry } from "@/lib/corpus"
import type { ConversionController } from "@/components/corpus/convert/use-conversion"
import Reader from "@/components/corpus/detail/reader"
import { AppLayout } from "./app-layout"

vi.mock("@/lib/api", async load => {
    const original = await load<typeof import("@/lib/api")>()
    return {
        ...original,
        default: {
            ...original.default,
            fetchCapabilities: vi.fn(),
            fetchCorpusContent: vi.fn(),
            fetchCorpusNode: vi.fn(),
        },
    }
})
vi.mock("@/lib/corpus", async load => {
    const original = await load<typeof import("@/lib/corpus")>()
    return { ...original, default: { ...original.default, Convert: { ...original.default.Convert, runConversion: vi.fn() } } }
})

const archive: CorpusArchive = {
    kind: "job",
    key: "job-1",
    index: {
        toc: null,
        node_types: [],
        sections: {
            levels: ["part", "question"],
            items: [{ title: "Part one", ref: "I", children: [{ title: "Question one", ref: "I.Q1" }] }],
        },
    },
}

/** A reader page that can also start and show a conversion, as /corpus does. */
function ReaderPage() {
    const conversion = useOutletContext<ConversionController>()
    return (
        <>
            <button onClick={() => conversion.start(new File(["<xml/>"], "summa.xml", { type: "text/xml" }))}>
                Start conversion
            </button>
            <button onClick={conversion.openPanel}>Show progress</button>
            <Reader corpusId="c1" archive={archive} sectionTitle="Part one" />
        </>
    )
}

function renderLayout() {
    const Stub = createRoutesStub([
        {
            Component: AppLayout,
            HydrateFallback: () => null,
            children: [{ path: "/corpus/c1", Component: ReaderPage }],
        },
    ])
    return render(
        <Provider>
            <Stub initialEntries={["/corpus/c1"]} />
        </Provider>
    )
}

beforeEach(() => {
    vi.clearAllMocks()
    // A run that stays queued, so the progress panel has something to show.
    vi.mocked(Corpus.Convert.runConversion).mockImplementation(async (_file, initial, onChange) => {
        const entry: ConversionEntry = {
            ...initial,
            status: "queued",
            logs: [...initial.logs, { step: "validate", text: "> Parsing nodes…", tone: "info" }],
        }
        onChange(entry)
        return entry
    })
    vi.mocked(CorporaApi.fetchCorpusContent).mockResolvedValue({
        ref: "I.Q1",
        format: "text",
        passages: [{ ref: "p1", node: 9, text: "Sic", tokens: [{ text: "Sic", after: "", node: 1 }] }],
        total: 1,
        offset: 0,
        limit: 20,
        next_offset: null,
    })
    vi.mocked(CorporaApi.fetchCorpusNode).mockImplementation(async (_, node) => ({
        node,
        otype: "word",
        is_slot: true,
        slot_type: "word",
        first_slot: node,
        last_slot: node,
        section_ref: "I.Q1",
        text: "Sic",
        features: { lemma: "sic", sp: "Adverb" },
        annotation: null,
        node_types: ["word"],
        occurrences: 12,
    }))
})

describe("AppLayout right panel", () => {
    it("shows conversion progress again after Add to chat took the panel over", async () => {
        const user = userEvent.setup()
        renderLayout()

        await user.click(await screen.findByRole("button", { name: "Start conversion" }))
        await user.click(screen.getByRole("button", { name: "Show progress" }))
        expect(await screen.findByText("> Parsing nodes…")).toBeInTheDocument()

        // Add to chat replaces the panel's content with the chat.
        await user.click(await screen.findByRole("button", { name: "Sic" }))
        await user.click(await screen.findByRole("button", { name: /Add to chat/ }))
        expect(await screen.findByRole("complementary", { name: "Corpus curation" })).toBeInTheDocument()
        expect(screen.queryByText("> Parsing nodes…")).not.toBeInTheDocument()

        // Show progress takes the panel back instead of doing nothing.
        await user.click(screen.getByRole("button", { name: "Show progress" }))
        await waitFor(() => expect(document.body.textContent).toContain("> Parsing nodes…"))
        expect(screen.queryByRole("complementary", { name: "Corpus curation" })).not.toBeInTheDocument()
    })
})
