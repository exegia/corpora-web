import { getSupabase } from "@/lib/supabase"
import type { CorpusOption, ProjectDetail, ProjectSummary } from "./types"
import {
    fail,
    type LicenseRow,
    PROJECT_COLUMNS,
    PROJECT_DETAIL_COLUMNS,
    type ProjectDetailRow,
    type ProjectRow,
    toCommit,
    toSummary,
    UNKNOWN_CREATOR,
} from "./rows"

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
  return {
    ...toSummary(row),
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
    corpora: row.project_corpora
      .map((link) => ({
        corpusId: link.corpus_id,
        linkedAt: link.linked_at,
        corpus: link.corpora,
      }))
      .sort((a, b) => a.linkedAt.localeCompare(b.linkedAt)),
    corpus: row.corpus_documents
      ? {
          id: row.corpus_documents.id,
          name: row.corpus_documents.name,
          source: row.corpus_documents.source,
          path: row.corpus_documents.path,
          filename: row.corpus_documents.filename,
          uploadedAt: row.corpus_documents.uploaded_at,
        }
      : null,
    commits: (row.corpus_documents?.corpus_commits ?? [])
      .map(toCommit)
      .sort((a, b) => (b.committedAt ?? "").localeCompare(a.committedAt ?? "")),
  }
}

// ---- Corpus links (US2) ---------------------------------------------------

export async function listCorpusOptions(projectId: string): Promise<CorpusOption[]> {
  const supabase = getSupabase()
  const [corpora, links] = await Promise.all([
    supabase
      .from("corpora")
      .select("id, name, language, type, available")
      .order("name", { ascending: true }),
    supabase.from("project_corpora").select("corpus_id").eq("project_id", projectId),
  ])
  if (corpora.error) fail("Could not load the corpus library", corpora.error)
  if (links.error) fail("Could not load linked corpora", links.error)

  const linked = new Set(
    ((links.data ?? []) as { corpus_id: string }[]).map((l) => l.corpus_id),
  )
  return (
    (corpora.data ?? []) as {
      id: string
      name: string
      language: string | null
      type: string | null
      available: boolean
    }[]
  ).map((c) => ({ ...c, alreadyLinked: linked.has(c.id) }))
}
