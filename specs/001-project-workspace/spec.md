# Feature Specification: Project Workspace

**Feature Branch**: `001-project-workspace`
**Created**: 2026-07-19
**Status**: Draft
**Input**: User description: "Project workspace: create and manage projects that link corpora, references, and notes in the /project route"

## Clarifications

### Session 2026-07-19

- Q: Where is project data stored? → A: User, project, and corpus metadata are stored in a cloud database (Supabase Postgres); corpus files themselves are stored in a Hugging Face bucket, not in the database
- Q: Are notes in scope for v1? → A: No — the notes feature is dropped for now
- Q: Who can access the project workspace, and how are projects scoped? → A: Anonymous access for now (no sign-in); authentication will be added later by a separate `corpora-auth` project developed in parallel
- Q: With anonymous access, whose projects does a visitor see? → A: One shared pool — all visitors see and can edit the same projects until authentication ships (accepted temporary state)
- Q: How are concurrent edits to the same project handled in v1? → A: Last write wins — the most recent save overwrites; no conflict detection

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create and manage projects (Priority: P1)

A researcher opens the Project area and creates a new project by giving it a name and an optional description. They can see all their projects in a list, open any project to view its workspace, rename or edit its description later, and delete projects they no longer need.

**Why this priority**: Projects are the container everything else attaches to. Without the ability to create, open, and manage a project, no other part of the feature can exist. This story alone is a viable MVP: a working project list and workspace shell.

**Independent Test**: Can be fully tested by creating a project, seeing it appear in the project list, opening it, renaming it, and deleting it — with no corpora, references, or notes involved.

**Acceptance Scenarios**:

1. **Given** the user has no projects, **When** they open the Project area, **Then** they see an empty state that invites them to create their first project.
2. **Given** the user is in the Project area, **When** they create a project with a name, **Then** the project appears in the project list and its workspace can be opened.
3. **Given** an existing project, **When** the user renames it or edits its description, **Then** the updated details are shown everywhere the project appears.
4. **Given** an existing project, **When** the user deletes it and confirms the action, **Then** the project and its workspace contents are removed from the list.
5. **Given** the user attempts to create a project without a name, **When** they try to save, **Then** they are told a name is required and no project is created.

---

### User Story 2 - Link corpora to a project (Priority: P2)

Within a project workspace, the user attaches corpora from their library so the project gathers the source texts it is about. They can see which corpora are linked, add more, and remove ones that no longer belong.

**Why this priority**: Connecting source material to a project is the core value of a workspace for a corpus-centric app — it turns an empty container into a meaningful research context. It depends on projects existing (P1) but on nothing else.

**Independent Test**: With at least one corpus available in the library, open a project, link a corpus, verify it appears in the project's linked-corpora list, then unlink it and verify it disappears — while the corpus itself remains untouched in the library.

**Acceptance Scenarios**:

1. **Given** an open project and a library containing corpora, **When** the user chooses to link a corpus, **Then** they can pick from the library's corpora and the chosen corpus appears in the project's linked list.
2. **Given** a project with a linked corpus, **When** the user unlinks it, **Then** it is removed from the project but remains available in the library.
3. **Given** a corpus already linked to the project, **When** the user browses corpora to link, **Then** the already-linked corpus is indicated as such and cannot be linked twice.
4. **Given** an open project with no linked corpora, **When** the user views the corpora section, **Then** an empty state explains how to link one.

---

### User Story 3 - Manage references in a project (Priority: P3)

The user collects bibliographic references (books, articles, web sources) inside a project so citations relevant to their research live alongside the corpora. They can add a reference with its citation details, edit it, and remove it.

**Why this priority**: References enrich a project but are not required for the workspace to be useful. They build on P1 and complement P2.

**Independent Test**: Open a project, add a reference with a title and author, verify it appears in the project's reference list, edit its details, then delete it.

**Acceptance Scenarios**:

1. **Given** an open project, **When** the user adds a reference with at least a title, **Then** the reference appears in the project's reference list.
2. **Given** an existing reference, **When** the user edits its details, **Then** the updated details are shown in the list.
3. **Given** an existing reference, **When** the user deletes it, **Then** it is removed from the project's reference list.
4. **Given** the user attempts to add a reference without a title, **When** they try to save, **Then** they are told a title is required and no reference is created.

---

### Edge Cases

