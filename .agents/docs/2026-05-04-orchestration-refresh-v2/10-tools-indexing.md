---
title: Tools and indexing
type: spec-slice
status: draft
initiative: pkm-ai
parent: "[[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh-v2/index|pkm-ai]]"
created: 2026-05-04T08:50:28
updated: 2026-05-04T08:50:28
tags:
  - agent/spec
---

# Tools And Indexing

## Principle

Use scripts for deterministic, repeated work. Let the developer computer carry
the scanning, parsing, and indexing load. Let the agent consume compact outputs.

## Current Script Layer

- `check-doc-health.mjs`
- `index-docs.mjs`
- `query-docs.mjs`
- `update-indexes.mjs`
- `update-frontmatter.mjs`
- `shard-index.mjs`

## Phase 1 Indexing

Index `docs` frontmatter and paths. This supports routing, backlog
queries, health checks, and current-memory repair.

## Phase 2 Indexing

Add structural code indexes when useful:

- import/export graph
- file map
- test map
- Svelte component map

This enables requests like "make a canvas of exports and imports" without the
agent manually opening files one by one.

## Phase 3 Deferred

Semantic/vector indexing is out of current scope. Create a research item before
adding it.

