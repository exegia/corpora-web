export type JobStatus = "queued" | "running" | "succeeded" | "failed"

/** ConversionJob.to_dict() — identical shape for polling and WS frames. */
export interface JobStatusMessage {
    id: string
    source_format: string
    name: string
    /** Source-derived title; null while the job is still queued. */
    display_name: string | null
    status: JobStatus
    created_at: number
    started_at: number | null
    finished_at: number | null
    error: string | null
    logs: string[]
    last_log: string | null
    /** Slug of display_name (or request name), always `*.corpus`. */
    result_filename: string
    download_ready: boolean
}

/**
 * Formats the service can actually convert. The server enum also contains
 * "xml", but no converter is registered for it (422 after upload) — never
 * send it; `.xml` routes to "tei" (corpora-py#105).
 */
export type SourceFormat = "epub" | "html" | "tei" | "pdf" | "plain" | "tf_zip" | "tei_zip"

export type CorporaApiErrorKind =
    | "unreachable"
    | "unauthorized"
    | "not-found"
    | "not-ready"
    | "too-large"
    | "unsupported"
    | "queue-full"
    | "read-only"
    | "server"

export class CorporaApiError extends Error {
    kind: CorporaApiErrorKind
    status?: number

    constructor(kind: CorporaApiErrorKind, message: string, status?: number) {
        super(message)
        this.name = "CorporaApiError"
        this.kind = kind
        this.status = status
    }
}

export interface Capabilities {
    authRequired: boolean
    hubWritable: boolean
}

export interface ValidationReport {
    status: "valid" | "invalid" | "skipped"
    reasons?: string[]
    /** CorpusStats: max_slot, node_types, node_features, edge_features. */
    stats?: Record<string, number>
}

export interface StoredCorpus {
    filename: string
    size_bytes: number | null
    repo_id: string
    url: string
}

/** Job result or a published Hub archive — builds the explore URL prefix. */
export interface ExploreRef {
    kind: "job" | "hub"
    key: string
}

export interface SectionEntry {
    title: string
    ref: string
    otype?: string
    child_count?: number
    nodes?: number | null
    words?: number | null
    truncated?: boolean
}

export interface IndexItem extends SectionEntry {
    children: SectionEntry[]
}

export interface IndexSections {
    levels: string[]
    items: IndexItem[]
}

export interface NodeTypeCount {
    type: string
    count: number
    avg_slots?: number
    is_slot?: boolean
}

/** GET …/index */
export interface CorpusIndex {
    toc: unknown
    sections: IndexSections | null
    node_types: NodeTypeCount[]
}

export interface PassageToken {
    text: string
    after: string
    node: number | null
}

export interface CorpusPassage {
    ref: string
    text: string
    node?: number
    tokens?: PassageToken[]
}

/** GET …/content */
export interface ContentResponse {
    ref: string | null
    format: string
    passages: CorpusPassage[]
    total: number
    offset: number
    limit: number
    next_offset: number | null
}

export interface ContentQuery {
    ref?: string | null
    fmt?: string | null
    offset?: number
    limit?: number
}

export interface SectionsQuery {
    parent?: string | null
    offset?: number
    limit?: number
}

export interface SectionsResponse {
    parent: string | null
    levels: string[]
    items: SectionEntry[]
    total: number
    offset: number
    limit: number
    next_offset: number | null
}

export interface NodeContext {
    node: number
    otype: string
    ref: string
}

/** GET …/nodes/{node} */
export interface CorpusNode {
    node: number
    otype: string
    is_slot: boolean
    slot_type: string | null
    first_slot: number | null
    last_slot: number | null
    section_ref: string | null
    text: string
    features: Record<string, unknown>
    annotation: Record<string, unknown> | null
    node_types: string[]
    context?: NodeContext[]
    occurrences?: number
    occurrences_in_section?: number
}

export type CorpusVersionFileKind = "added" | "modified" | "deleted"

export interface CorpusVersionFile {
    path: string
    kind: CorpusVersionFileKind
}

export interface CorpusVersionActor {
    sub: string | null
    name?: string | null
}

/** GET …/versions row — history.yml. Extra fields are optional so older payloads type-check. */
export interface CorpusVersion {
    id: string
    label: string
    title: string
    at: string
    current: boolean
    snapshot_key?: string | null
    /** Ignored; may be absent once history.yml replaces git. */
    sha?: string | null
    files?: CorpusVersionFile[]
    author?: CorpusVersionActor | null
    approved_by?: CorpusVersionActor | null
    notes?: string[]
}

export interface VersionsResponse {
    versions: CorpusVersion[]
}

export interface CorpusArchive extends ExploreRef {
    index: CorpusIndex
}

/** Editable subset of an archive's manifest (`ManifestUpdate` in corpora-py). */
export interface ManifestUpdate {
    name?: string
    description?: string
    language?: string
    languageCode?: string
}
