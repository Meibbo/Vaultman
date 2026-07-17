---
title: Migration
type: plan-slice
status: draft
initiative: pkm-ai
parent: "[[docs/work/pkm-ai/plans/2026-05-04-orchestration-refresh/index|pkm-ai]]"
created: 2026-05-04T00:00:00
updated: 2026-05-04T00:00:00
tags:
  - agent/plan
---

# Migration

## Task 1: Create Migration Archive

**Files:**
- Create: `docs/archive/pkm-ai/migration-2026-05-04/index.md`
- Create folder: `docs/archive/pkm-ai/migration-2026-05-04/raw/`

- [ ] The index lists source paths, target paths, and migration rationale.

## Task 2: Move Old Active Agent Docs

**Files:**
- Move old agent docs from `docs/**` into raw archive.

- [ ] Move `docs/HANDOFF.md` if present.
- [ ] Move `docs/Vaultman - Agent Memory.md` if present.
- [ ] Move `docs/Vaultman - Agent History.md` if present.
- [ ] Move `docs/superpowers/**` if present.
- [ ] Preserve raw originals. Do not summarize in place.

## Task 3: Rebuild Active Knowledge From Current Truth

**Files:**
- Create active indexes under `docs/work/*/index.md`.
- Create knowledge notes only for current references.

- [ ] Prioritize current codebase truth and accepted review decisions.
- [ ] Link raw originals only from indexes or archive notes.
- [ ] Do not copy stale long logs into `current/`.

## Task 4: Confirm Public Docs Boundary

**Files:**
- Review: `docs/**`

- [ ] Leave public user/dev docs in `docs/**`.
- [ ] If unsure whether a doc is public, move it to PKM-AI archive and mark
`needs_dev_selection: true` in migration index.

