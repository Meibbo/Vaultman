---
title: 0002 — View = pure renderer
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

# 0002 — View = pure renderer

**Decision status:** Accepted. **Date:** 2026-05-26.

## Context

`viewTree.svelte` (1188 LOC) is simultaneously a renderer, a tree-projection engine,
a decoration computer, and a scroll-fallback owner. The 50k matrix shows Tree p99
1051 ms vs List 43 ms. The five views each re-implement overlapping logic, so the
same node renders divergently across views (the reported drift bug).

## Decision

A **View is a pure renderer** over a finished render-projection (rows flattened,
indexed, decorated with descriptors). It owns DOM/markup and local interaction
wiring only; data, projection, and decoration resolution move upstream. There is no
fixed set of "5 views": the render layer = a few render engines × modes × orientation
plus externally registered views. The DOM runtime (virtualizer/scroll/measure) is
shared, not per-view — see ADR 0008.

## Consequences

- Views become cheap and swappable; enables Bases-out renderers and per-level views.
- The projection becomes unit-testable without a DOM.
- Removing per-view runtime duplication is the path to fixing the 1051 ms p99.

## Alternatives considered

- Keep view-owns-data (status quo): the source of the perf + drift bugs.
- Per-view render runtime: duplicates virtualization/measure logic five times.
