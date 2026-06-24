---
title: Skills subagents and hooks
type: spec-slice
status: draft
initiative: pkm-ai
parent: "[[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh-v2/index|pkm-ai]]"
created: 2026-05-04T08:50:28
updated: 2026-05-04T08:50:28
tags:
  - agent/spec
---

# Skills Subagents And Hooks

## Skill Principle

Skills should be small and composable. A project skill should route to docs or
scripts instead of copying all project knowledge into `SKILL.md`.

Current project skills:

- `vm-start-session`
- `vm-backlog-manager`
- `vm-pkm-ai-guide`
- `vm-regression-resolver`

## Duplicate Skills

Health checks should detect overlapping skills. Consolidation should preserve
functionality by referencing, renaming, or archiving. Do not delete useful
behavior silently.

## Subagents

Use subagents for independent tasks only. The main agent remains coordinator.

- `scout` and `research`: explorer subagents are useful.
- `implement`: worker subagents need disjoint write scopes.
- subagents report back; main agent updates memory.

## Hooks

Hooks are explicit scripts/checks invoked by modes or verification. They are not
hidden per-message automation. Expensive hooks run on demand or in `health:`.

