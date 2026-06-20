---
title: Backlog system
type: plan-slice
status: draft
initiative: pkm-ai
parent: "[[docs/work/pkm-ai/plans/2026-05-04-orchestration-refresh/index|pkm-ai]]"
created: 2026-05-04T00:00:00
updated: 2026-05-04T00:00:00
tags:
  - agent/plan
---

# Backlog System

## Task 1: Create Templates

**Files:**
- Create: `docs/templates/item-template.md`
- Create: `docs/templates/spec-index-template.md`
- Create: `docs/templates/plan-index-template.md`
- Create: `docs/templates/conflict-report-template.md`

- [ ] Templates use `created` and `updated` with `YYYY-MM-DDTHH:mm:ss`.
- [ ] Item template uses `VM-0001` shape and canonical fields.

## Task 2: Create Backlog Indexes

**Files:**
- Create: `docs/current/backlog.md`
- Create: `docs/current/bugs.md`
- Create: `docs/current/regressions.md`
- Create: `docs/current/conflicts.md`

- [ ] Each index is compact and links to item files.
- [ ] Each index states shard triggers.

## Task 3: Create Backlog Base

**Files:**
- Create: `docs/current/backlog.base`

- [ ] Views: `Active`, `Bugs`, `Regressions`, `Conflicts`, `Done`.
- [ ] Filter notes by folder `docs/work/` and tag `agent/item`.

## Task 4: Create First PKM-AI Item

**Files:**
- Create: `docs/work/pkm-ai/items/vm-0001-pkm-ai-orchestration-refresh.md`

- [ ] Link spec and plan.
- [ ] Set `status: planned`.
- [ ] Set `task_size: large`.

