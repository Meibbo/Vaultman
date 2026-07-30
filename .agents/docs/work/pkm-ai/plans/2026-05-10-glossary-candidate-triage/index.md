---
title: Glossary candidate triage
type: implementation-plan-index
status: done
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-05-10T11:08:45
updated: 2026-05-10T11:08:45
tags:
  - agent/plan
  - initiative/pkm-ai
  - docs/health
created_by: codex
updated_by: codex
---

# Glossary Candidate Triage

## Goal

Resolve the remaining non-blocking `glossary-unknown` health warnings after the health residual auto-repair slice.

## Source Warnings

`node .agents/tools/pkm-ai/check-doc-health.mjs` reported 23 glossary warnings across hardening and polish source records. The warnings were candidates, not health failures; `doc health: OK` already passed.

## Triage Decision

All reported terms are active Vaultman vocabulary, adopted library vocabulary, or named implementation slices. None were stale probe terms or unrelated external/test terms.

Accepted into [[docs/architecture/glossary|Glossary]]:

- `active node`
- `cMenu queue repair`
- `controlled row selection`
- `file delete queue operation`
- `FnR rename state`
- `hybrid view mode`
- `measured card layout`
- `node selection service`
- `perf loop`
- `PretextJS`
- `primary node action`
- `queue builder`
- `quick-action badge`
- `rename handoff`
- `render hot path`
- `selected node`
- `SVAR filemanager`
- `TanStack Table Core`
- `user-facing recovery wave`
- `view adapter`
- `viewgrid`

No candidates were rejected or removed in this slice.

## Verification

- `node .agents/tools/pkm-ai/check-doc-health.mjs`: pass, no warnings.
- `node .agents/tools/pkm-ai/query-docs.mjs --glossary "active node"`:
  pass.
- `node .agents/tools/pkm-ai/query-docs.mjs --glossary "node selection service"`:
  pass.
- `node .agents/tools/pkm-ai/query-docs.mjs --glossary "SVAR filemanager"`:
  pass.
