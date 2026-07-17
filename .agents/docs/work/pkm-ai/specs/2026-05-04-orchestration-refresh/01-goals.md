---
title: Goals and non-goals
type: spec-slice
parent: "[[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh/index|pkm-ai]]"
status: approved-draft
created: 2026-05-04T00:00:00
updated: 2026-05-04T00:00:00
tags:
  - agent/spec
---

# Goals

## Goals

- Keep agent working memory clean while preserving long-term history.
- Make docs navigable in Obsidian through frontmatter, links, Bases, and Canvas.
- Let agents find relevant context with minimal token/tool cost.
- Make stale, contradicted, and superseded information explicit.
- Keep AI workflow files out of `main`.
- Let the developer learn the PKM-AI system through a living manual.
- Support sub-agents, small composable skills, scripts, and health checks without
  turning startup context into a large internal search engine.

## Non-Goals

- Do not make `docs/**` the agent memory system.
- Do not auto-generate Canvas views every turn.
- Do not build semantic/vector code indexing in the first implementation.
- Do not preserve giant Superpowers output files as active specs or plans.
- Do not silently resolve contradictions between docs.
- Do not make every small edit run full brainstorming or grill workflows.

## Operating Principle

The project should grow through structured memory, not bigger startup context.
Markdown/frontmatter is canonical. Scripts and generated views are helpers.
