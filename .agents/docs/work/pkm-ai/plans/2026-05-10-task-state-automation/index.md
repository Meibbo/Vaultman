---
title: Task state automation
type: implementation-plan-index
status: done
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-05-10T18:31:27
updated: 2026-05-10T18:31:27
tags:
  - agent/plan
  - initiative/pkm-ai
  - docs/tasks
created_by: codex
updated_by: codex
---

# Task State Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let agents mark objective-level plan tasks mechanically before the
final manual status or handoff edit.

**Architecture:** Extend the existing `manage-tasks.mjs` tool instead of
creating a second task runner. Use Obsidian Tasks-compatible Markdown task
lines and optional emoji metadata while keeping current docs/manual summaries
under human control.

**Tech Stack:** Node ESM CLI scripts, Node test runner, Obsidian Markdown, and
the Tasks emoji task format.

---

## File Map

- Research:
  [[docs/work/pkm-ai/research/2026-05-10-obsidian-tasks-state-automation|Obsidian Tasks state automation research]]
- Modify: `.agents/tools/pkm-ai/manage-tasks.mjs`
- Add: `.agents/tools/pkm-ai/test/manage-tasks.test.mjs`
- Modify: [[docs/work/pkm-ai/index|PKM-AI index]]
- Modify:
  [[docs/work/pkm-ai/plans/2026-05-10-agent-control-plane/index|Agent control plane implementation plan]]
- Modify: [[docs/current/status|Current status]]
- Modify: [[docs/current/handoff|Current handoff]]

## Objectives

- [x] Research Obsidian Tasks task states and emoji metadata #pkm-ai/objective/tasks-research ✅ 2026-05-10
- [x] Add failing manage-tasks tests for objective completion and emoji metadata #pkm-ai/objective/tasks-red-tests ✅ 2026-05-10
- [x] Implement manage-tasks objective completion and Tasks metadata support #pkm-ai/objective/tasks-implementation ✅ 2026-05-10
- [x] Record PKM-AI route updates and close housekeeping docs #pkm-ai/objective/tasks-docs-close ✅ 2026-05-10

## Script Contract

Primary command:

```powershell
node .agents/tools/pkm-ai/manage-tasks.mjs `
  --file .agents/docs/work/pkm-ai/plans/<plan>/index.md `
  --complete-objective <slug> `
  --agent codex `
  --close-when-all-done
```

Run updates for the same file sequentially. The script is designed as a
single-file mechanical state update, not as a concurrent writer.

Supported task-state options:

- `--task-status todo`
- `--task-status in-progress`
- `--task-status done`
- `--task-status cancelled`
- `--task-status on-hold`
- `--task-status blocked`
- `--task-status question`
- `--task-status-symbol <symbol>` for plugin-configured custom statuses.

Supported Tasks emoji metadata:

- `--priority highest|high|medium|normal|low|lowest`
- `--created YYYY-MM-DD`
- `--start YYYY-MM-DD`
- `--scheduled YYYY-MM-DD`
- `--due YYYY-MM-DD`
- `--done-date YYYY-MM-DD`
- `--cancelled-date YYYY-MM-DD`
- `--repeat <rule>`
- `--task-id <id>`
- `--depends-on <id>`
- `--on-completion <mode>`

## Verification

- `node --test .agents/tools/pkm-ai/test/manage-tasks.test.mjs`: pass, 3/3.
- `npm --prefix .agents/tools/pkm-ai test`: pass, 22/22.
- `node .agents/tools/pkm-ai/check-doc-health.mjs`: pass.
- Scoped `git diff --check`: pass with LF/CRLF warnings only.
