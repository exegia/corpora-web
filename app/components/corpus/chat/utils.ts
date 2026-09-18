import type { ReaderSelection, SelectedPassage } from "./types"

/** Only use actual API node ids; never infer a slot from a word's position. */
export function selectionScope({
    corpusId,
    location,
    text,
    passages,
    wordNode,
}: {
    corpusId: string
    location: string
    text: string
    passages: SelectedPassage[]
    wordNode?: number | null
}): ReaderSelection | null {
    if (!text.trim() || !passages.length) return null
    const first = passages[0].index + 1
    const last = passages[passages.length - 1].index + 1
    const range = first === last ? `¶${first}` : `¶${first}–¶${last}`
    const isWord = wordNode != null && wordNode > 0
    const nodeIds = isWord
        ? [String(wordNode)]
        : [
              ...new Set(
                  passages.flatMap(({ passage }) =>
                      passage.node != null && passage.node > 0 ? [String(passage.node)] : []
                  )
              ),
          ]
    return {
        corpusId,
        location,
        text: text.trim(),
        wordCount: text.trim().split(/\s+/u).length,
        scope: {
            kind: isWord ? "word" : "passage",
            label: isWord ? text.trim() : `${location} ${range}`,
            location,
            range,
            nodeIds,
            nodeId: nodeIds.length === 1 ? nodeIds[0] : undefined,
        },
    }
}

/** Clip each intersecting paragraph to the DOM range, excluding gutter numbers. */
export function selectedPassages(root: HTMLElement, selection: Selection | null) {
    if (!selection || selection.isCollapsed || !selection.rangeCount) return []
    const range = selection.getRangeAt(0)
    if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return []
    return Array.from(root.querySelectorAll<HTMLElement>("[data-reader-passage]")).flatMap(element => {
        if (!range.intersectsNode(element)) return []
        const clipped = range.cloneRange()
        if (!element.contains(range.startContainer)) clipped.setStart(element, 0)
        if (!element.contains(range.endContainer)) clipped.setEnd(element, element.childNodes.length)
        const text = clipped.toString().trim()
        return text ? [{ index: Number(element.dataset.readerPassage), text, element }] : []
    })
}
