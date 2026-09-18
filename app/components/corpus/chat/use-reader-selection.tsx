import { useContext, useEffect, useRef, useState, type RefObject } from "react"
import { useStore } from "jotai"
import { SelectionPopover } from "@exegia/corpora-ui"
import type { CorpusPassage } from "@/lib/api"
import { ShellPanelsContext } from "@/components/layouts/shell-panels"
import type { Lemma } from "../detail/types"
import Panel from "./panel"
import { addSelection, useChatAtom } from "./state"
import { selectedPassages, selectionScope } from "./utils"
import type { ReaderSelection } from "./types"

export function useReaderSelection({
    corpusId,
    location,
    passages,
    showDetails,
    inspectNode,
    root,
}: {
    root: RefObject<HTMLElement | null>
    corpusId: string
    location: string
    passages: CorpusPassage[]
    showDetails: (lemma: Lemma) => void
    inspectNode: (node: number, text: string, passage: CorpusPassage) => Promise<Lemma>
}) {
    const restore = useRef<HTMLElement | null>(null)
    const request = useRef({ id: 0 })
    const stateAtom = useChatAtom()
    const store = useStore()
    const shell = useContext(ShellPanelsContext)
    const [selection, setSelection] = useState<ReaderSelection | null>(null)
    const [word, setWord] = useState<Lemma | null>(null)
    const [anchor, setAnchor] = useState({ top: 0, left: 0 })

    useEffect(() => {
        const sequence = request.current
        sequence.id++
        if (!stateAtom) return
        store.set(stateAtom, state => ({ ...state, location: { corpusId, ref: location } }))
        return () => {
            sequence.id++
            store.set(stateAtom, state => ({ ...state, location: null }))
        }
    }, [corpusId, location, stateAtom, store])

    function returnFocus() {
        const element = restore.current?.isConnected
            ? restore.current
            : (root.current ?? document.querySelector<HTMLElement>("[data-corpus-reader]"))
        element?.focus({ preventScroll: true })
    }
    function position(element: HTMLElement) {
        const rect = element.getBoundingClientRect()
        const parent = root.current?.getBoundingClientRect()
        setAnchor({ top: rect.bottom - (parent?.top ?? 0), left: Math.max(0, rect.left - (parent?.left ?? 0)) })
        restore.current = element
    }
    function inspect(lemma: Lemma, passage: CorpusPassage, element: HTMLElement, wordNode?: number | null) {
        if (!element.isConnected) return
        showDetails(lemma)
        const index = passages.indexOf(passage)
        if (index < 0) return
        setWord(lemma)
        setSelection(selectionScope({ corpusId, location, text: lemma.form, passages: [{ passage, index }], wordNode }))
        position(element)
    }
    function capture() {
        const container = root.current
        if (!container) return
        const nativeSelection = window.getSelection()
        const selected = selectedPassages(container, nativeSelection)
        if (!selected.length) return
        // A drag must not trigger the token click's asynchronous inspection.
        request.current.id++
        const range = nativeSelection!.getRangeAt(0)
        const tokens = selected.flatMap(({ element }) =>
            Array.from(element.querySelectorAll<HTMLElement>("[data-reader-token]")).filter(token =>
                range.intersectsNode(token)
            )
        )
        const node = tokens.length === 1 ? Number(tokens[0].dataset.readerNode) || null : null
        setWord(null)
        setSelection(
            selectionScope({
                corpusId,
                location,
                text: selected.map(p => p.text).join("\n"),
                passages: selected.map(({ index }) => ({ index, passage: passages[index] })),
                wordNode: node,
            })
        )
        position(tokens[0] ?? selected[0].element)
        if (node != null) {
            const id = request.current.id
            void inspectNode(node, tokens[0].textContent ?? "", passages[selected[0].index]).then(details => {
                if (id === request.current.id) setWord(details)
            })
        }
    }
    function beginInspection() {
        return ++request.current.id
    }
    function finishInspection(
        id: number,
        lemma: Lemma,
        passage: CorpusPassage,
        element: HTMLElement,
        wordNode?: number | null
    ) {
        if (id === request.current.id) inspect(lemma, passage, element, wordNode)
    }
    function addToChat() {
        if (!selection || !stateAtom || !shell) return
        store.set(stateAtom, state => addSelection(state, selection))
        setSelection(null)
        window.getSelection()?.removeAllRanges()
        shell.resizePanel(384)
        shell.openPanel("right", <Panel returnFocus={returnFocus} />)
    }
    const popover =
        selection && selection.corpusId === corpusId && selection.location === location && stateAtom && shell ? (
            <SelectionPopover
                open
                variant={word ? "word" : "node"}
                word={
                    word
                        ? {
                              lemma: word.lemma,
                              partOfSpeech: word.pos,
                              frequency: word.occurrences,
                              onViewDetails: () => {
                                  showDetails(word)
                                  setSelection(null)
                                  returnFocus()
                              },
                          }
                        : undefined
                }
                node={{
                    range: selection.scope.label,
                    nodeIds: selection.scope.nodeIds ?? [],
                    wordCount: selection.wordCount,
                }}
                onAddToChat={addToChat}
                onClose={() => {
                    request.current.id++
                    setSelection(null)
                    window.getSelection()?.removeAllRanges()
                    returnFocus()
                }}>
                <span aria-hidden="true" className="pointer-events-none absolute h-px w-px" style={anchor} />
            </SelectionPopover>
        ) : null
    return {
        capture,
        popover,
        beginInspection,
        finishInspection,
        clear: () => {
            setSelection(null)
            setWord(null)
        },
    }
}
