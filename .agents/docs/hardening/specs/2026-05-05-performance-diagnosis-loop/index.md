---
title: Performance diagnosis loop
type: spec-index
status: draft
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-05-05T20:51:26
updated: 2026-05-05T20:51:26
tags:
  - agent/spec
  - initiative/hardening
  - performance
  - explorer/views
glossary_candidates:
  - perf loop
  - view adapter
  - render hot path
---

# Performance Diagnosis Loop

## Goal

Create a reproducible performance feedback loop before changing explorer
architecture. The loop must measure the regressions reported after
`serviceDecorate` and `serviceViews`: slow search, sluggish scroll, delayed
filter selection, operation badge latency, and broken or hardcoded context menu
integration.

This spec intentionally puts diagnosis before TanStack migration, DnD work, or
view rewrites. Those changes remain valid options, but they should be justified
by measured bottlenecks.

## User Priority

Execution order confirmed by the user:

1. Performance diagnosis and hot-path measurement.
2. Context menu redesign after performance evidence.

Pain ranking:

- Most annoying: scroll followed by filtering.
- Most broken: context menu.
- Candidate DnD library: `@thisux/sveltednd`.
- Robustness target: CodeQL.

## Measurement Scope

The first slice must measure these interactions in Obsidian:

- Scroll in a large explorer tree.
- Search in Props, Files, and Tags explorers.
- Select a node and apply it as a filter.
- Add or remove an operation and update badges.
- Open context menu on tree rows after performance probes exist.

The initial probe should be developer-facing, not product UI. A good target is
an Obsidian-runnable hook such as:

```ts
window.__vaultmanPerfProbe.run('filters-search')
```

The output should be structured JSON so runs can be compared before and after
optimizations.

## Metrics

Capture at minimum:

- Total interaction duration from trigger to DOM-stable state.
- Number of calls to `provider.getTree()`.
- Number of calls to `bubbleHiddenTreeBadges()`.
- Number of tree flatten operations.
- Number of decoration calls through `DecorationManager.decorate()`.
- Number of `ViewService.getModel()` calls.
- Number of view-service notifications during selection.
- Visible row count and total source node count.
- Operation/filter badge recomputation counts.

If a metric is too invasive for the first slice, record that gap explicitly in
the probe output rather than guessing.

## Initial Hypotheses

Ranked hypotheses to test:

1. Explorer state changes rebuild whole trees too often.
2. Badge bubbling and flattening run across more nodes than the visible window
   requires.
3. `serviceViews` and `serviceDecorate` calculate semantic layers, icons,
   badges, and highlights too often per node.
4. Selection emits too many notifications because it calls `clearSelection`,
   repeated `select`, and `setFocused` separately.
5. The custom virtualizer may be less important than upstream model/tree
   rebuilds, but it must be measured before replacing it.

## Architecture Direction After Measurement

Potential optimizations after evidence:

- Batch selection and focus updates in `ViewService`.
- Cache or memoize decoration output by stable node/context/search inputs.
- Avoid full-tree badge bubbling during scroll.
- Move tree flattening into a cached render model if inputs are unchanged.
- Replace custom virtualization with `@tanstack/svelte-virtual` only if the
  probe shows virtualization is a real bottleneck.
- Introduce `@tanstack/svelte-table` for `viewTable`, not for tree.
- Consider `@tanstack/svelte-hotkeys` for shared keyboard interactions after
  hot paths are stable.

## Deferred Work

Context menu redesign comes after the perf loop. The target design is:

- `ContextMenuService` resolves and renders actions.
- Views emit generic context-menu requests.
- Explorers provide domain actions through typed registry entries.
- `MenuCtx` carries `nodeType`, `surface`, `selection`, `sourceView`, and the
  original node metadata without hardcoded `viewTree` or `explorerProps`
  assumptions.

DnD is also deferred. If adopted, `@thisux/sveltednd` should sit behind a local
adapter so Vaultman is not coupled directly to one library.

CodeQL is a separate robustness track and should be added as a workflow, not
mixed into the perf diagnosis slice.

## Success Criteria

- A repeatable Obsidian CLI/dev-console performance probe exists.
- The probe reports structured metrics for at least search, scroll, and filter
  selection.
- The probe identifies the top one or two hot paths with evidence.
- No architecture rewrite starts until the probe has produced baseline numbers.
- Existing product behavior remains unchanged during the diagnosis slice.

## Non-Goals

- Do not migrate to TanStack in the first slice.
- Do not implement DnD in the first slice.
- Do not rewrite context menu before the perf loop exists.
- Do not introduce product-facing performance UI.
- Do not commit changes unless the user explicitly asks.
