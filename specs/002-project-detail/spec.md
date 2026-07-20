# Feature Specification: Project Detail

**Feature Branch**: `002-project-detail`
**Created**: 2026-07-19
**Status**: Draft
**Input**: User description: "Complete the project feature: project detail with metadata (Project schema), license, organization, creating-user relationship, book type from BOOK_TYPES (with conditional language type for bible/tanakh/quran/apocrypha and category type for biography/commentary/review), and status"

## Clarifications

### Session 2026-07-19

- Q: Where do license catalog entries come from? → A: Pre-seeded into the database via a SQL seed (uploaded later); this feature provides no license-authoring UI.
- Q: How many licenses can a project carry? → A: One or more — a project can hold multiple licenses.
- Q: How many organizations can a project belong to? → A: One organization per project (confirmed).
- Q: Can a project's creator be anonymous? → A: No — every project must record a creating user; anonymous creation is not permitted.
- Q: How is the creating user established before authentication ships? → A: Seeded users — a dummy list of user records is pre-seeded in the database (like licenses); the visitor selects their user profile when creating a project, no passwords until `corpora-auth` ships; existing projects are backfilled to a seeded default user. Real users are expected to replace the dummy list soon.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View and edit full project metadata (Priority: P1)

A researcher opens an existing project and sees a detail view with the project's complete metadata: name, description, lifecycle status, creation date, and last-updated date. They can edit the name and description and move the project through its lifecycle (draft → started → progress → completed, or failed), and the changes are reflected everywhere the project appears.

**Why this priority**: The detail view with status is the backbone of "completing" the project feature — every other attribute in this feature (type, license, organization, creator) hangs off this view. It is independently valuable: even alone, it upgrades the workspace from a bare name/description container into a managed research project.

**Independent Test**: Open a project created in the existing workspace, verify its metadata is displayed, change its status from draft to started, edit its description, and confirm both changes persist and display after reloading.

**Acceptance Scenarios**:

1. **Given** an existing project, **When** the user opens its detail view, **Then** they see the project's name, description, status, created date, and last-updated date.
2. **Given** a project in draft status, **When** the user changes its status to started, **Then** the new status is shown in the detail view and in the project list.
3. **Given** a project detail view, **When** the user edits the name or description and saves, **Then** the updated values persist and the last-updated date reflects the change.
4. **Given** a newly created project, **When** the user views its detail, **Then** its status is draft by default.
5. **Given** any project, **When** the user views its status options, **Then** only the defined lifecycle statuses (draft, started, progress, completed, failed) are offered.

---

### User Story 2 - Classify a project by type with conditional detail (Priority: P2)

The user assigns a type to their project from the defined set of book types (bible, commentary, lexicon, biography, review, manuscript, tanakh, quran, apocrypha, regular). When the chosen type is a scriptural corpus type (bible, tanakh, quran, or apocrypha), the user is additionally asked for the source language (hebrew, greek, syriac, arabic, aramaic, protoCuneiform, akkadian, ugaritic, pali, latin, dutch, french, italian, english). When the chosen type is a secondary-literature type (biography, commentary, or review), the user is additionally asked for a category (biblical, religious, literary, historical, paratext). Other types (lexicon, manuscript, regular) require no additional classification.

**Why this priority**: Type classification gives projects domain meaning in a corpus-research app and drives the conditional metadata that distinguishes scriptural projects from secondary literature. It depends only on the detail view existing (P1).

**Independent Test**: Open a project detail, set type to "bible", verify a language field appears and is required; change type to "commentary", verify the language field is replaced by a category field; change type to "regular", verify neither extra field is shown.

**Acceptance Scenarios**:

1. **Given** a project detail view, **When** the user selects a type, **Then** the choice is limited to the defined book types.
2. **Given** the user selects type bible, tanakh, quran, or apocrypha, **When** the type is set, **Then** a language field appears offering only the defined language options, and the project cannot be saved with that type until a language is chosen.
3. **Given** the user selects type biography, commentary, or review, **When** the type is set, **Then** a category field appears offering only the defined category options, and the project cannot be saved with that type until a category is chosen.
4. **Given** the user selects type lexicon, manuscript, or regular, **When** the type is set, **Then** no additional classification field is shown or required.
5. **Given** a project typed bible with language hebrew, **When** the user changes the type to commentary, **Then** the language value no longer applies, and the user is asked for a category instead.
6. **Given** a project with no type assigned, **When** the user views the detail, **Then** the project is valid — type is optional until the user classifies it.

---

### User Story 3 - Attach licenses to a project (Priority: P3)