- Deleting a project that contains linked corpora and references: the project's references are removed with it; linked corpora are only unlinked and remain in the library.
- A corpus that was linked to a project is later removed from the library: the project shows the link as unavailable rather than failing, and the user can remove the stale link.
- Duplicate project names: allowed, but each project remains individually identifiable (e.g., by description and dates); the user is not blocked from reusing a name.
- A save fails because the service is unreachable or returns an error: the user is shown a clear message that changes could not be saved rather than losing work silently.
- Very long names, descriptions, or reference details: the interface remains usable (truncation or wrapping in lists) and content is preserved in full.
- The user navigates away mid-edit of a reference: either the change is saved or the user is warned about unsaved changes — work is never silently discarded.
- Two sessions edit the same project or reference at the same time: the most recent save wins and overwrites the earlier one; no conflict detection or merge is attempted in v1.
- A record open in one session was deleted by another session: the next save or refresh surfaces a clear "no longer exists" message instead of failing silently.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to create a project with a required name and an optional description.
- **FR-002**: Users MUST be able to view a list of all projects (one shared pool in v1), including each project's name and last-updated time.
- **FR-003**: Users MUST be able to open a project to view its workspace, which presents the project's linked corpora and references.
- **FR-004**: Users MUST be able to rename a project and edit its description.
- **FR-005**: Users MUST be able to delete a project, with a confirmation step before deletion; deleting a project removes its references and unlinks (but does not delete) its corpora.
- **FR-006**: Users MUST be able to link corpora from their library to a project and unlink them; unlinking never removes the corpus from the library.
- **FR-007**: System MUST prevent the same corpus from being linked to the same project more than once.
- **FR-008**: System MUST surface a stale corpus link (corpus no longer in the library) as unavailable and allow the user to remove it.
- **FR-009**: Users MUST be able to add references to a project with a required title and optional citation details (such as authors, year, publication, and source link), and to edit and delete them.
- **FR-010**: System MUST record and display creation and last-updated times for projects.
- **FR-011**: System MUST persist all project metadata (projects, corpus links, references) to the cloud database so it survives closing and reopening the app; access is anonymous in v1, and the data model MUST be able to attach an owning user later without migration of meaning (ownership fields may be empty until authentication ships).
- **FR-012**: System MUST show helpful empty states when there are no projects, or when a project has no linked corpora or references.
- **FR-013**: System MUST inform the user when a change cannot be saved instead of failing silently.

### Key Entities

- **User**: An account identity that will own projects once authentication ships (delivered by the separate `corpora-auth` project); in v1 access is anonymous and project records carry no owner.
- **Project**: A named workspace with an optional description and creation/last-updated times; the container for linked corpora and references. Stored as metadata in the cloud database; carries a placeholder for an owning user that stays empty until authentication ships.
- **Corpus Link**: An association between a project and a corpus metadata record; carries no copy of the corpus files themselves (which live in bucket storage) and can become stale if the corpus leaves the library.
- **Reference**: A bibliographic entry belonging to one project; has a required title and optional citation details (authors, year, publication, source link). Stored as metadata in the cloud database.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time user can create a project and open its workspace in under 1 minute without instructions.
- **SC-002**: Linking an existing corpus to a project takes no more than 3 user actions from within the project workspace.
- **SC-003**: 100% of projects, links, and references created in a session are present after fully closing and reopening the app.
- **SC-004**: A user with 50 projects can locate and open a specific project in under 10 seconds.
- **SC-005**: Deleting a project is never completed without explicit user confirmation, and acceptance testing records zero instances of unintended data loss across all delete flows.

## Assumptions

- User, project, and corpus metadata live in a managed cloud database (Supabase Postgres); corpus files live in Hugging Face bucket storage and are never stored in the database. This feature reads and writes metadata only.
- Corpora themselves are managed in the Library area; this feature only links to corpus metadata records and never modifies, uploads, or deletes corpus files.
- References are entered manually in v1; importing citation files or auto-fetching metadata is out of scope.
- The Library area may not yet expose corpora when this feature ships; the linking flow is specified against whatever corpus metadata records exist, including none (empty state).
- Deleting a reference may use a lighter confirmation (or undo) than project deletion, as long as no destructive action happens without user intent.
- The notes feature is deferred; nothing in this feature should preclude adding notes to projects later.
- Access is anonymous in v1: no sign-in, no per-user isolation — all visitors see and can edit one shared pool of projects. This is an accepted temporary state; authentication and ownership arrive later via the separate `corpora-auth` project, and this feature must not block that (see FR-011).
- An internet connection is required; there is no offline mode in v1. Failed saves surface a clear error (FR-013) rather than queueing changes.
