# Data-Access Contract: Project Detail

**Feature**: 002-project-detail | **Date**: 2026-07-19
Route modules import ONLY from these modules — never `supabase-js` directly (Constitution II). All functions throw `DataError` (from `app/lib/projects.ts`) with the 001 codes plus one addition: `"already-attached"` (duplicate license attachment, Postgres 23505 on `project_licenses`).

## Shared vocabulary types (extend `app/lib/projects.ts` or a small `app/lib/enums.ts`)

```ts
export type ProjectStatus = "draft" | "started" | "progress" | "completed" | "failed"
export type BookType =
  | "bible" | "commentary" | "lexicon" | "biography" | "review"
  | "manuscript" | "tanakh" | "quran" | "apocrypha" | "regular"
export type LanguageType =
  | "hebrew" | "greek" | "syriac" | "arabic" | "aramaic" | "protoCuneiform"
  | "akkadian" | "ugaritic" | "pali" | "latin" | "dutch" | "french" | "italian" | "english"
export type CategoryType = "biblical" | "religious" | "literary" | "historical" | "paratext"
export type LicenseStatus = "active" | "retired" | "superseded"

export const SCRIPTURAL_TYPES = ["bible", "tanakh", "quran", "apocrypha"] as const
export const CATEGORIZED_TYPES = ["biography", "commentary", "review"] as const

/** Discriminated classification value — makes illegal combinations untypeable. */
export type Classification =
  | { type: "bible" | "tanakh" | "quran" | "apocrypha"; language: LanguageType }
  | { type: "biography" | "commentary" | "review"; category: CategoryType }
  | { type: "lexicon" | "manuscript" | "regular" }
  | null // unclassified
```

## `app/lib/projects.ts` (extended)

```ts
export interface ProjectSummary {
  // 001 fields unchanged, plus:
  status: ProjectStatus
  type: BookType | null
}

export interface ProjectDetail extends ProjectSummary {
  // 001 fields (corpora, references) unchanged, plus:
  language: LanguageType | null
  category: CategoryType | null
  creator: { id: string; name: string | null; username: string }        // never null (FR-015)
  organization: { id: string; name: string; website: string | null } | null
  licenses: AttachedLicense[]                                            // from app/lib/licenses.ts
}

/** createProject now REQUIRES the creating user (FR-015). */
export function createProject(input: {
  name: string
  description?: string
  userId: string          // validation error if missing/empty
}): Promise<ProjectSummary>

/** Set lifecycle status (FR-004). Touches updated_at. */
export function updateProjectStatus(id: string, status: ProjectStatus): Promise<void>

/**
 * Atomically set type + conditional value in ONE update (FR-006..FR-009, research R2).
 * Passing null clears classification. Throws "validation" if the combination
 * is illegal (mirrors the DB constraint; DB remains the enforcement of record).
 */
export function classifyProject(id: string, classification: Classification): Promise<void>

/** Assign or clear the organization (FR-014). Touches updated_at. */
export function setProjectOrganization(id: string, organizationId: string | null): Promise<void>
```

`getProject` / `listProjects` return the extended shapes (single nested select — creator, organization, and licenses join in the detail query; list adds `status`/`type` columns only).

## `app/lib/users.ts` (NEW — read-only directory, FR-018)

```ts
export interface DirectoryUser {
  id: string
  name: string | null
  username: string
  email: string
}

/** Seeded user directory, ordered by name. Empty ⇒ UI blocks creation with a message (FR-015). */
export function listUsers(): Promise<DirectoryUser[]>
```

## `app/lib/licenses.ts` (NEW)

```ts
export interface CatalogLicense {
  id: string                       // natural key, e.g. "CC-BY-4.0"
  title: string
  url: string | null
  domains: { content: boolean; data: boolean; software: boolean }
  status: LicenseStatus            // retired/superseded rendered as discouraged
  family: string | null
  maintainer: string | null
}

export interface AttachedLicense extends CatalogLicense {
  agreedAt: string
  agreedBy: { id: string; name: string | null; username: string }
}

/** Full catalog (may be empty pre-seed — FR-011 empty state). */
export function listLicenses(): Promise<CatalogLicense[]>

/**
 * Attach with agreement (FR-010/FR-012). agreedByUserId = the visitor's selected user.
 * Throws "already-attached" on duplicate. Touches projects.updated_at.
 */
export function attachLicense(projectId: string, licenseId: string, agreedByUserId: string): Promise<void>

/** Detach one license; others unaffected (FR-013). Touches projects.updated_at. */
export function detachLicense(projectId: string, licenseId: string): Promise<void>
```

## `app/lib/organizations.ts` (NEW)

```ts
export interface Organization {
  id: string
  name: string
  website: string | null
}

/** All organizations, ordered by name (pick-or-create dialog). */
export function listOrganizations(): Promise<Organization[]>

/** Create with required non-empty name (FR-014); "validation" error otherwise. */
export function createOrganization(input: { name: string; website?: string }): Promise<Organization>
```

## Route contract (UI seam)

- `/project` (`project.tsx`): `clientLoader` additionally returns `listUsers()` for the create dialog; `clientAction` `create` intent now carries `userId`. List rows render a status badge.
- `/project/:projectId` (`project.$projectId.tsx`): `clientLoader` returns extended `ProjectDetail` plus `listLicenses()`, `listOrganizations()`, `listUsers()` (for agreement attribution). `clientAction` intents added: `set-status`, `classify`, `attach-license`, `detach-license`, `set-organization`, `create-organization`. All errors surface via the 001 error-banner pattern; nothing fails silently (Constitution IV).

## Testing contract (Constitution III)

Every function above gets a Vitest test with `getSupabase` mocked at the module boundary: success shape mapping, error mapping (including 23505 → `already-attached`), and validation throws (`classifyProject` illegal combos, `createProject` missing `userId`). Route tests via `createRoutesStub` cover: status badge render, conditional classify dialog fields, empty license catalog state, empty user directory blocking creation, and creator display.
