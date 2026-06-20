---
title: Skills
type: plan-slice
status: draft
initiative: pkm-ai
parent: "[[docs/work/pkm-ai/plans/2026-05-04-orchestration-refresh/index|pkm-ai]]"
created: 2026-05-04T00:00:00
updated: 2026-05-04T00:00:00
tags:
  - agent/plan
---

# Skills

## Task 1: Create Start Session Skill

**Files:**
- Create: `skills/vm-start-session/SKILL.md`

- [ ] Trigger: new session, route selection, status/handoff loading.
- [ ] Behavior: read-only, minimal route output.
- [ ] May call `tools/pkm-ai/query-docs.mjs`.

## Task 2: Create Backlog Manager Skill

**Files:**
- Create: `skills/vm-backlog-manager/SKILL.md`

- [ ] Trigger: bugs, regressions, backlog, triage, conflicts, items.
- [ ] Behavior: create/update item files and indexes after clear announcement.
- [ ] May call index/update scripts.

## Task 3: Create PKM-AI Guide Skill

**Files:**
- Create: `skills/vm-pkm-ai-guide/SKILL.md`

- [ ] Trigger: teaching, system explanation, mode/skill questions.
- [ ] Behavior: explain first; update manual/policies only when user asks.

## Task 4: Validate Skills

**Files:**
- Review each created `SKILL.md`.

- [ ] Descriptions state triggers, not workflow summaries.
- [ ] Skill bodies are short and route to scripts/references when needed.
- [ ] Do not duplicate system skills; reference them or consolidate by proposal.
