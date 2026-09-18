import { useMemo, useState, type ReactNode } from "react"
import { Provider, createStore } from "jotai"
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { IShellPanelControls } from "@exegia/corpora-ui"
import CorporaApi, { type CorpusArchive } from "@/lib/api"
import { ShellPanelsContext } from "@/components/layouts/shell-panels"
import Reader from "../detail/reader"
import ChatProvider from "./provider"

vi.mock("@/lib/api", async load => {
    const original = await load<typeof import("@/lib/api")>()
    return { ...original, default: { ...original.default, fetchCorpusContent: vi.fn(), fetchCorpusNode: vi.fn() } }
})
const archive: CorpusArchive = {
    kind: "job",
    key: "job-1",
    index: {
        toc: null,
        node_types: [],
        sections: {
            levels: ["part", "question"],
            items: [
                {
                    title: "Part one",
                    ref: "I",
                    children: [
                        { title: "Question one", ref: "I.Q1" },
                        { title: "Question two", ref: "I.Q2" },
                    ],
                },
            ],
        },
    },
}
const passages = [
    {
        ref: "p1",
        node: 9,
        text: "Sic venit",
        tokens: [
            { text: "Sic", after: " ", node: 1 },
            { text: "venit", after: "", node: 2 },
        ],
    },
    {
        ref: "p2",
        node: 10,
        text: "Alia verba",
        tokens: [
            { text: "Alia", after: " ", node: 3 },
            { text: "verba", after: "", node: 4 },
        ],
    },
]
function Harness() {
    const [panel, setPanel] = useState<ReactNode>(null)
    const [open, setOpen] = useState(false)
    const [mounted, setMounted] = useState(true)
    const shell = useMemo(
        () =>
            ({
                resizePanel: vi.fn(),
                openPanel: (_: string, content: ReactNode) => {
                    setPanel(content)
                    setOpen(true)
                },
                setOpen: (value: boolean) => setOpen(value),
            }) as unknown as IShellPanelControls,
        []
    )
    return (
        <Provider store={useMemo(() => createStore(), [])}>
            <ShellPanelsContext.Provider value={shell}>
                <ChatProvider>
                    <button onClick={() => setMounted(v => !v)}>Toggle reader route</button>
                    {mounted && <Reader corpusId="c1" archive={archive} sectionTitle="Part one" />}
                    {open && panel}
                </ChatProvider>
            </ShellPanelsContext.Provider>
        </Provider>
    )
}
beforeEach(() => {
    vi.clearAllMocks()
    window.getSelection()?.removeAllRanges()
    vi.mocked(CorporaApi.fetchCorpusContent).mockResolvedValue({
        ref: "I.Q1",
        format: "text",
        passages,
        total: 2,
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

describe("reader Add to chat", () => {
    it("keeps word details and opens context with the keyboard shortcut", async () => {
        const user = userEvent.setup()
        render(<Harness />)
        const word = await screen.findByRole("button", { name: "Sic" })
        await user.click(word)
        expect(await screen.findByText("Morphology")).toBeInTheDocument()
        expect(await screen.findByRole("button", { name: /Add to chat/ })).toBeInTheDocument()
        expect(screen.getAllByRole("button", { name: /Add to chat/ })).toHaveLength(1)
        fireEvent.keyDown(document, { key: "j", metaKey: true })
        const panel = await screen.findByRole("complementary", { name: "Corpus curation" })
        expect(within(panel).getByLabelText("Chat scope")).toHaveTextContent("Sic · word")
        expect(within(panel).getByText("Nodes: 1")).toBeInTheDocument()
        expect(within(panel).getByRole("textbox")).toBeDisabled()
        expect(within(panel).getByRole("status")).toHaveTextContent("not available yet")
        await waitFor(() => expect(screen.getByRole("button", { name: "Close AI panel" })).toHaveFocus())
        fireEvent.keyDown(screen.getByRole("button", { name: "Close AI panel" }), { key: "Escape" })
        await waitFor(() =>
            expect(screen.queryByRole("complementary", { name: "Corpus curation" })).not.toBeInTheDocument()
        )
        expect(word).toHaveFocus()
    })
    it("pins context across question and route navigation", async () => {
        const user = userEvent.setup()
        render(<Harness />)
        await user.click(await screen.findByRole("button", { name: "Sic" }))
        await user.click(await screen.findByRole("button", { name: /Add to chat/ }))
        await user.click(screen.getByRole("button", { name: "Question two" }))
        expect(await screen.findByText("PINNED")).toBeInTheDocument()
        expect(screen.getByLabelText("Chat scope")).toHaveTextContent("Sic · word")
        await user.click(screen.getByRole("button", { name: "Toggle reader route" }))
        expect(screen.getByRole("complementary", { name: "Corpus curation" })).toBeInTheDocument()
        await user.click(screen.getByRole("button", { name: "Toggle reader route" }))
        await user.click(await screen.findByRole("button", { name: "Alia" }))
        await user.click(await screen.findByRole("button", { name: /Add to chat/ }))
        expect(screen.getByRole("navigation", { name: "Previous chat contexts" })).toBeInTheDocument()
    })
    it("adds a multi-paragraph DOM selection with actual node ids", async () => {
        const user = userEvent.setup()
        render(<Harness />)
        await screen.findByRole("button", { name: "Sic" })
        const reader = screen.getByRole("article", { name: "Corpus reader" })
        const paragraphs = reader.querySelectorAll("[data-reader-passage]")
        act(() => {
            const range = document.createRange()
            range.setStart(paragraphs[0], 0)
            range.setEnd(paragraphs[1], paragraphs[1].childNodes.length)
            window.getSelection()!.addRange(range)
        })
        fireEvent.mouseUp(reader)
        await user.click(await screen.findByRole("button", { name: /Add to chat/ }))
        expect(screen.getByLabelText("Chat scope")).toHaveTextContent("I.Q1 ¶1–¶2 · passage")
        expect(screen.getByText("Nodes: 9, 10")).toBeInTheDocument()
    })
})
