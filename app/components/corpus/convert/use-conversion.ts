import { useEffect, useId } from "react"
import { useFetcher } from "react-router"
import { useAtomValue, useSetAtom } from "jotai"
import type { ConversionEntry } from "@/lib/corpus"
import {
    closeConversionPanelAtom,
    conversionDocumentIdAtom,
    conversionEntryAtom,
    conversionPanelOpenAtom,
    conversionRunningAtom,
    dismissConversionAtom,
    openConversionPanelAtom,
    retryConversionAtom,
    startConversionAtom,
    type ConversionPersistPayload,
} from "./store"

export interface ConversionController {
    entry: ConversionEntry | null
    /** Set once the terminal row is persisted — the "View corpus" target. */
    documentId: string | null
    panelOpen: boolean
    openPanel: () => void
    closePanel: () => void
    running: boolean
    start: (file: File) => void
    retry: () => void
    dismiss: () => void
}

/**
 * Layout-level conversion controller over the atoms in `./store`. The run
 * itself (upload, poll, download, archive read, bucket upload) is store
 * logic; this hook adds the one piece that needs React Router — persisting
 * the registry row through the /corpus route's `convert-document` action
 * once `runConversionAtom` hands back the payload. No polling in loaders, no
 * route re-suspension (docs/data-loading.md). Mounted in AppLayout so the
 * run survives in-app navigation; the persisted `job_id` is what the detail
 * explorer uses after reload (`GET /convert/{job_id}/…`).
 */
export function useConversion(): ConversionController {
    const conversionId = useId()
    const persistFetcher = useFetcher<{
        ok: boolean
        intent?: string
        documentId?: string
        error?: string
    }>({ key: conversionId })

    const entry = useAtomValue(conversionEntryAtom)
    const documentId = useAtomValue(conversionDocumentIdAtom)
    const panelOpen = useAtomValue(conversionPanelOpenAtom)
    const running = useAtomValue(conversionRunningAtom)
    const setDocumentId = useSetAtom(conversionDocumentIdAtom)
    const openPanel = useSetAtom(openConversionPanelAtom)
    const closePanel = useSetAtom(closeConversionPanelAtom)
    const dismiss = useSetAtom(dismissConversionAtom)
    const startConversion = useSetAtom(startConversionAtom)
    const retryConversion = useSetAtom(retryConversionAtom)

    // The revalidation this submit triggers refreshes the list without
    // re-suspending it.
    const persist = (payload: ConversionPersistPayload | null) => {
        if (payload) persistFetcher.submit(payload, { method: "post", action: "/corpus" })
    }

    // Mirror the action's answer into the store so the pill/panel can read it
    // there; `runConversionAtom` clears it again when a new run starts.
    const persisted = persistFetcher.data
    useEffect(() => {
        if (persisted?.ok && persisted.intent === "convert-document") {
            setDocumentId(persisted.documentId ?? null)
        }
    }, [persisted, setDocumentId])

    return {
        entry,
        documentId,
        panelOpen,
        openPanel,
        closePanel,
        running,
        start: (file: File) => {
            void Promise.resolve(startConversion(file)).then(persist)
        },
        retry: () => {
            void Promise.resolve(retryConversion()).then(persist)
        },
        dismiss,
    }
}
