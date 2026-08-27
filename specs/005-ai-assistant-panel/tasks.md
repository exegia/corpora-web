# Tasks: AI Assistant Panel for the Corpus Reader

**Spec**: `specs/005-ai-assistant-panel/spec.md` · **Plan**: `plan.md`

## Phase 1 — Scoped ask (read-only)

- [ ] Scope resolver: selection → smallest containing node; ¶-range chips; cross-articulus clamping (FR-002/003)
- [ ] Panel shell + scope chip + suggested prompts + composer; focus order & shortcuts (FR-015; frame AI 2)
- [ ] Streaming answer UI: polite live region, sentence-batched announcements, Stop/⎋, composer lock (FR-005; frame AI 3)
- [ ] GENERATED marker on all assistant output; paragraph citations linking into the reader (FR-004/006)
- [ ] Temporary "Open AI panel ⌘J" entry (final inline menu deferred to Phase 4)

## Phase 2 — Proposals + provenance

- [ ] Proposal card: diff rows with +/− and ins/del semantics; generated rationale label (FR-008; frame AI 4)
- [ ] Apply → draft revision; confirmation toast (assertive live region); focus to changed reading (FR-007/015)
- [ ] Undo applied change while draft open (FR-010)
- [ ] Version-bound staleness: mark stale, block apply, offer re-generate; content-hash guard at apply (FR-009)
- [ ] Reader provenance marks: underline + ◆ gutter glyph, distinct from user highlights (FR-011a; frame AI 5)
- [ ] Apparatus record: resp #corpora-ai + editor + timestamp + displaced reading as variant (FR-011b)
- [ ] TEI/citation export carries attribution + variant (FR-011c) — blocker for shipping apply

## Phase 3 — Scope model + degradation

- [ ] Scope picker listbox (word→corpus), keyboard-operable (FR-003/015; frame AI 6)
- [ ] Thread pinning across navigation; PINNED chip; explicit re-scope forks a section (FR-012; frame AI 6)
- [ ] Corpus-scope commands through #100 confirmation gate (FR-014; frame AI 7)
- [ ] Degraded states: published read-only, insufficient rights, model unavailable — visible reasons, disabled-not-hidden verbs (FR-013; frame AI 7)

## Phase 4 — Entry point + polish

- [ ] Decide AI 8 alternate (verb-first menu vs single "Ask AI" popover row); wire winner; popover lemma/POS/frequency unchanged (FR-001; frames AI 1, AI 8)
- [ ] VoiceOver pass across menu, panel, streaming, apply
- [ ] Long-title chip truncation design (open design gap from self-review)

## Done when

- All FR-001…FR-015 acceptance scenarios pass; SC-001…SC-005 verified.
- No code path writes assistant output to corpus content outside proposal → draft revision.
- TEI export round-trip preserves AI attribution and variant readings.

## Out of scope

- Provider/model management UI (#54), auth/roles implementation (corpora-auth), ExeGia consumer surfaces, non-Latin corpora localization of the scope vocabulary.
