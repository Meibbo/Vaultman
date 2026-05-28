---
title: "0008 — Render ownership: data-plane vs shared runtime"
type: adr
status: active
parent: "[[docs/architecture/adr/README|adr]]"
created: 2026-05-26T00:00:00
updated: 2026-05-26T00:00:00
created_by: claude-opus-4-7
updated_by: claude-opus-4-7
tags:
  - agent/adr
  - explorer/view-decomposition
---

# 0008 — Render ownership: data-plane vs shared render-runtime

**Decision status:** Accepted (grill-confirmed 2026-05-26). **Date:** 2026-05-26.

## Context

ADR 0002 makes the View a pure renderer, but virtualization, scroll, measurement,
resizing, and dnd are intrinsically DOM-coupled and cannot live in a DOM-free layer.
Today `viewTree` reimplements all of this inline (a driver of the 1051 ms p99).

## Decision (proposed)

Two layers. **Data-plane (Logic, DOM-free):** the render-projection — visible order,
indices (`idToIndex`), grouping, cell-placement, decoration descriptors, applied
size-marks. **Render-runtime (View-side, SHARED across engines):** virtualizer
(tanstack-virtual), scroll element/state, measurement (pretext), node-resizer
(emits durable size-marks), table runtime (tanstack-table), dnd interaction (dnd-kit).
The node-resizer never mutates a node directly; it emits a size-mark that flows back
through the data-plane.

## Consequences

- One shared runtime across engines (removes the per-view duplication = the perf fix).
- The projection is unit-testable without a DOM.
- Adopting `dnd-kit` is a separate evaluation (not yet used).
- Reveal/`scrollTarget` execution lives in the runtime (the Panel emits a reveal intent);
  the unified mutation pipeline (preview / `diffview`) consumes the same data-plane projection.

## Alternatives considered

- Per-engine render runtime: duplication (status quo).
- View owns everything: the current tangle and perf bug.
