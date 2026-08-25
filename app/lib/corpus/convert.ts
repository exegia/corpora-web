// Conversion pipeline for the Corpus route (004-connect-with-py). The state
// model mirrors the corpora-py client contract: statuses are STORED on a
// single tracked entry, the visible step timeline is DERIVED, never stored.
// `runConversion` drives the REAL service through app/lib/corpora-api by
// polling — on the deployed backend the in-flight poll request is what
// advances the job, so there is deliberately no WebSocket path (see
// specs/004-connect-with-py/research.md R1). Route modules import ONLY from
// this module.

import CorporaApi, {
    CorporaApiError,
    detectSourceFormat,
    type JobStatusMessage,
    SUPPORTED_EXTENSIONS,
} from "../api"
import {
    ACTIVE_STEP,
    CONVERSION_STEPS,
    FIRST_POLL_RETRIES,
    POLL_INTERVAL_MS,
    STEP_FOR_SERVER_STATUS,
    STEP_ORDER,
} from "./constants"
import type { ConversionEntry, ConversionLog, ConversionStep, ConversionStepId, RunConversionOptions } from "./types"
import { defaultDelay, formatBytes } from "./utils"

/** Library heading: job display_name, then manifest name, then a de-slugged stem. */
export function libraryTitle(input: {
    displayName?: string | null
    manifestName?: string | null
    filenameStem: string
}): string {
    const display = input.displayName?.trim()
    if (display) return display
    const manifest = input.manifestName?.trim()
    if (manifest) return manifest
    return input.filenameStem.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim() || input.filenameStem
}

export function createConversionEntry(file: {
    name: string
    size: number
    type: string
    lastModified: number
}): ConversionEntry {
    return {
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        type: file.type || "text/xml",
        status: "uploading",
        error: null,
        lastModified: file.lastModified,
        uploadedAt: Date.now(),
        finishedAt: null,
        sourceFormat: detectSourceFormat(file.name),
        logs: [],
        jobId: null,
        displayName: null,
        resultFilename: null,
        validation: null,
        corpusName: null,
        corpusSize: null,
        corpusBlob: null,
        failedStep: null,
    }
}

/**
 * Which step an errored run stopped at. Prefers the explicitly recorded
 * step; the fallback is the corpora-py derivation — no job id means the
 * server never accepted the file.
 */
function erroredStep(entry: ConversionEntry): ConversionStepId {
    if (entry.failedStep) return entry.failedStep
    if (!entry.jobId) return "receive"
    return entry.validation ? "index" : "convert"
}

/** The step currently running (or failed), and its 1-based position. */
export function currentStep(entry: ConversionEntry): {
    id: ConversionStepId
    index: number
} {
    const id = entry.status === "error" ? erroredStep(entry) : (ACTIVE_STEP[entry.status] ?? "index")
    return { id, index: STEP_ORDER.indexOf(id) + 1 }
}

/**
 * Pure derivation of the 4-step timeline from the tracked entry. A failure
 * marks the step it happened in; later steps stay pending.
 */
export function deriveSteps(entry: ConversionEntry): ConversionStep[] {
    const done = entry.status === "ready" || entry.status === "success"
    const failed = entry.status === "error"
    const failedAt = failed ? STEP_ORDER.indexOf(erroredStep(entry)) : -1
    const activeAt = done
        ? STEP_ORDER.length
        : failed
          ? failedAt
          : STEP_ORDER.indexOf(ACTIVE_STEP[entry.status] ?? "index")

    return CONVERSION_STEPS.map(({ id, title }, i) => ({
        id,
        title,
        state:
            failed && i === failedAt
                ? "failed"
                : i < activeAt
                  ? "completed"
                  : !failed && !done && i === activeAt
                    ? "active"
                    : done
                      ? "completed"
                      : "pending",
        logs: entry.logs.filter(log => log.step === id),
    }))
}

/** Step-completion progress in [0, 1] for the drawer's progress bar. */
export function deriveProgress(entry: ConversionEntry): number {
    const steps = deriveSteps(entry)
    return steps.filter(step => step.state === "completed").length / steps.length
}

/**
 * User-facing copy per failure kind (FR-006): every mode reads as its own
 * message, and each is worth retrying except a signed-out 401.
 */
export function conversionErrorMessage(error: unknown): string {
    if (error instanceof CorporaApiError) {
        switch (error.kind) {
            case "unreachable":
                return "The conversion service could not be reached. Check your connection and retry."
            case "unauthorized":
                return "The conversion service requires you to sign in."
            case "too-large":
                return "This file exceeds the service's 500 MiB upload limit."
            case "unsupported":
                return `This file type cannot be converted. Supported: ${SUPPORTED_EXTENSIONS.join(", ")}.`
            case "queue-full":
                return "The conversion queue is full right now — retry in a moment."
            case "not-found":
                return "The service no longer knows this job — its instance was recycled. Retry to start over."
            case "not-ready":
                return "The archive was not ready to download. Retry the conversion."
            default:
                return error.message
        }
    }
    return error instanceof Error ? error.message : "Something went wrong."
}