The user selects one or more licenses for their project from a catalog of known content/data/software licenses. The catalog is pre-seeded into the database (via a SQL seed uploaded separately); this feature only reads it. The detail view lists each attached license's title, link to its text, which domains it covers (content, data, software), and its lifecycle state (active, retired, superseded). When attaching a license, the user confirms agreement, and the project records for each license when the agreement happened and by whom.

**Why this priority**: Licensing matters for publishing and sharing corpus-derived work, but a project is fully usable without it. Builds on P1 only.

**Independent Test**: Open a project detail, attach two licenses from the catalog, verify both titles and domains display on the project with their agreement times, then remove one and verify only the other remains.

**Acceptance Scenarios**:

1. **Given** a project without licenses, **When** the user browses licenses to attach, **Then** they can see each catalog license's title, covered domains (content/data/software), and lifecycle state.
2. **Given** the user attaches a license, **When** they confirm agreement, **Then** the project lists the license with the date/time agreement was given and the agreeing user.
3. **Given** a project that already has a license, **When** the user attaches another, **Then** both licenses are listed on the project; the same catalog license cannot be attached twice to one project.
4. **Given** a license marked retired or superseded, **When** the user browses licenses, **Then** the license's state is clearly indicated so the user can prefer active licenses.
5. **Given** a project with attached licenses, **When** the user removes one, **Then** the detail view reflects the change and the remaining licenses are unaffected.
6. **Given** a project without licenses, **When** the user views the detail, **Then** the license area shows an empty state inviting them to choose one — licenses are optional.
7. **Given** the license catalog has not yet been seeded, **When** the user opens the license picker, **Then** an empty state explains no licenses are available yet — the rest of the detail view works normally.

---

### User Story 4 - Associate an organization and creator with a project (Priority: P4)

The user records which organization a project belongs to (name and optional website — at most one organization per project) and the project displays who created it. Every project records its creating user — anonymous creation is not permitted. When creating a project, the visitor picks their user profile from a pre-seeded user list (dummy users until `corpora-auth` ships), and the detail view always shows the creator.

**Why this priority**: Attribution and organizational context round out the project record but carry the least standalone value relative to the other stories.

**Independent Test**: Create a project, verify a creating user is recorded and displayed on its detail; assign an organization with a name and website, verify it displays on the project.

**Acceptance Scenarios**:

1. **Given** a project detail view, **When** the user assigns an organization with a name, **Then** the organization (and website when provided) displays on the project.
2. **Given** a project with an organization, **When** the user changes or removes the organization, **Then** the detail view reflects the change.
3. **Given** a visitor creating a project, **When** they have not selected a user profile from the seeded list, **Then** the project is not created and they are told a creator is required.
4. **Given** any project, **When** the detail is viewed, **Then** the creator's name or username is displayed.
5. **Given** a project created before this feature (no recorded creator), **When** the detail is viewed, **Then** it displays the seeded default user as creator.

---

### Edge Cases

