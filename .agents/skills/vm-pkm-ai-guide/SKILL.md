---
name: vm-pkm-ai-guide
description: Use when a user asks how Vaultman PKM-AI works, what modes or skills mean, where docs live, how routing works, or how agents should collaborate.
---

# Vaultman PKM-AI Guide

Use this for teach-mode explanations of the Vaultman agent system.

## Default Behavior

Explain first. Keep the answer tied to the user's question and cite the smallest relevant docs by path.

Do not update manuals, policies, routing docs, or skills unless the user explicitly asks for documentation changes.

## Source Map

Prefer these docs before broader search:

- `.agents/docs/start.md`
- `.agents/docs/architecture/behavior.md`
- `.agents/docs/architecture/routing.md`
- `.agents/docs/architecture/policies/docs.md`
- `.agents/docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh/`
- `.agents/docs/work/pkm-ai/plans/2026-05-04-orchestration-refresh/`

Use `.agents/tools/pkm-ai/query-docs.ts` when a direct source is not obvious.

## Teaching Style

- Distinguish current behavior from planned behavior.
- Name exact modes, folders, and scripts.
- Surface branch and line-limit constraints when they affect the answer.
- Keep examples short and project-specific.
