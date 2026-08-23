// Conversion pipeline for the Corpus route (004-connect-with-py). The state
// model mirrors the corpora-py client contract: statuses are STORED on a
// single tracked entry, the visible step timeline is DERIVED, never stored.
// `runConversion` drives the REAL service through app/lib/corpora-api by
// polling — on the deployed backend the in-flight poll request is what
// advances the job, so there is deliberately no WebSocket path (see
// specs/004-connect-with-py/research.md R1). Route modules import ONLY from
// this module.

import {
  CorporaApiError,
  createConversion,
  detectSourceFormat,
  downloadConversion,
  getConversion,
  SUPPORTED_EXTENSIONS,
  validateConversion,
} from "@/lib/corpora-api"
import type { JobStatusMessage } from "@/lib/corpora-api"

/** Mirrors corpora-py's UploadStatus verbatim. */
export type ConversionStatus =
  | "uploading"
  | "queued"
  | "converting"
  | "validating"
  | "ready"
  | "success"
  | "error"

export type ConversionStepId = "receive" | "validate" | "convert" | "index"

export type ConversionStepState = "pending" | "active" | "completed" | "failed"

export type LogTone = "info" | "success" | "error"

export interface ConversionLog {
  step: ConversionStepId
  text: string
  tone: LogTone
}

/** Verdict of the post-conversion validation (corpora-py POST /validate). */
export interface ValidationOutcome {
  status: "running" | "valid" | "invalid" | "skipped"
  reasons?: string[]
  /** Raw CorpusStats (max_slot, node_types, node_features, edge_features). */
  stats?: Record<string, number>
}

/** The tracked upload — the UploadEntry subset this app needs. */
export interface ConversionEntry {
  id: string
  name: string
  size: number
  type: string
  status: ConversionStatus
  error: string | null
  lastModified: number
  /** When the conversion started on the client (Date.now()). */
  uploadedAt: number
  /** Ended (ready or error), for the "Completed in …" footer. */
  finishedAt: number | null
  /** `source_format` as sent to POST /convert ("tei", "epub", …). */
  sourceFormat: string | null
  logs: ConversionLog[]
  /** Server-assigned job id, set once POST /convert responds. */
  jobId: string | null
  validation: ValidationOutcome | null
  corpusName: string | null
  corpusSize: number | null
  /** The downloaded archive, present once status is "ready". */
  corpusBlob: Blob | null
  /** The step a failed run stopped in (set when status turns "error"). */
  failedStep: ConversionStepId | null
}

export interface ConversionStep {
  id: ConversionStepId
  title: string
  state: ConversionStepState
  logs: ConversionLog[]
}

export const CONVERSION_STEPS: ReadonlyArray<{
  id: ConversionStepId
  title: string
}> = [
  { id: "receive", title: "File received" },
  { id: "validate", title: "Validating source" },
  { id: "convert", title: "Converting to .corpus" },
  { id: "index", title: "Validating & finalizing" },
]

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`
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

const ACTIVE_STEP: Partial<Record<ConversionStatus, ConversionStepId>> = {
  uploading: "receive",
  queued: "validate",
  converting: "convert",
  validating: "index",
}

const STEP_ORDER: ConversionStepId[] = ["receive", "validate", "convert", "index"]

/** The step currently running (or failed), and its 1-based position. */
export function currentStep(entry: ConversionEntry): {
  id: ConversionStepId
  index: number
} {
  const id =
    entry.status === "error"
      ? erroredStep(entry)
      : (ACTIVE_STEP[entry.status] ?? "index")
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
    logs: entry.logs.filter((log) => log.step === id),
  }))
}

/** Step-completion progress in [0, 1] for the drawer's progress bar. */
export function deriveProgress(entry: ConversionEntry): number {
  const steps = deriveSteps(entry)
  return steps.filter((step) => step.state === "completed").length / steps.length
}

const POLL_INTERVAL_MS = 2_000

/** First polls tolerate instance fan-out: retry this often before failing. */
const FIRST_POLL_RETRIES = 3

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

const defaultDelay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

export interface RunConversionOptions {
  signal?: AbortSignal
  /** Injectable for tests; defaults to setTimeout. */
  delay?: (ms: number) => Promise<void>
}

/** Server status → the step its log lines belong to while it lasts. */
const STEP_FOR_SERVER_STATUS: Record<JobStatusMessage["status"], ConversionStepId> = {
  queued: "validate",
  running: "convert",
  succeeded: "index",
  failed: "convert",
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
  options: RunConversionOptions = {},
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
      { step, text: `✗ ${message}`, tone: "error" },
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
    },
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
    },
  )

  let jobId: string
  try {
    ;({ jobId } = await createConversion({
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
    },
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
      job = await getConversion(jobId)
      reachedJob = true
    } catch (error) {
      // Vercel fan-out: the first polls can land on an instance that never
      // saw the job — tolerate a few before concluding it is gone.
      if (!reachedJob && ++earlyFailures <= FIRST_POLL_RETRIES) continue
      return fail(
        entry.status === "queued" ? "validate" : "convert",
        message(error),
      )
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
    if (job.status === "running" && entry.status !== "converting") {
      emit({ status: "converting" })
    }
    if (job.status === "succeeded") break
  }

  // index — POST /validate (annotates, never gates) + the archive download.
  emit(
    { status: "validating", validation: { status: "running" } },
    { step: "index", text: "> Validating dataset…", tone: "info" },
  )
  const report = await validateConversion(jobId)
  if (signal?.aborted) return entry
  if (report.status === "valid") {
    const slots = report.stats?.max_slot
    emit(
      { validation: report },
      {
        step: "index",
        text: `✓ Corpus validated${slots ? ` — ${slots.toLocaleString("en-US")} slots` : ""}`,
        tone: "success",
      },
    )
  } else if (report.status === "invalid") {
    // The verdict annotates the conversion; the download still proceeds.
    emit(
      { validation: report },
      {
        step: "index",
        text: `✗ Validation failed: ${report.reasons?.[0] ?? "unknown reason"}`,
        tone: "error",
      },
    )
  } else {
    emit(
      { validation: report },
      { step: "index", text: "> Validation skipped", tone: "info" },
    )
  }

  let blob: Blob
  try {
    blob = await downloadConversion(jobId)
  } catch (error) {
    return fail("index", message(error))
  }
  if (signal?.aborted) return entry

  emit(
    {
      status: "ready",
      finishedAt: Date.now(),
      corpusBlob: blob,
      corpusName: entry.name.replace(/\.[^.]+$/, ".corpus"),
      corpusSize: blob.size,
    },
    { step: "index", text: "✓ Archive downloaded — corpus ready", tone: "success" },
  )
  return entry
}
