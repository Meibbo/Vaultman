---
title: PKM-AI orchestration refresh implementation plan
type: plan
status: draft
initiative: pkm-ai
parent: "[[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh/index|pkm-ai]]"
created: 2026-05-04T00:00:00
updated: 2026-05-06T05:12:35
tags:
  - agent/plan
  - pkm-ai/orchestration
---

# PKM-AI Orchestration Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development`
> or `executing-plans` to implement this plan task-by-task. Steps use checkbox
> syntax for tracking.

**Goal:** Build the PKM-AI agent workspace under `` and migrate old
agent docs out of active public docs.

**Architecture:** Markdown/frontmatter remains canonical. TypeScript/Node
scripts perform deterministic indexing and checks. Skills wrap repeated
workflows but do not own the source of truth.

**Tech Stack:** Obsidian Markdown, YAML frontmatter, JSON Canvas, Obsidian
Bases, TypeScript/Node scripts, PowerShell commands.

---

## File Map

- [[01-bootstrap]]: ignore rules, bootloaders, starter docs, policies.
- [[02-migration]]: archive old active agent docs.
- [[03-backlog]]: item templates, indexes, Base view.
- [[04-tools]]: deterministic PKM-AI scripts.
- [[05-skills]]: initial local skills.
- [[06-verification]]: checks and final review.

## Execution Notes

- Implement in order.
- Keep every active `.md` under 200 lines.
- Keep `current/status.md` and `current/handoff.md` under 200 lines.
- Do not commit until verification passes and the developer asks.
