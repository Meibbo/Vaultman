---
title: Vaultman Gap Analysis Against Notebook Navigator Scroll
type: spec-shard-index
status: active
parent: "[[docs/work/hardening/specs/2026-05-16-notebook-navigator-scroll-forensics/index|Notebook Navigator Scroll Forensics]]"
created: 2026-05-16T00:00:00
updated: 2026-05-16T00:00:00
tags:
  - agent/spec
  - explorer/performance
  - vaultman
---

# Vaultman Gap Analysis Against Notebook Navigator Scroll

This shard is split into rendering/offset gaps and orchestration/test gaps.

## Continuations

1. [[docs/work/hardening/specs/2026-05-16-notebook-navigator-scroll-forensics/02a-rendering-offset-gaps|Rendering and offset gaps]]
2. [[docs/work/hardening/specs/2026-05-16-notebook-navigator-scroll-forensics/02b-orchestration-test-gaps|Orchestration and test gaps]]

## Current Vaultman Scroll Surfaces

Vaultman Explorer view components currently use `@tanstack/svelte-virtual`.

Observed constants:

- `viewTree.svelte`: `TREE_OVERSCAN = 10`, fixed row height, bounded fallback.
- `ViewNodeList.svelte`: `LIST_OVERSCAN = 5`, fixed row height, bounded fallback.
- `ViewNodeTable.svelte`: `TABLE_OVERSCAN = 14`, variable row heights.
- `ViewNodeGrid.svelte`: `GRID_OVERSCAN = 6`, variable row heights by grid row.
- `ViewNodeCards.svelte`: `CARD_OVERSCAN = 4`, variable row heights by card row.

The fixed-height list/tree fallback helper is good in isolation:

- `serviceScroll.fallbackFixedVirtualRows()` computes visible start from
  `scrollTop / rowHeight`.
- It returns only visible rows plus overscan.
- It is O(visible rows) for fixed heights.

The issue is that this pattern is not consistently applied across modes, and
the live repro is a repeated jump/render starvation problem, not a single
mathematical scrollTop problem.

