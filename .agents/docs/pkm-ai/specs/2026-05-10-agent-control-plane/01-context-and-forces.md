---
title: Agent control plane - context and forces
type: spec-shard
status: draft
parent: "[[docs/work/pkm-ai/specs/2026-05-10-agent-control-plane/index|Agent Control Plane]]"
created: 2026-05-10T03:11:56
updated: 2026-05-10T03:11:56
created_by: codex
updated_by: codex
tags:
  - agent/spec
  - initiative/pkm-ai
  - agent/workflow
---

# Context And Forces

## What Currently Helps Agents

### Route Discipline

`AGENTS.md`, `start.md`, `current/status.md`, and `current/handoff.md` provide
a real startup route. The route is imperfect, but it prevents total cold-start
behavior and gives each agent a minimum operational picture.

### Source Record Model

Docs, context, and behavior policies already distinguish route summaries from
source records. This is a strong Interface: current docs should route, while
initiative records preserve detailed decisions, verification, and handoff
evidence.

### PKM-AI Tooling

The existing scripts already cover useful workflow tasks:

- `check-doc-health.mjs` validates line limits, frontmatter, parent links,
  archive source rules, and glossary candidate warnings.
- `query-docs.mjs` provides structured doc lookup and a glossary gate.
- `index-docs.mjs` can cache doc metadata.
- `archive-active-doc.mjs` protects source detail before replacement.
- `record-metric.mjs` lets process claims cite evidence.
- `update-frontmatter.mjs`, `update-indexes.mjs`, and `shard-index.mjs` reduce
  repeated manual Markdown maintenance.

### Product Harness

Vaultman has a broad verification stack:

- static checks: `pnpm run lint`, `pnpm run check`, `pnpm run build`;
- test projects: unit, component, integration, coverage;
- Obsidian runtime paths: WDIO and Obsidian CLI smoke when available;
- CodeQL custom queries for performance and unsafe dynamic code/path/HTML
  shapes;
- focused component tests for Svelte lifecycle, virtualizer, view, and queue
  behaviors.

### Existing Failure Memory

The Agent Brain Synthesis and Agent Failure Taxonomy now give future agents a
map of repeated mistakes. That memory is valuable because it names systemic
patterns instead of only isolated bugs.

## What Currently Slows Or Hurts Agents

### Mixed Working Memory

`current/status.md` and `current/handoff.md` remain too large and carry historic
detail. They are useful, but they blur the Interface between route summary and
source record. Agents can over-read them, miss source links, or treat stale
status lines as current truth.

### Residual Normalization

"Pre-existing", "known transient", "deferred", and "unrelated" caveats are
valid scope statements, but they become harmful when they are not classified.
The current system lacks a single residual classifier that forces each caveat
into fix-now, backlog, or accepted-noise state.

### Shallow Codebase Tools

`traverse-graph.mjs` and `analyze-code.mjs` are shallow Modules. They use regex
and expose an Interface that looks more authoritative than the Implementation
really is. Their current Depth is low: they help orientation, but they should
not be treated as architecture proof.

### Manual Retrieval Decisions

Agents currently choose ad hoc between `rg`, `query-docs`, direct file reads,
web search, official docs, skills, and archived records. This burns context and
creates inconsistent source quality.

### Verification Matrix Gap

Plans repeatedly say "run focused verification", "avoid Vite/Svelte parallel
runs", and "run Obsidian smoke when needed", but there is no compact matrix
that maps change type to required checks. The result is repeated over-testing
in some slices and under-testing in the exact runtime surface that failed.

### Future API Prematurity

The desired agent-facing `serviceAPI` is not implemented. Building it before
queue, selected scope, residuals, and verification contracts are stable would
increase automation without enough safety.
