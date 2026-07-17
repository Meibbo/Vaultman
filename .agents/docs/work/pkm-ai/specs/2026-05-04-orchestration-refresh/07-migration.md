---
title: Migration plan
type: spec-slice
parent: "[[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh/index|pkm-ai]]"
status: approved-draft
created: 2026-05-04T00:00:00
updated: 2026-05-04T00:00:00
tags:
  - agent/spec
---

# Migration Plan

## Phase 1: Bootstrap

- Update ignore rules so `docs/**`, `skills/**`, and
  `tools/**` can be tracked on agent branches.
- Create lean root `AGENTS.md` and `CLAUDE.md`.
- Create `start.md`, `index.md`, `current/status.md`, and `current/handoff.md`.

## Phase 2: Archive Existing Agent Docs

Move current active agent docs to:

```text
archive/pkm-ai/migration-YYYY-MM-DD/raw/
```

This includes old handoffs, agent memory, agent history, and Superpowers output.
The developer later selects what should become public `docs/**`.

## Phase 3: Rebuild Active Docs

- Prioritize current codebase truth and accepted decisions from this review.
- Then incorporate old architecture docs by relevance.
- Create architecture policies and templates.
- Create initiative indexes.
- Create backlog, bug, regression, and conflict indexes.
- Create `backlog.base`.

## Phase 4: Shard Specs And Plans

Existing giant specs and plans are converted into manifest folders and slices.
Raw originals stay archived.
Sharded manifests link to raw originals when they exist.

## Phase 5: Create Initial Skills

Use `skill-creator` and `writing-skills` discipline. Start with:

- `vaultman-start-session`
- `vaultman-backlog-manager`
- `vaultman-pkm-ai-guide`

## Phase 6: Add Automation Scripts

Create only scripts needed by the initial skills and health checks. Avoid
semantic/vector indexing until structural indexing fails to meet retrieval needs.
