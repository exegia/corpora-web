import type { ConversionEntry } from "@/lib/corpus"
import { createStore, atom } from "jotai"

export type TConversionAtom = {
    entry?: ConversionEntry
    /** Set once the terminal row is persisted — the "View corpus" target. */
    documentId?: string
    running: boolean
}

const conversionAtom = atom<TConversionAtom>()
const conversionStore = createStore()
conversionStore.set(conversionAtom, { running: false })

export { conversionAtom }
export default conversionStore
