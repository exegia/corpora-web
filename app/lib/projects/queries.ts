import { getSupabase } from "@/lib/supabase"
import { PROJECT_COLUMNS, PROJECT_DETAIL_COLUMNS, UNKNOWN_CREATOR } from "./constants"
import type {
    LicenseRow,
    DocumentRow,
    ProjectDetail,
    ProjectDetailRow,
    ProjectRow,
    ProjectSummary,
} from "./types"
import { fail, toCommit, toSummary } from "./utils"

// ---- Projects (US1) -------------------------------------------------------

export async function listProjects(): Promise<ProjectSummary[]> {
  const { data, error } = await getSupabase()
    .from("projects")
    .select(PROJECT_COLUMNS)
    .order("updated_at", { ascending: false })
  if (error) fail("Could not load projects", error)
  return ((data ?? []) as ProjectRow[]).map(toSummary)
}

export async function getProject(id: string): Promise<ProjectDetail | null> {
  const { data, error } = await getSupabase()
    .from("projects")
    .select(PROJECT_DETAIL_COLUMNS)
    .eq("id", id)
    .maybeSingle()
  if (error) fail("Could not load the project", error)
  if (!data) return null

  const row = data as unknown as ProjectDetailRow
  // Project rows are public; attachment identity is available only through
  // the session-checked lookup and the document's own access policy.
  let document: DocumentRow | null = null
  try {
    const lookup = await getSupabase().rpc("corpora_project_document_id", { p_project: id })
    if (!lookup.error && typeof lookup.data === "string") {
      const result = await getSupabase()
        .from("corpus_documents")
        .select(`id, name, source, path, filename, uploaded_at,
          corpus_commits ( id, sha, message, author_name, author_email, branch, committed_at )`)
        .eq("id", lookup.data)
        .maybeSingle()
      if (!result.error) document = result.data as DocumentRow | null
    }
  } catch {
    // A signed-out or unavailable lookup must not block the public project.
  }
  return {
    ...toSummary(row),
    ownerId: row.owner_id ?? null,
    languages: row.language ?? [],
    category: row.category,
    creator: row.user_directory ?? UNKNOWN_CREATOR,
    organization: row.organizations,
    licenses: row.project_licences
      .filter((attachment) => attachment.licences !== null)
      .map((attachment) => {
        const license = attachment.licences as LicenseRow
        return {
          id: license.id,
          title: license.title,
          url: license.url,
          domains: {
            content: license.domain_content,
            data: license.domain_data,
            software: license.domain_software,
          },
          status: license.status,
          family: license.family,
          maintainer: license.maintainer,
          // Paired by a check constraint: agreed_at without an agreeing user
          // (or the reverse) cannot exist, so both collapse to null together.
          agreedAt: attachment.agreed_at,
          agreedBy: attachment.agreed_at
            ? (attachment.user_directory ?? UNKNOWN_CREATOR)
            : null,
        }
      })
      // Pending first — it is the one attachment still asking for something.
      .sort((a, b) =>
        a.agreedAt === null || b.agreedAt === null
          ? Number(b.agreedAt === null) - Number(a.agreedAt === null)
          : a.agreedAt.localeCompare(b.agreedAt),
      ),
    corpora: [],
    corpus: document
      ? {
          id: document.id,
          name: document.name,
          source: document.source,
          path: document.path,
          filename: document.filename,
          uploadedAt: document.uploaded_at,
        }
      : null,
    commits: (document?.corpus_commits ?? [])
      .map(toCommit)
      .sort((a, b) => (b.committedAt ?? "").localeCompare(a.committedAt ?? "")),
  }
}

// Managed associations are loaded through the session-checked API.
export { listCorpusOptions, listLinkedCorpora } from "./managed-corpora"
