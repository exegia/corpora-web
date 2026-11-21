/**
 * Jotai state for the layout-level conversion run: one tracked entry driven
 * against the real corpora-py service (lib/corpus.Convert). Module-level
 * atoms, so the run survives in-app navigation and any component under
 * `ExegiaProvider` can read it without holding the controller.
 *
 * Everything but the persist step lives here. Persisting the registry row
 * goes through the /corpus route's `convert-document` action, which needs a
 * React Router fetcher — so `runConversionAtom` resolves to the payload for
 * that action and `useConversion` submits it.
 */
import { atom } from "jotai"
import { atomWithImmer } from "jotai-immer"
import CorporaApi, { asCorpusFilename, detectSourceFormat, MAX_UPLOAD_BYTES, SUPPORTED_EXTENSIONS } from "@/lib/api"
import Corpus, { type ConversionEntry, type ConversionStepId } from "@/lib/corpus"

/** Form fields of the /corpus `convert-document` action. */
export type ConversionPersistPayload = Record<string, string>

// ── state ────────────────────────────────────────────────────────────────

/** Immer-backed so step/log patches are in-place draft edits. */
export const conversionEntryAtom = atomWithImmer<ConversionEntry | null>(null)
conversionEntryAtom.debugLabel = "conversion/entry"

export const conversionPanelOpenAtom = atom(false)
conversionPanelOpenAtom.debugLabel = "conversion/panelOpen"

/** Registry row id once the terminal row is persisted — the "View corpus" target. */
export const conversionDocumentIdAtom = atom<string | null>(null)
conversionDocumentIdAtom.debugLabel = "conversion/documentId"

/** Run handles: not rendered, only read by the actions below. */
const lastFileAtom = atom<File | null>(null)
const abortControllerAtom = atom<AbortController | null>(null)

/**
 * The signed-in user the run belongs to. The store outlives the signed-in
 * layout (the root `ExegiaProvider` survives a sign-out redirect), so a run,
 * its retained file and its "View corpus" target are scoped to this id and
 * dropped when it changes — never shown to, or retried by, the next account.
 */
const conversionOwnerAtom = atom<string | null>(null)

// ── derived ──────────────────────────────────────────────────────────────

export const conversionRunningAtom = atom(get => {
    const entry = get(conversionEntryAtom)
    return entry !== null && entry.finishedAt === null
})
conversionRunningAtom.debugLabel = "conversion/running"

// ── actions ──────────────────────────────────────────────────────────────

/** Turn the current entry into a failed run stopped at `step`. */
const failConversionAtom = atom(null, (_get, set, step: ConversionStepId, message: string) => {
    set(conversionEntryAtom, draft => {
        if (!draft) return
        draft.status = "error"
        draft.error = message
        draft.failedStep = step
        draft.finishedAt = Date.now()
        draft.logs.push({ step, text: `✗ ${message}`, tone: "error" })
    })
})

export const openConversionPanelAtom = atom(null, (_get, set) => set(conversionPanelOpenAtom, true))
export const closeConversionPanelAtom = atom(null, (_get, set) => set(conversionPanelOpenAtom, false))

export const dismissConversionAtom = atom(null, (get, set) => {
    get(abortControllerAtom)?.abort()
    set(abortControllerAtom, null)
    set(conversionEntryAtom, null)
    set(conversionDocumentIdAtom, null)
    set(conversionPanelOpenAtom, false)
})

/** Abort and forget everything about the current run, retry handle included. */
export const resetConversionAtom = atom(null, (_get, set) => {
    set(dismissConversionAtom)
    set(lastFileAtom, null)
})

/**
 * Bind the run to `owner` (the signed-in user's id, or `null` when signed
 * out). A different owner than the one that started it resets the run first.
 */
export const claimConversionAtom = atom(null, (get, set, owner: string | null) => {
    if (get(conversionOwnerAtom) === owner) return
    set(resetConversionAtom)
    set(conversionOwnerAtom, owner)
})

/**
 * Drive the pipeline for `file`, replacing any run in flight. Resolves to the
 * `convert-document` payload once the archive is downloaded, its
 * manifest/toc/history read and the .corpus stored in the library bucket —
 * or `null` when the run failed or was superseded.
 */
export const runConversionAtom = atom(null, async (get, set, file: File): Promise<ConversionPersistPayload | null> => {
    get(abortControllerAtom)?.abort()
    const controller = new AbortController()
    set(abortControllerAtom, controller)
    set(lastFileAtom, file)
    set(conversionDocumentIdAtom, null)

    const initial = Corpus.Convert.createConversionEntry(file)
    set(conversionEntryAtom, initial)

    const final = await Corpus.Convert.runConversion(
        file,
        initial,
        next => {
            if (!controller.signal.aborted) set(conversionEntryAtom, next)
        },
        { signal: controller.signal }
    )
    if (controller.signal.aborted) return null
    if (final.status !== "ready" || !final.corpusBlob) return null

    try {
        const blob = final.corpusBlob
        const baseName = file.name.replace(/\.[^.]+$/, "")
        const storedName = asCorpusFilename(final.resultFilename ?? `${baseName}.corpus`)
        const corpusFile = new File([blob], storedName, { type: "application/zip" })
        const [info, commits] = await Promise.all([
            Corpus.Archive.readCorpusArchive(blob),
            // History is best-effort — a corpus without a .git is still a corpus.
            Corpus.History.extractCorpusHistory(corpusFile).catch(() => null),
        ])
        if (controller.signal.aborted) return null
        const path = await Corpus.Documents.uploadCorpusFile(corpusFile)
        if (controller.signal.aborted) return null

        return {
            intent: "convert-document",
            name: Corpus.Convert.libraryTitle({
                displayName: final.displayName,
                manifestName: info.name,
                filenameStem: baseName,
            }),
            source: "upload",
            path,
            filename: corpusFile.name,
            jobId: final.jobId ?? "",
            sourceFormat: final.sourceFormat ?? "",
            corpusType: info.corpusType ?? "text",
            language: info.language ?? "",
            description: info.description ?? "",
            toc: JSON.stringify(info.sections),
            sizeBytes: String(blob.size),
            nodes: String(final.validation?.stats?.max_slot ?? ""),
            convertedAt: new Date().toISOString(),
            commits: JSON.stringify(commits ?? []),
        }
    } catch (error) {
        if (controller.signal.aborted) return null
        set(
            failConversionAtom,
            "index",
            error instanceof Error ? error.message : "The converted corpus could not be stored."
        )
        return null
    }
})

/**
 * Classify and size-check before anything is uploaded — a rejected file
 * never leaves the machine — then run.
 */
export const startConversionAtom = atom(null, (_get, set, file: File) => {
    const reject = (message: string) => {
        const rejected = Corpus.Convert.createConversionEntry(file)
        set(conversionEntryAtom, rejected)
        set(failConversionAtom, "receive", message)
        return null
    }
    if (!detectSourceFormat(file.name)) {
        return reject(`Unsupported file type. Supported: ${SUPPORTED_EXTENSIONS.join(", ")}`)
    }
    if (file.size > MAX_UPLOAD_BYTES) {
        return reject("This file exceeds the service's 500 MiB upload limit.")
    }
    // Warm the capability posture (auth flag) once per session.
    void CorporaApi.fetchCapabilities()
    return set(runConversionAtom, file)
})

/** Re-run the last file, if any. */
export const retryConversionAtom = atom(null, (get, set) => {
    const file = get(lastFileAtom)
    return file ? set(runConversionAtom, file) : null
})
