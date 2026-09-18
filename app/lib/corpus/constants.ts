import {
    Book,
    BookA,
    BookOpenText,
    Feather,
    type LucideIcon,
    MessageSquareText,
    MoonStar,
    NotebookPen,
    Scroll,
    ScrollText,
    UserRound,
} from "lucide-react"
import type { BookType } from "../projects"
import type { ConversionStatus, ConversionStepId, CorpusType } from "./types"
import type { JobStatusMessage } from "../api"

export const CORPUS_BUCKET = "project-corpora"
export const DOCUMENT_COLUMNS = `id, name, source, path, filename, job_id, uploaded_at,
  corpus_type, source_format, licence, language, size_bytes, docs_count,
  nodes, words, status, converted_at, description, toc,
  corpus_commits ( id, sha, message, author_name, author_email, branch, committed_at )`
export const TYPE_ICONS: Record<BookType, LucideIcon> = {
    bible: BookOpenText,
    tanakh: ScrollText,
    quran: MoonStar,
    apocrypha: Scroll,
    commentary: MessageSquareText,
    lexicon: BookA,
    biography: UserRound,
    review: NotebookPen,
    manuscript: Feather,
    regular: Book,
}

/** Manifest "type" values mapped onto the app's corpus types. */
export const MANIFEST_TYPE_MAP: Record<string, CorpusType> = {
    text: "text",
    book: "text",
    bible: "text",
    web: "web",
    parallel: "parallel",
    speech: "speech",
    docs: "docs",
    document: "docs",
}

/** Server status → the step its log lines belong to while it lasts. */
export const STEP_FOR_SERVER_STATUS: Record<JobStatusMessage["status"], ConversionStepId> = {
    queued: "validate",
    running: "convert",
    succeeded: "index",
    failed: "convert",
}

export const POLL_INTERVAL_MS = 2_000

/** First polls tolerate instance fan-out: retry this often before failing. */
export const FIRST_POLL_RETRIES = 3

export const ACTIVE_STEP: Partial<Record<ConversionStatus, ConversionStepId>> = {
    uploading: "receive",
    queued: "validate",
    converting: "convert",
    validating: "index",
}

export const STEP_ORDER: ConversionStepId[] = ["receive", "validate", "convert", "index"]

export const CONVERSION_STEPS: ReadonlyArray<{
    id: ConversionStepId
    title: string
}> = [
    { id: "receive", title: "File received" },
    { id: "validate", title: "Validating source" },
    { id: "convert", title: "Converting to .corpus" },
    { id: "index", title: "Validating & finalizing" },
]

export const MAX_COMMITS = 500
