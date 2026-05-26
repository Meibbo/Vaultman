---
title: Performance Hypotheses And Instrumentation Targets
type: research-shard
status: active
parent: "[[index|V.D Tree/List/Notebook Navigator Pipeline Discovery]]"
created: 2026-05-25T00:00:00
updated: 2026-05-25T00:00:00
tags:
  - agent/research
  - explorer/performance
  - explorer/view-decomposition
---

# Performance Hypotheses And Instrumentation Targets

This shard separates likely root causes from facts. The next agent should add
timing marks before large refactors, then use the marks to keep the V.D slice
honest.

## Measured Baseline

Existing 50k Files matrix:

| View | Blank frames | Max blank | Max delay | p95 delay | p99 delay |
|---|---:|---:|---:|---:|---:|
| Tree | 0 | 0 ms | 1051 ms | 90 ms | 1051 ms |
| List | 0 | 0 ms | 43 ms | 10 ms | 43 ms |

Interpretation:

- The blank-frame bug is not the immediate Tree differentiator in this matrix.
- Tree has severe event-loop pressure even when visible rows do not blank.
- The target is not merely "paint something"; it is reducing Tree's main-thread
  work toward List/Notebook Navigator shape.

## Hypothesis 1: `flatProjectionRows` Is The Main Structural Hotspot

Evidence:

- It processes every input row.
- It allocates `indexById`, `visibleChildParentIds`, `TreeFlatNode[]`, and
  ancestor arrays.
- It computes `subtreeEndIndex` with a forward scan from each row until depth
  decreases.

Risk:

- In broad/deep topologies, the forward scan can approach quadratic behavior.
- Even in non-quadratic cases, it repeats work that can be computed once in the
  data plane.

Instrumentation:

- Add `perfProbe.measure('viewTree.flatProjectionRows.total', { rows })`.
- Add child marks for `indexById`, `flatNodes`, `ancestry`, and `subtree`.
- Log `maxDepth`, `expandedCount`, and `visibleChildParentCount`.

## Hypothesis 2: Tree Receives Too Many Rows

Evidence:

- `logicExplorerSnapshot` has `visibleIds`.
- `panelExplorer` feeds Tree with `snapshot.rows`.
- `createExplorerProjection` treats every `rowInput` as visible in its
  projection arrays.

Risk:

- Tree render count and projection work scale with structural rows, not visible
  rows.
- Collapsed branches still contribute to work if included in `snapshot.rows`.

Instrumentation:

- In `panelExplorer`, count `snapshot.rows.length`, `snapshot.visibleIds.length`,
  `treeRowInputs.length`, and `treeProjection.rows.length`.
- In the stress matrix, include these counts in the Tree run output.

## Hypothesis 3: Per-Row Decoration Runs Too Late

Evidence:

- `treeRow` computes direct badges, child badges, hover badges, icon choice,
  count presence, field values, active/warning/editing/highlight state, DnD
  state, and class strings.
- Notebook Navigator precomputes or memoizes many equivalent row facts.

Risk:

- Scroll invalidations can re-enter expensive row helpers for every rendered
  and sticky row.
- Sticky rows duplicate row render work for ancestors.

Instrumentation:

- Count rendered row invocations per scroll frame.
- Measure `visibleNodeFieldValues`, `visibleHoverBadgeDescriptors`,
  `visibleNodeBadgesForMask`, and `inheritedNodeBadges` under a Tree-specific
  mark.

## Hypothesis 4: Scroll Fallback State Causes Extra Invalidations

Evidence:

- `onScroll` calls `syncFallbackScrollState`.
- `fallbackScrollTop` feeds `renderedVirtualRows` fallback coverage,
  `stickyRows`, and sticky-layer style.
- `fallbackViewportHeight` feeds virtual fallback and sticky rows.

Risk:

- Every scroll updates Svelte state that can invalidate derived computations
  beyond TanStack's own virtualizer update.

Instrumentation:

- Count `syncFallbackScrollState` calls.
- Measure `computeStickyRows`.
- Measure `virtualRowsCoverScrollWindow`.
- Compare Tree with sticky disabled under a dev-only flag to isolate cost.

## Hypothesis 5: Row Component Boundary Matters, But It Is Secondary

Evidence:

- Notebook Navigator uses `React.memo` per row component.
- Vaultman uses a large Svelte snippet.
- Svelte keyed each can still perform well if row inputs and dependencies are
  stable.

Risk:

- Extracting a `TreeRow` component before fixing the projection contract may
  add prop churn without addressing the structural hotspot.

Instrumentation:

- First measure projection and decoration costs.
- Only split row components after proving row render dominates remaining cost.

## Measurement Order For Next Agent

1. Add timing marks without changing behavior.
2. Run the existing focused unit/component gates for touched files.
3. Run the 50k Tree/List stress-vault matrix and preserve raw output in the
   implementation record.
4. Implement visible render projection.
5. Re-run the same matrix.
6. Only then consider row component extraction or sticky algorithm changes.

