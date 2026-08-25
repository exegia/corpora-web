import { getSupabase } from "@/lib/supabase"
import { CORPORA_API_URL, EXTENSION_TO_FORMAT, KIND_BY_STATUS } from "./constants"
import { fetchCorpusIndex, listStoredCorpora } from "./methods"
import { CorporaApiError, type CorpusArchive, type ExploreRef, type SourceFormat } from "./types"

export function matchesHubFilename(stored: string, stems: Set<string>): boolean {
    const stem = stored.replace(/\.corpus$/i, "").toLowerCase()
    return stems.has(stem) || stems.has(stored.toLowerCase())
}

export function isQuietMiss(error: unknown): boolean {
    return (
        error instanceof CorporaApiError &&
        (error.kind === "not-found" || error.kind === "not-ready" || error.kind === "unreachable")
    )
}

export async function loadHubArchive(document: {
    filename: string | null
    name: string
}): Promise<CorpusArchive | null> {
    const candidates = hubFilenameCandidates(document)
    const stems = new Set(candidates.map(name => name.replace(/\.corpus$/i, "").toLowerCase()))
    try {
        const listed = await listStoredCorpora()
        const match = listed.find(item => matchesHubFilename(item.filename, stems))
        if (!match) return null
        const index = await fetchCorpusIndex({ kind: "hub", key: match.filename })
        return { kind: "hub", key: match.filename, index }
    } catch (error) {
        if (error instanceof CorporaApiError && error.kind === "unreachable") {
            return null
        }
    }
    for (const filename of candidates) {
        try {
            const index = await fetchCorpusIndex({ kind: "hub", key: filename })
            return { kind: "hub", key: filename, index }
        } catch (error) {
            if (error instanceof CorporaApiError && error.kind === "unreachable") {
                return null
            }
        }
    }
    return null
}

export function exploreBase(ref: ExploreRef): string {
    const id = encodeURIComponent(ref.key)
    return ref.kind === "job" ? `/convert/${id}` : `/storage/${id}`
}

export function withQuery(path: string, query: Record<string, string | number | null | undefined>): string {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
        if (value == null || value === "") continue
        params.set(key, String(value))
    }
    const suffix = params.toString()
    return suffix ? `${path}?${suffix}` : path
}

/** Turn a library name or upload filename into a Hub `.corpus` archive name. */
export function asCorpusFilename(name: string): string {
    const trimmed = name.trim()
    if (!trimmed) return ""
    if (/\.corpus$/i.test(trimmed)) return trimmed
    const stem = trimmed.replace(/\.[^./]+$/, "")
    return `${stem}.corpus`
}

/** Hub filenames to try for a library document, in lookup order. */
export function hubFilenameCandidates(document: { filename: string | null; name: string }): string[] {
    const seen = new Set<string>()
    const names: string[] = []
    for (const raw of [document.filename, document.name]) {
        if (!raw) continue
        const filename = asCorpusFilename(raw)
        const key = filename.toLowerCase()
        if (!filename || seen.has(key)) continue
        seen.add(key)
        names.push(filename)
    }
    return names
}

export async function errorFrom(response: Response): Promise<CorporaApiError> {
    let detail: string | null = null
    try {
        const body = (await response.json()) as { detail?: unknown }
        if (typeof body?.detail === "string") detail = body.detail
    } catch {
        // Non-JSON error body — the status code carries the meaning.
    }
    const kind = KIND_BY_STATUS[response.status] ?? "server"
    return new CorporaApiError(kind, detail ?? `The conversion service replied ${response.status}.`, response.status)
}

/**
 * Fetch with the Supabase bearer token attached whenever a session exists.
 * The deployment currently runs auth_required:false, so this is dormant —
 * but flipping auth on server-side requires no client change (research R4).
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers)
    try {
        const { data } = await getSupabase().auth.getSession()
        const token = data.session?.access_token
        if (token) headers.set("Authorization", `Bearer ${token}`)
    } catch {
        // No session available — the service is open today; proceed anonymous.
    }
    let response: Response
    try {
        response = await fetch(`${CORPORA_API_URL}${path}`, { ...init, headers })
    } catch {
        throw new CorporaApiError("unreachable", "The conversion service could not be reached.")
    }
    if (!response.ok) throw await errorFrom(response)
    return response
}

/** The `source_format` for a filename, or null when unsupported. */
export function detectSourceFormat(filename: string): SourceFormat | null {
    const ext = filename.split(".").pop()?.toLowerCase() ?? ""
    return EXTENSION_TO_FORMAT[ext] ?? null
}
