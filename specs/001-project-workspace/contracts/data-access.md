# Contract: Data-Access Layer (`app/lib/projects.ts`)

The single seam between UI and Supabase. Route modules import ONLY from this module (never `supabase-js` directly), so tests mock one module and the future auth cutover touches one file. All functions throw a typed `DataError` on failure; route `clientAction`s catch it and surface FR-013 error states.

```ts
// Row types come from generated app/types/database.ts
export interface ProjectSummary {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface ProjectDetail extends ProjectSummary {
  corpora: CorpusLink[]
  references: ProjectReference[]
}

export interface CorpusLink {
  corpusId: string
  linkedAt: string
  // null when the corpus row vanished mid-session; `available: false` = stale (FR-008)
  corpus: {
    uid: string
    name: string
    language: string | null
    type: string | null
    category: string | null
    version: string
    available: boolean
  } | null
}

export interface ProjectReference {
  id: string
  projectId: string
  title: string
  authors: string | null
  year: number | null
  publication: string | null
  url: string | null
  createdAt: string
  updatedAt: string
}

export interface CorpusOption {
  id: string
  name: string
  language: string | null
  type: string | null
  available: boolean
  alreadyLinked: boolean // drives FR-007 disabled state in the link dialog
}

// ---- Projects (US1) -------------------------------------------------------
export function listProjects(): Promise<ProjectSummary[]>            // updated_at desc (FR-002)
export function getProject(id: string): Promise<ProjectDetail | null> // null => "no longer exists" state
export function createProject(input: { name: string; description?: string }): Promise<ProjectSummary>
export function updateProject(id: string, input: { name?: string; description?: string | null }): Promise<ProjectSummary>
export function deleteProject(id: string): Promise<void>             // cascades links + references (FR-005)

// ---- Corpus links (US2) ---------------------------------------------------
export function listCorpusOptions(projectId: string): Promise<CorpusOption[]> // library corpora + alreadyLinked flags
export function linkCorpus(projectId: string, corpusId: string): Promise<void>   // PK violation => DataError('already-linked')
export function unlinkCorpus(projectId: string, corpusId: string): Promise<void> // never deletes the corpus (FR-006)

// ---- References (US3) -----------------------------------------------------
export function createReference(projectId: string, input: ReferenceInput): Promise<ProjectReference>
export function updateReference(id: string, input: Partial<ReferenceInput>): Promise<ProjectReference>
export function deleteReference(id: string): Promise<void>

export interface ReferenceInput {
  title: string          // required, trimmed non-empty (FR-009)
  authors?: string
  year?: number
  publication?: string
  url?: string
}

// ---- Errors ---------------------------------------------------------------
export class DataError extends Error {
  code: 'not-found' | 'already-linked' | 'validation' | 'unavailable' | 'unknown'
}
```

## Behavioral guarantees

| Guarantee | Source |
| --- | --- |
| `createProject`/`createReference` reject empty/whitespace name/title before hitting the network | FR-001, FR-009 |
| Mutations to projects' children also bump `projects.updated_at` (explicit update in the layer) so list ordering reflects activity | FR-002 |
| `linkCorpus` maps the composite-PK violation to `already-linked` instead of a raw Postgres error | FR-007 |
| No function ever deletes `corpora` rows or touches Hugging Face storage | FR-006, scope |
| Last write wins: updates are unconditional by id; `not-found` is returned when zero rows match | Clarification Q3 |
| All failures produce `DataError` with a user-presentable message; nothing fails silently | FR-013 |

## Route usage (contract, not implementation)

- `/project` — `clientLoader` → `listProjects`; `clientAction` (intent-based form data: `create` \| `update` \| `delete`) → corresponding functions; revalidation refreshes the list.
- `/project/:projectId` — `clientLoader` → `getProject` (+ `listCorpusOptions` lazily for the link dialog); `clientAction` intents: `update-project`, `delete-project`, `link-corpus`, `unlink-corpus`, `create-reference`, `update-reference`, `delete-reference`.
