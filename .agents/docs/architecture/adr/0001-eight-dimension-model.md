---
title: 0001 — Eight-dimension architecture model
type: adr
status: active
parent: "[[docs/architecture/adr/README|adr]]"
created: 2026-05-26T00:00:00
updated: 2026-05-26T00:00:00
created_by: claude-opus-4-7
updated_by: claude-opus-4-7
tags:
  - agent/adr
  - explorer/architecture
---

# 0001 — Eight-dimension architecture model

**Decision status:** Accepted (Y4). **Date:** 2026-05-26.

## Context

Explorer responsibilities are tangled across `panelExplorer` (1400 LOC), the views (4377 LOC), and god-providers (~13K LOC total). A pure 4-axis split (Surface/View/Node/Logic) left Navigation, Style/Theme, release/agent Process, and the queue/diff Operations domain without a clear home.

## Decision

Organize the system as **8 dimensions**: core orthogonal axes **Surface · View · Node · Logic**, plus cross-cutting **Navigation** (a Logic sub-axis) **· Style/Theme · Process · Operations**. Every module maps to a primary dimension; Operations is a domain that spans the core axes. See [[docs/architecture/explorer-model/index|explorer-model]].

## Consequences

- Ownership is explicit; specs, contracts, and T.G invariants organize by dimension.
- The umbrella sub-systems (N.R/A.R/V.D/P.D/B.P/C.D/K.B/…) map onto the dimensions.
- "It covers everything" must be re-verified when new capabilities appear.

## Alternatives considered

- Pure 4-axis: too coarse — Theme/Navigation/Process were homeless.
- Per-feature modules: no cross-feature reuse; the current tangle.
