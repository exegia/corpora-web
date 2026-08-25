import { UNKNOWN_CAPABILITIES } from "./constants"
import {
    type Capabilities,
    type ContentQuery,
    type ContentResponse,
    CorporaApiError,
    type CorpusArchive,
    type CorpusIndex,
    type CorpusNode,
    type ExploreRef,
    type JobStatusMessage,
    type ManifestUpdate,
    type SectionsQuery,
    type SectionsResponse,
    type SourceFormat,
    type StoredCorpus,
    type ValidationReport,
    type VersionsResponse,
} from "./types"
import { apiFetch, exploreBase, isQuietMiss, loadHubArchive, withQuery } from "./utils"

// The single HTTP seam to the corpora-py conversion service (constitution
// Principle II): every request to api.exegia.co lives here — route modules
// and components never fetch it directly. Types mirror the backend verbatim;
// see specs/004-connect-with-py/contracts/corpora-api.md for the contract
// and research.md for the poll-only transport rationale.

let capabilitiesPromise: Promise<Capabilities> | null = null

/** Memoized; a failed probe resolves UNKNOWN and allows a later retry. */
export function fetchCapabilities(): Promise<Capabilities> {
    capabilitiesPromise ??= apiFetch("/capabilities")
        .then(async response => {
            const body = (await response.json()) as {
                auth_required?: boolean
                hub_writable?: boolean
            }
            return {
                authRequired: body.auth_required ?? true,
                hubWritable: body.hub_writable ?? false,
            }
        })
        .catch(() => {
            capabilitiesPromise = null
            return UNKNOWN_CAPABILITIES
        })
    return capabilitiesPromise
}

/** POST /convert — multipart upload; 202 with the job id. */
export async function createConversion(input: {
    file: File
    sourceFormat: SourceFormat
    name: string
    description?: string
}): Promise<{ jobId: string }> {
    const form = new FormData()
    form.set("file", input.file)
    form.set("source_format", input.sourceFormat)
    form.set("name", input.name)
    form.set("description", input.description ?? "")
    const response = await apiFetch("/convert", { method: "POST", body: form })
    const body = (await response.json()) as { job_id: string }
    return { jobId: body.job_id }
}

/**
 * GET /convert/{id}. On this deployment the poll is not just a status read:
 * the in-flight request is what advances the frozen function instance.
 */
export async function getConversion(jobId: string): Promise<JobStatusMessage> {
    const response = await apiFetch(`/convert/${encodeURIComponent(jobId)}`)
    return (await response.json()) as JobStatusMessage
}

/** GET /convert/{id}/download — the produced .corpus archive. */
export async function downloadConversion(jobId: string): Promise<Blob> {
    const response = await apiFetch(`/convert/${encodeURIComponent(jobId)}/download`)
    return response.blob()
}

/**
 * POST /validate by job id. An annotation, never a gate — any failure
 * (including an unreachable service) resolves "skipped" rather than throwing.
 */
export async function validateConversion(jobId: string): Promise<ValidationReport> {
    try {
        const response = await apiFetch("/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ job_id: jobId }),
        })
        const body = (await response.json()) as {
            valid?: boolean
            reasons?: string[]
            stats?: Record<string, number>
        }
        return {
            status: body.valid ? "valid" : "invalid",
            reasons: body.reasons,
            stats: body.stats,
        }
    } catch {
        return { status: "skipped" }
    }
}

// ── Corpus explore (job-scoped, Hub only for published imports) ──────────────
// Library conversions: GET /convert/{job_id}/{index,sections,content,nodes,versions}.
// Hugging Face imports: GET /storage/{filename}/… (publishing surface).
// Same response shapes on both prefixes.

/** GET /storage — published Hub archives (import / publish, not library explore). */
export async function listStoredCorpora(): Promise<StoredCorpus[]> {
    const response = await apiFetch("/storage")
    return (await response.json()) as StoredCorpus[]
}

/** GET {job|storage}/index */
export async function fetchCorpusIndex(ref: ExploreRef): Promise<CorpusIndex> {
    const response = await apiFetch(`${exploreBase(ref)}/index`)
    return (await response.json()) as CorpusIndex
}

/** GET {job|storage}/content */
export async function fetchCorpusContent(ref: ExploreRef, query: ContentQuery = {}): Promise<ContentResponse> {
    const response = await apiFetch(
        withQuery(`${exploreBase(ref)}/content`, {
            ref: query.ref,
            fmt: query.fmt,
            offset: query.offset,
            limit: query.limit,
        })
    )
    return (await response.json()) as ContentResponse
}

/** GET {job|storage}/sections */
export async function fetchCorpusSections(ref: ExploreRef, query: SectionsQuery = {}): Promise<SectionsResponse> {
    const response = await apiFetch(
        withQuery(`${exploreBase(ref)}/sections`, {
            parent: query.parent,
            offset: query.offset,
            limit: query.limit,
        })
    )
    return (await response.json()) as SectionsResponse
}

/** GET {job|storage}/nodes/{node} */
export async function fetchCorpusNode(ref: ExploreRef, node: number): Promise<CorpusNode> {
    const response = await apiFetch(`${exploreBase(ref)}/nodes/${node}`)
    return (await response.json()) as CorpusNode
}

/** GET {job|storage}/versions */
export async function fetchCorpusVersions(ref: ExploreRef): Promise<VersionsResponse> {
    const response = await apiFetch(`${exploreBase(ref)}/versions`)
    return (await response.json()) as VersionsResponse
}

/** POST /convert/{job_id}/restore — job-scoped only (issue #82 / py#148). */
export async function restoreCorpusVersion(ref: ExploreRef, versionId: string): Promise<VersionsResponse> {
    if (ref.kind !== "job") {
        throw new CorporaApiError("read-only", "Restore is only available for converted library corpora.")
    }
    const response = await apiFetch(`${exploreBase(ref)}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version_id: versionId }),
    })
    return (await response.json()) as VersionsResponse
}

/** PATCH /convert/{job_id}/manifest — job-scoped only. */
export async function patchJobManifest(jobId: string, updates: ManifestUpdate): Promise<Record<string, unknown>> {
    const response = await apiFetch(`${exploreBase({ kind: "job", key: jobId })}/manifest`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
    })
    return (await response.json()) as Record<string, unknown>
}

/** GET {job|storage}/download */
export async function downloadExploreCorpus(ref: ExploreRef): Promise<Blob> {
    const response = await apiFetch(`${exploreBase(ref)}/download`)
    return response.blob()
}

/** GET /storage/{filename}/download — published Hub archive. */
export async function downloadStoredCorpus(filename: string): Promise<Blob> {
    return downloadExploreCorpus({ kind: "hub", key: filename })
}

/**
 * Resolve a library document to an explore archive.
 *
 * Converted rows use the persisted job id (`GET /convert/{job_id}/index`).
 * A 404/409/unreachable job is an empty explorer, not an error. Hub listing
 * is only for Hugging Face imports — never the default for an upload row.
 */
export async function loadCorpusArchive(document: {
    jobId?: string | null
    source?: string
    filename: string | null
    name: string
}): Promise<CorpusArchive | null> {
    const jobId = document.jobId?.trim()
    if (jobId) {
        const ref: ExploreRef = { kind: "job", key: jobId }
        try {
            const index = await fetchCorpusIndex(ref)
            return { ...ref, index }
        } catch (error) {
            if (isQuietMiss(error)) return null
            return null
        }
    }
    if (document.source === "huggingface") {
        return loadHubArchive(document)
    }
    return null
}
