import { createStore } from "jotai"
import { describe, expect, it } from "vitest"
import Corpus from "@/lib/corpus"
import {
    conversionDocumentIdAtom,
    conversionEntryAtom,
    conversionPersistRequestAtom,
    dismissConversionAtom,
    finishConversionPersistAtom,
} from "./store"

describe("conversion persistence", () => {
    it("ignores late responses after dismissal or a replacement run", () => {
        const store = createStore()
        store.set(conversionPersistRequestAtom, { id: "old", payload: {} })
        store.set(dismissConversionAtom)
        store.set(finishConversionPersistAtom, "old", { ok: true, documentId: "old-doc" })
        expect(store.get(conversionDocumentIdAtom)).toBeNull()
        store.set(conversionPersistRequestAtom, { id: "new", payload: {} })
        store.set(finishConversionPersistAtom, "old", { ok: true, documentId: "old-doc" })
        expect(store.get(conversionPersistRequestAtom)?.id).toBe("new")
        expect(store.get(conversionDocumentIdAtom)).toBeNull()
        store.set(finishConversionPersistAtom, "new", { ok: true, documentId: "new-doc" })
        expect(store.get(conversionDocumentIdAtom)).toBe("new-doc")
    })

    it("exposes a failed registry write as a retryable conversion error", () => {
        const store = createStore()
        const entry = Corpus.Convert.createConversionEntry(new File([""], "source.xml"))
        store.set(conversionEntryAtom, { ...entry, status: "ready", finishedAt: Date.now() })
        store.set(conversionPersistRequestAtom, { id: entry.id, payload: {} })
        store.set(finishConversionPersistAtom, entry.id, { ok: false, error: "Storage unavailable" })
        expect(store.get(conversionEntryAtom)).toMatchObject({
            status: "error", failedStep: "index", error: "Storage unavailable",
        })
        expect(store.get(conversionPersistRequestAtom)).toBeNull()
    })
})
