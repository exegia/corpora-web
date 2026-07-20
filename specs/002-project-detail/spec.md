# Feature Specification: Project Detail

**Feature Branch**: `002-project-detail`
**Created**: 2026-07-19
**Status**: Draft
**Input**: User description: "Complete the project feature: project detail with metadata (Project schema), license, organization, creating-user relationship, book type from BOOK_TYPES (with conditional language type for bible/tanakh/quran/apocrypha and category type for biography/commentary/review), and status"

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

### User Story 3 - Attach a license to a project (Priority: P3)

The user selects a license for their project from a catalog of known content/data/software licenses. The detail view shows the chosen license's title, link to its text, which domains it covers (content, data, software), and its lifecycle state (active, retired, superseded). When attaching a license, the user confirms agreement, and the project records when the agreement happened and by whom (once user accounts exist).

**Why this priority**: Licensing matters for publishing and sharing corpus-derived work, but a project is fully usable without it. Builds on P1 only.

**Independent Test**: Open a project detail, attach a license from the catalog, verify the license title and domains display on the project, verify the agreement time is recorded, then remove the license and verify the project shows no license.

**Acceptance Scenarios**:

1. **Given** a project without a license, **When** the user browses licenses to attach, **Then** they can see each license's title, covered domains (content/data/software), and lifecycle state.
2. **Given** the user attaches a license, **When** they confirm agreement, **Then** the project shows the license and the date/time agreement was given.
3. **Given** a license marked retired or superseded, **When** the user browses licenses, **Then** the license's state is clearly indicated so the user can prefer active licenses.
4. **Given** a project with a license, **When** the user removes or replaces it, **Then** the detail view reflects the change.
5. **Given** a project without a license, **When** the user views the detail, **Then** the license area shows an empty state inviting them to choose one — a license is optional.

---

### User Story 4 - Associate an organization and creator with a project (Priority: P4)

The user records which organization a project belongs to (name and optional website) and the project displays who created it. Creator attribution is captured automatically when user accounts are available; until then the field may be empty.

**Why this priority**: Attribution and organizational context round out the project record but carry the least standalone value, and creator attribution is partially blocked on the separate authentication effort.

**Independent Test**: Open a project detail, assign an organization with a name and website, verify it displays on the project; verify the creator field displays the creating user when one exists and is absent otherwise.

**Acceptance Scenarios**:

1. **Given** a project detail view, **When** the user assigns an organization with a name, **Then** the organization (and website when provided) displays on the project.
2. **Given** a project with an organization, **When** the user changes or removes the organization, **Then** the detail view reflects the change.
3. **Given** a project created while no user account exists, **When** the detail is viewed, **Then** the creator field is simply absent or empty — not an error.
4. **Given** a project created by a known user, **When** the detail is viewed, **Then** the creator's name or username is displayed.

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
- **FR-010**: Users MUST be able to attach at most one license to a project, chosen from a license catalog; a project without a license is valid.
- **FR-011**: The license catalog MUST describe each license with a title, an optional link to its text, whether it covers the content, data, and software domains, and its lifecycle state (active, retired, or superseded), with optional family, maintainer, generic flag, and full license text.
- **FR-012**: When a license is attached, the system MUST record the date and time of agreement, and the agreeing user when a user account is available.
- **FR-013**: Users MUST be able to replace or remove a project's license from the detail view.
- **FR-014**: Users MUST be able to associate a project with at most one organization, described by a required name and optional website; the association is optional and removable.
- **FR-015**: The system MUST record the creating user on projects when a user account is available, and the detail view MUST display the creator when present; absence of a creator MUST NOT be treated as an error.
- **FR-016**: All metadata edits (status, type, language, category, license, organization) MUST update the project's last-updated timestamp.
- **FR-017**: Existing projects created before this feature MUST remain valid: they present as draft status (or an equivalent default), no type, no license, no organization, and no creator, without requiring migration action from the user.

### Key Entities

- **Project (extended)**: The existing workspace project, now carrying full metadata — identity, name, description, created/updated timestamps, lifecycle status, optional type with conditional language or category, and optional links to one license, one organization, and one creating user.
- **License**: A reusable catalog entry describing a content/data/software license — title, optional URL and full text, domain coverage flags (content, data, software), optional family, maintainer, and generic flag, lifecycle state (active, retired, superseded), and, per attachment, the agreement time and agreeing user.
- **Organization**: A lightweight body a project can belong to — name and optional website.
- **User**: The person who created a project — identity, username, email, and optional profile details. Referenced for attribution only; account management is owned by the separate authentication effort.
- **Book Type / Language / Category vocabularies**: Fixed enumerations governing project classification — book types (10 values), source languages (14 values), and categories (5 values) — with the conditional rules described in FR-006 through FR-008.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can open any project and see its complete metadata (status, type, license, organization, creator where present) in a single detail view without navigating elsewhere.
- **SC-002**: A user can classify a project — type plus conditional language or category — in under 30 seconds from the detail view.
- **SC-003**: 100% of type/conditional-field combinations are enforced: no saved project ever holds a language without a scriptural type, a category without a secondary-literature type, or a missing conditional value for a type that requires one.
- **SC-004**: A user can attach a license, including confirming agreement, in under 1 minute, and the agreement time is recorded on 100% of attachments.
- **SC-005**: 100% of projects created before this feature remain viewable and editable with default metadata, with zero user-facing migration steps.

## Assumptions

- The license catalog is a curated, pre-seeded list (in the spirit of open-definition license registries, matching the domain model's family/maintainer/generic/domain fields); users pick from it rather than authoring license entries in v1.
- Access remains anonymous (per the 001 project-workspace decisions): creator attribution (FR-015) and agreeing-user on license agreement (FR-012) stay empty until the separate `corpora-auth` effort ships, and the shared-pool, last-write-wins editing model carries over unchanged.
- Organizations are simple user-entered records (name, optional website), not accounts or access-control boundaries; organization-based permissions are out of scope.
- Project type is optional at creation; classification can happen at any time in the project's life. Book types apply to the project as a whole (the project's primary text kind), mirroring the domain vocabulary shared with books and corpora.
- One license, one organization, and one creator per project — the domain model's single-reference shape — multi-license or multi-organization projects are out of scope.
- Corpus-level type/category fields that already exist in the library remain independent of the project-level classification introduced here.