- What happens when a user changes a project's type from a language-bearing type (e.g., bible) to a category-bearing type (e.g., review)? The previously chosen language must not silently remain attached — the conditional field switches and the stale value is cleared or ignored.
- What happens when a license attached to projects is later retired or superseded? Existing attachments remain valid and display the license's new state; the license is only discouraged for new attachments.
- How does the system handle two visitors editing the same project detail concurrently? Last write wins, consistent with the existing workspace behavior (no conflict detection in v1).
- What happens when a project's organization is deleted or renamed? Projects referencing it display the updated name; removing an organization detaches it from projects rather than deleting the projects.
- What happens to status when a project is deleted? Deletion is governed by the existing workspace feature; this feature adds no new deletion behavior.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a project detail view showing the project's name, description, lifecycle status, creation timestamp, and last-updated timestamp.
- **FR-002**: System MUST support the project lifecycle statuses draft, started, progress, completed, and failed — and no others.
- **FR-003**: New projects MUST default to draft status.
- **FR-004**: Users MUST be able to change a project's status from the detail view, and the change MUST be visible wherever status is displayed.
- **FR-005**: Users MUST be able to assign the project an optional type drawn only from: bible, commentary, lexicon, biography, review, manuscript, tanakh, quran, apocrypha, regular.
- **FR-006**: When the project type is bible, tanakh, quran, or apocrypha, the system MUST require a source language drawn only from: hebrew, greek, syriac, arabic, aramaic, protoCuneiform, akkadian, ugaritic, pali, latin, dutch, french, italian, english.
- **FR-007**: When the project type is biography, commentary, or review, the system MUST require a category drawn only from: biblical, religious, literary, historical, paratext.
- **FR-008**: When the project type is lexicon, manuscript, or regular — or no type is set — the system MUST NOT require or display a language or category value.
- **FR-009**: When a project's type changes such that a previously required conditional value (language or category) no longer applies, the system MUST clear or ignore the stale value and require the newly applicable one before saving.
- **FR-010**: Users MUST be able to attach one or more licenses to a project, chosen from the license catalog; a project with no licenses is valid, and the same catalog license cannot be attached to the same project more than once.
- **FR-011**: The license catalog MUST describe each license with a title, an optional link to its text, whether it covers the content, data, and software domains, and its lifecycle state (active, retired, or superseded), with optional family, maintainer, generic flag, and full license text. The catalog is populated by a pre-seeded data load (SQL seed, provided separately); this feature MUST NOT offer license authoring or editing, and MUST handle an empty catalog gracefully.
- **FR-012**: For each license attached, the system MUST record the date and time of agreement and the agreeing user.
- **FR-013**: Users MUST be able to remove any attached license from a project via the detail view without affecting the project's other licenses.
- **FR-014**: Users MUST be able to associate a project with at most one organization, described by a required name and optional website; the association is optional and removable.
- **FR-015**: Every project MUST record its creating user — anonymous creation is not permitted — and the detail view MUST display the creator. At creation time the visitor selects their user profile from the pre-seeded user list; creation MUST fail with a clear message if no user is selected (or the user list is empty).
- **FR-016**: All metadata edits (status, type, language, category, licenses, organization) MUST update the project's last-updated timestamp.
- **FR-017**: Existing projects created before this feature MUST remain valid: they present as draft status (or an equivalent default), no type, no licenses, and no organization, without requiring migration action from the user; their missing creator is backfilled to a seeded default user.
- **FR-018**: The system MUST maintain a user directory populated by a pre-seeded data load (dummy users for now, replaced by real users when `corpora-auth` ships); this feature provides user selection only — no user creation, editing, or authentication.

### Key Entities

- **Project (extended)**: The existing workspace project, now carrying full metadata — identity, name, description, created/updated timestamps, lifecycle status, optional type with conditional language or category, zero or more attached licenses, an optional single organization, and a required creating user.
- **License**: A reusable catalog entry describing a content/data/software license — title, optional URL and full text, domain coverage flags (content, data, software), optional family, maintainer, and generic flag, lifecycle state (active, retired, superseded). The catalog is read-only in this feature, populated by a pre-seeded data load. Each project–license attachment records the agreement time and agreeing user.
- **Organization**: A lightweight body a project can belong to — name and optional website.
- **User**: The person who created a project — identity, username, email, and optional profile details. A read-only, pre-seeded directory in this feature (dummy users for now); selected at project creation for attribution. Account management and authentication are owned by the separate `corpora-auth` effort.
- **Book Type / Language / Category vocabularies**: Fixed enumerations governing project classification — book types (10 values), source languages (14 values), and categories (5 values) — with the conditional rules described in FR-006 through FR-008.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can open any project and see its complete metadata (status, type, attached licenses, organization, and creator) in a single detail view without navigating elsewhere.
- **SC-002**: A user can classify a project — type plus conditional language or category — in under 30 seconds from the detail view.
- **SC-003**: 100% of type/conditional-field combinations are enforced: no saved project ever holds a language without a scriptural type, a category without a secondary-literature type, or a missing conditional value for a type that requires one.
- **SC-004**: A user can attach a license, including confirming agreement, in under 1 minute, and the agreement time is recorded on 100% of attachments.
- **SC-005**: 100% of projects created before this feature remain viewable and editable with default metadata, with zero user-facing migration steps.

## Assumptions

- The license catalog is a curated, pre-seeded list (in the spirit of open-definition license registries, matching the domain model's family/maintainer/generic/domain fields) loaded via a SQL seed provided separately; users pick from it rather than authoring license entries. The feature must work (with empty states) before the seed is loaded.
- The shared-pool, last-write-wins editing model from 001 carries over unchanged for concurrent edits; however, unlike 001, every project must have a non-anonymous creator (FR-015), established by the visitor selecting a profile from the pre-seeded user directory. User selection is honor-system (no passwords) until `corpora-auth` ships and replaces the dummy users with real accounts.
- Organizations are simple user-entered records (name, optional website), not accounts or access-control boundaries; organization-based permissions are out of scope.
- Project type is optional at creation; classification can happen at any time in the project's life. Book types apply to the project as a whole (the project's primary text kind), mirroring the domain vocabulary shared with books and corpora.
- Multiple licenses per project are allowed; at most one organization and exactly one creator per project. Multi-organization projects are out of scope.
- Corpus-level type/category fields that already exist in the library remain independent of the project-level classification introduced here.
