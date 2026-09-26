import { atom, useAtomValueRawSync, useSetAtom } from "jotai"
import type { ChatState, ReaderScope } from "./types"

export const chatStateAtom = atom<ChatState>({ sections: [], active: -1, location: null })
chatStateAtom.debugLabel = "corpus-chat/state"

export const resetChatAtom = atom(null, (_get, set) => {
    set(chatStateAtom, { sections: [], active: -1, location: null })
})

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

/** Shared by reader and panel in the root store; reset when the session ends. */
export function useChatState() {
    return [useAtomValueRawSync(chatStateAtom), useSetAtom(chatStateAtom)] as const
}
