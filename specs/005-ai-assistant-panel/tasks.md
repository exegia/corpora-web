# Tasks: AI Assistant Panel for the Corpus Reader

**Spec**: `specs/005-ai-assistant-panel/spec.md` (curation model) · **Plan**: `plan.md`

## Phase 1 — Add to chat + scoped panel

- [ ] "Add to chat" action (⌘J) appended to the word popover; node-summary popover for partial/multi-¶/whole-node selections (FR-001; frames AI 1, AI 8)
- [ ] Scope resolver: smallest containing node; ¶-range chips; articulus clamping (FR-002/003)
- [ ] Panel shell: scope chip, curation prompts, composer; focus order & shortcuts (FR-015; frame AI 2)
- [ ] Streaming: polite live region, sentence batches, Stop/⎋, composer lock (FR-005; frame AI 3)
- [ ] GENERATED marker on all output; node-id / paragraph citations (FR-004/006)

## Phase 2 — Context-Fabric validation + apply

- [ ] Load Context-Fabric MCP; validate scoped nodes; findings with node ids + observable consequence (FR-004; frame AI 3)
- [ ] Suggested-fix card: −/+ diff rows with ins/del semantics; generated rationale (FR-007; frame AI 4)
- [ ] Apply → immediate write to working version; no approval step; confirmation toast (assertive), focus to changed reading (FR-008/015)
- [ ] Version-history entry transactional with the change: resp #corpora-ai + user, node id, previous value, timestamp (FR-009; frame AI 5)
- [ ] Undo (⌘Z / applied card); revert also recorded (FR-009)
- [ ] Version-bound staleness: STALE card, Apply blocked, Re-validate; content-hash guard (FR-010; frame AI 4)
- [ ] Reader marks (underline + ◆) + TEI/citation export attribution with previous value (FR-011; frame AI 5)
- [ ] Unfixable (slot-level) findings reported honestly with walker-re-run pointer

## Phase 3 — Scope model + degradation

- [ ] Scope picker listbox (word→corpus) (FR-003/015; frame AI 6)
- [ ] Thread pinning; PINNED chip; explicit re-scope forks a section (FR-012; frame AI 6)
- [ ] Corpus-scope write commands through #100 gate, working drafts only (FR-014; frame AI 7)
- [ ] Degraded states: published/locked, missing rights, model unavailable — visible reasons (FR-013; frame AI 7)
- [ ] VoiceOver pass across popover, panel, streaming, apply

## Done when

- All FR-001…FR-015 acceptance scenarios pass; SC-001…SC-005 verified.
- No change lands without a version-history entry; every change is undoable.
- TEI export round-trip preserves attribution and previous values.

## Out of scope

- Approval/review flow (deliberately deferred — layers on later), provider/model management UI (#54), auth/roles implementation, slot-level corpus rebuilds (walker), ExeGia consumer surfaces.
