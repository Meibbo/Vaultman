---
title: Agent control plane - roadmap and verification
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

# Roadmap And Verification

## Phase 1 - Residual Audit

Create one source record that classifies every recurring caveat currently
visible in status, handoff, health output, and recent source records.

Required classifications:

- fix-now;
- backlog;
- accepted-noise with owner and expiration;
- blocked-by-environment;
- not-reproducible-yet.

Initial targets:

- doc health failures;
- stale import-path failures;
- documented failed component tests;
- full `git diff --check` noise;
- Vite/Svelte resolver transient;
- CodeQL/Java worker cleanup requirement;
- package-manager drift events.

Acceptance:

- no recurring caveat remains only as chat or handoff prose;
- every non-fixed residual has a linkable source record.

## Phase 2 - Retrieval Upgrade

Define retrieval profiles before writing new tooling.

Profiles:

- `local-code`: `rg`, AST/code index, test-source map;
- `local-docs`: `query-docs`, metadata cache, glossary gate;
- `archive-audit`: archive-aware source reconstruction;
- `online-primary`: official docs or primary repository/source;
- `online-clean-page`: Defuddle-style extraction for user-provided URLs;
- `current-unstable`: web verification for version-sensitive facts.

Tool improvements:

- replace regex-only import/export extraction with TypeScript AST where useful;
- add Svelte prop/event extraction for `.svelte` and `.svelte.ts`;
- add dependency graph output that can answer "what calls this Module";
- add doc-to-code trace fields for specs/plans that name product paths.

Acceptance:

- agents can ask "what should I read for this task" and get a ranked local
  source list;
- false-authority output from shallow regex scripts is either labelled
  "heuristic" or replaced.

## Phase 3 - Verification Matrix

Create a PKM-AI verification matrix that maps change type to required checks.

Minimum rows:

- docs-only;
- agent-tooling script;
- Svelte component;
- Svelte lifecycle/reactivity;
- service logic;
- queue/file operation;
- settings/persistence;
- performance-sensitive path;
- CodeQL guardrail;
- Obsidian runtime behavior;
- dependency/package change.

Required fields:

- focused test command;
- broad check command;
- sequencing constraints;
- live/mounted smoke requirement;
- residual handling rule;
- evidence record path.

Acceptance:

- future plans cite the matrix instead of inventing verification from scratch;
- Svelte/Vite commands are marked sequential where needed;
- UI/runtime changes cannot close without mounted or Obsidian evidence unless a
  source record explains why unavailable.

## Phase 4 - PKM-AI Tool Deepening

Apply the deletion test to existing scripts.

Keep:

- `check-doc-health.mjs`;
- `query-docs.mjs`;
- `record-metric.mjs`;
- `archive-active-doc.mjs`;
- `update-frontmatter.mjs`;
- `shard-index.mjs`.

Deepen or relabel:

- `traverse-graph.mjs` because regex imports are not enough for architecture
  claims;
- `analyze-code.mjs` because export regex is only an orientation heuristic.

Possible new Modules:

- `agent-route.mjs`;
- `residuals-audit.mjs`;
- `verify-matrix.mjs`;
- `code-index.mjs`.

Acceptance:

- each script has a clear Interface and documented confidence level;
- metrics record health, retrieval, sharding, and residual classification
  events;
- current docs link to generated evidence, not command transcripts.

## Phase 5 - Agent Operation API

After Phases 1-4, promote the programmable interface spec into an
implementation plan.

Required preconditions:

- queue `pending` drift is retired or reconnected;
- selected scope and visible scope are verified;
- destructive operations have queue review and explicit user confirmation;
- API reads cannot depend on stale index state without reporting it.

Acceptance:

- the first `serviceAPI` slice exposes read/plan/enqueue only;
- no direct destructive mutation is available;
- every API response includes counts, affected paths or nodes, validation
  errors, and rollback limits.

## Non-Goals

- Do not create a full autonomous agent framework.
- Do not make every micro task run the entire process.
- Do not replace product tests with agent-process checks.
- Do not build the future `serviceAPI` before queue/scope verification.
- Do not move AI workflow files to `main`.

## Success Criteria

- Agents spend less time re-reading broad docs and more time reading targeted
  source records.
- Every repeated caveat has a durable state.
- Plans become shorter because verification is centralized.
- Shallow tooling stops producing authoritative-looking weak evidence.
- The eventual `serviceAPI` starts from supervised queue semantics, not direct
  mutation.
