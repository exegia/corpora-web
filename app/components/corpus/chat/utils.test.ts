import { describe, expect, it } from "vitest"
import { createStore } from "jotai"
import { addSelection, createChatAtom } from "./state"
import { selectedPassages, selectionScope } from "./utils"

const passages = [
    { index: 0, passage: { ref: "Q.1.a.1.p.1", node: 42, text: "First paragraph" } },
    { index: 1, passage: { ref: "Q.1.a.1.p.2", node: 43, text: "Second paragraph" } },
]
function scope(text = "First paragraph") {
    return selectionScope({ corpusId: "corpus-1", location: "Q.1.a.1", text, passages })!
}

describe("reader selection scope", () => {
    it("uses real word ids and labels a single-word scope", () => {
        const result = selectionScope({
            corpusId: "c",
            location: "Q.1",
            text: "First",
            passages: [passages[0]],
            wordNode: 7,
        })!
        expect(result.scope).toMatchObject({ kind: "word", nodeId: "7", label: "First", range: "¶1" })
    })
    it("uses paragraph ranges and deduplicates actual node ids", () => {
        expect(scope().scope).toMatchObject({ kind: "passage", label: "Q.1.a.1 ¶1–¶2", nodeIds: ["42", "43"] })
    })
    it("does not invent slot ids for text-only archives", () => {
        const result = selectionScope({
            corpusId: "c",
            location: "Q.1",
            text: "word",
            passages: [{ index: 2, passage: { text: "word", ref: "p3" } }],
        })!
        expect(result.scope).toMatchObject({ kind: "passage", range: "¶3", nodeIds: [] })
        expect(selectionScope({ corpusId: "c", location: "Q.1", text: " ", passages })).toBeNull()
    })
    it("clips partial multi-paragraph selections without including gutter numbers", () => {
        const root = document.createElement("article")
        root.innerHTML =
            '<span>1</span><p data-reader-passage="0">First paragraph</p><span>2</span><p data-reader-passage="1">Second paragraph</p>'
        document.body.append(root)
        const elements = root.querySelectorAll("p")
        const range = document.createRange()
        range.setStart(elements[0].firstChild!, 6)
        range.setEnd(elements[1].firstChild!, 6)
        const selection = window.getSelection()!
        selection.removeAllRanges()
        selection.addRange(range)
        expect(selectedPassages(root, selection).map(({ text }) => text)).toEqual(["paragraph", "Second"])
        expect(selectedPassages(document.createElement("article"), selection)).toEqual([])
        selection.removeAllRanges()
        root.remove()
    })
})

describe("layout-owned chat contexts", () => {
    it("preserves the original scope on navigation and retains explicit re-scopes", () => {
        const store = createStore()
        const state = createChatAtom()
        store.set(state, s => addSelection(s, scope()))
        store.set(state, s => ({ ...s, location: { corpusId: "corpus-1", ref: "Q.2" } }))
        expect(store.get(state).sections[0].location).toBe("Q.1.a.1")
        store.set(state, s => addSelection(s, { ...scope("A different passage"), location: "Q.2" }))
        expect(store.get(state).sections).toHaveLength(2)
        expect(store.get(state).active).toBe(1)
        const freshSession = createChatAtom()
        expect(store.get(freshSession).sections).toEqual([])
    })
})
