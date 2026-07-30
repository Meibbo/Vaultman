---
title: Task state retrieval
type: implementation-plan-index
status: done
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-05-10T18:49:52
updated: 2026-05-10T18:49:52
tags:
  - agent/plan
  - initiative/pkm-ai
  - docs/tasks
created_by: codex
updated_by: codex
---

# Task State Retrieval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let agents retrieve objective task states with one structured CLI call instead of reading plan Markdown manually.

**Architecture:** Extend the existing `manage-tasks.mjs` read/write task state tool. Keep retrieval read-only and JSON-first, while preserving the existing write commands for mechanical objective completion.

**Tech Stack:** Node ESM CLI scripts, Node test runner, Obsidian Markdown, and the Tasks emoji task format.

---

## Objectives

- [x] Add RED tests for objective state retrieval JSON #pkm-ai/objective/tasks-retrieval-red-tests ✅ 2026-05-10
- [x] Implement `--list-objectives` and `--get-objective` retrieval #pkm-ai/objective/tasks-retrieval-implementation ✅ 2026-05-10
- [x] Update PKM-AI docs and tool policy with the retrieval contract #pkm-ai/objective/tasks-retrieval-docs ✅ 2026-05-10

## Retrieval Contract

List objectives from one file:

```powershell
node .agents/tools/pkm-ai/manage-tasks.mjs `
  --file .agents/docs/work/pkm-ai/plans/<plan>/index.md `
  --list-objectives `
  --json
```

List open objectives in an initiative:

```powershell
node .agents/tools/pkm-ai/manage-tasks.mjs `
  --list-objectives `
  --initiative pkm-ai `
  --status open `
  --json
```

Get one objective:

```powershell
node .agents/tools/pkm-ai/manage-tasks.mjs `
  --get-objective tasks-retrieval-implementation `
  --initiative pkm-ai `
  --json
```

The JSON rows include `objective`, `status`, `symbol`, `description`, `path`, `line`, and parsed Tasks emoji metadata when present. Retrieval ignores task examples inside fenced Markdown code blocks.

## Verification

- `node --test .agents/tools/pkm-ai/test/manage-tasks.test.mjs`: pass, 6/6.
- `npm --prefix .agents/tools/pkm-ai test`: pass, 25/25.
- `node .agents/tools/pkm-ai/check-doc-health.mjs`: pass.
- `node .agents/tools/pkm-ai/manage-tasks.mjs --file .agents/docs/work/pkm-ai/plans/2026-05-10-task-state-retrieval/index.md --list-objectives --json`:
  pass.
- `node .agents/tools/pkm-ai/manage-tasks.mjs --get-objective tasks-retrieval-implementation --initiative pkm-ai --json`:
  pass.
- `node .agents/tools/pkm-ai/manage-tasks.mjs --list-objectives --initiative pkm-ai --status open --json`:
  pass; returned no open objective rows after fenced examples were ignored.
- Pending: final scoped `git diff --check`
