import { atom, useAtomValueRawSync, useSetAtom } from "jotai"
import { createContext, useContext } from "react"
import type { ChatState, ReaderScope } from "./types"

export function createChatAtom() {
    return atom<ChatState>({ sections: [], active: -1, location: null })
}

export function addSelection(state: ChatState, selection: ReaderScope): ChatState {
    const current = state.sections[state.active]
    if (
        current &&
        current.corpusId === selection.corpusId &&
        current.location === selection.location &&
        current.text === selection.text &&
        JSON.stringify(current.scope.nodeIds) === JSON.stringify(selection.scope.nodeIds)
    ) {
        return state
    }
    return { ...state, sections: [...state.sections, selection], active: state.sections.length }
}

// The atom belongs to the signed-in layout, not to a route or a global store.
// Navigation preserves it; leaving the layout (including logout) discards it.
export const ChatContext = createContext<ReturnType<typeof createChatAtom> | null>(null)
export function useChatAtom() {
    return useContext(ChatContext)
}
export function useChatState() {
    const state = useChatAtom()
    if (!state) throw new Error("Corpus chat requires ChatProvider")
    return [useAtomValueRawSync(state), useSetAtom(state)] as const
}