/**
 * Drive one conversion against the real service: POST /convert, then a 2 s
 * poll loop (the poll advances the job on the deployed backend), then
 * POST /validate and the archive download. Calls `onChange` with a fresh
 * snapshot at every observable event and resolves the terminal entry
 * (status "ready" or "error"). An aborted run resolves with the last
 * snapshot; nothing is persisted here — the caller owns that.
 */
export async function runConversion(
    file: File,
    initial: ConversionEntry,
    onChange: (entry: ConversionEntry) => void,
    options: RunConversionOptions = {}
): Promise<ConversionEntry> {
    const delay = options.delay ?? defaultDelay
    const { signal } = options
    let entry = initial

    const emit = (patch: Partial<ConversionEntry>, log?: ConversionLog) => {
        entry = {
            ...entry,
            ...patch,
            logs: log ? [...entry.logs, log] : entry.logs,
        }
        onChange(entry)
    }
    const fail = (step: ConversionStepId, message: string) => {
        emit(
            {
                status: "error",
                error: message,
                finishedAt: Date.now(),
                failedStep: step,
            },
            { step, text: `✗ ${message}`, tone: "error" }
        )
        return entry
    }
    const message = conversionErrorMessage

    // receive — client-side acceptance + the upload round-trip.
    emit(
        { status: "uploading" },
        {
            step: "receive",
            text: `> ${entry.name} (${formatBytes(entry.size)})`,
            tone: "info",
        }
    )
    if (!entry.sourceFormat) {
        return fail("receive", "This file type cannot be converted.")
    }
    emit(
        {},
        {
            step: "receive",
            text: `✓ File type validated — source "${entry.sourceFormat}"`,
            tone: "success",
        }
    )

    let jobId: string
    try {
        ;({ jobId } = await CorporaApi.createConversion({
            file,
            sourceFormat: entry.sourceFormat as never,
            name: entry.name.replace(/\.[^.]+$/, ""),
        }))
    } catch (error) {
        return fail("receive", message(error))
    }
    if (signal?.aborted) return entry
    emit(
        { jobId, status: "queued" },
        {
            step: "validate",
            text: `> Job ${jobId} created — tracking conversion`,
            tone: "info",
        }
    )

    // Poll loop — payload is ConversionJob.to_dict(); new log lines land on
    // the step implied by the CURRENT server status.
    let seenLogs = 0
    let reachedJob = false
    let earlyFailures = 0
    while (true) {
        await delay(POLL_INTERVAL_MS)
        if (signal?.aborted) return entry

        let job: JobStatusMessage
        try {
            job = await CorporaApi.getConversion(jobId)
            reachedJob = true
        } catch (error) {
            // Vercel fan-out: the first polls can land on an instance that never
            // saw the job — tolerate a few before concluding it is gone.
            if (!reachedJob && ++earlyFailures <= FIRST_POLL_RETRIES) continue
            return fail(entry.status === "queued" ? "validate" : "convert", message(error))
        }
        if (signal?.aborted) return entry

        const step = STEP_FOR_SERVER_STATUS[job.status]
        for (const line of job.logs.slice(seenLogs)) {
            emit({}, { step, text: `> ${line}`, tone: "info" })
        }
        seenLogs = job.logs.length

        if (job.status === "failed") {
            return fail("convert", job.error ?? "Conversion failed.")
        }
        const named: Partial<ConversionEntry> = {}
        if (job.display_name && job.display_name !== entry.displayName) {
            named.displayName = job.display_name
        }
        if (job.result_filename && job.result_filename !== entry.resultFilename) {
            named.resultFilename = job.result_filename
        }
        if (job.status === "running" && entry.status !== "converting") {
            named.status = "converting"
        }
        if (Object.keys(named).length > 0) emit(named)
        if (job.status === "succeeded") break
    }

    // index — POST /validate (annotates, never gates) + the archive download.
    emit(
        { status: "validating", validation: { status: "running" } },
        { step: "index", text: "> Validating dataset…", tone: "info" }
    )
    const report = await CorporaApi.validateConversion(jobId)
    if (signal?.aborted) return entry
    if (report.status === "valid") {
        const slots = report.stats?.max_slot
        emit(
            { validation: report },
            {
                step: "index",
                text: `✓ Corpus validated${slots ? ` — ${slots.toLocaleString("en-US")} slots` : ""}`,
                tone: "success",
            }
        )
    } else if (report.status === "invalid") {
        // The verdict annotates the conversion; the download still proceeds.
        emit(
            { validation: report },
            {
                step: "index",
                text: `✗ Validation failed: ${report.reasons?.[0] ?? "unknown reason"}`,
                tone: "error",
            }
        )
    } else {
        emit({ validation: report }, { step: "index", text: "> Validation skipped", tone: "info" })
    }

    let blob: Blob
    try {
        blob = await CorporaApi.downloadConversion(jobId)
    } catch (error) {
        return fail("index", message(error))
    }
    if (signal?.aborted) return entry

    emit(
        {
            status: "ready",
            finishedAt: Date.now(),
            corpusBlob: blob,
            corpusName: entry.resultFilename ?? entry.name.replace(/\.[^.]+$/, ".corpus"),
            corpusSize: blob.size,
        },
        { step: "index", text: "✓ Archive downloaded — corpus ready", tone: "success" }
    )
    return entry
}
