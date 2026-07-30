---
title: Feature Intake Continuation — PanelData, Primitive Adapters, Presets
type: research-shard
status: active
parent: "[[docs/work/hardening/research/2026-05-28-feature-request-architecture-fit/index|feature-request architecture fit]]"
created: 2026-05-29T23:58:00
updated: 2026-05-29T23:58:00
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags:
  - agent/research
  - initiative/hardening
  - explorer/architecture
  - agent/feature-intake
---

# PanelData, Primitive Adapters, Presets

Continuation from the 2026-05-29 grill. This shard preserves the unresolved `panelData`, DataViz, primitive-adapter, Notion-toolbar, and widget-layout discussion.

## PanelData / DataViz Abstraction

`panelExplorer` is node-row/shape oriented. Dashboards/widgets/charts need a sibling data abstraction:

```text
MetricProvider / DataQuery
  -> DataSnapshot (series, buckets, aggregates, scalar stats, table)
  -> panelData runtime (chart/stat/widget renderer)
  -> primitives/actions (drill-down, filter, export, pin, compare)
```

`panelData` may consume Node providers, but its output is not always Node rows. Example outputs:
counts by tag, minutes watched per channel, notes created by month, operation queue latency, property value distribution, cache size over time. This makes Charts/DataViz a `panelData` runtime first, not necessarily a fifth top-level engine.

### Clarification from 2026-05-29 grill

Do NOT lock "panelData does not use nodes" as the decision. A `panelData` can consume nodes, selections, queries, operations, time, or provider metrics. The difference is primary contract:

- `panelExplorer` = collection/navigation/workbench panel over many `NodeOccurrence`s. It is optimized for high node counts, many Cells, selection, reveal, sort/group/filter, DnD, and multiple View engines.
- `panelData` = computed/interactive data unit. It can render one node, a few selected nodes, aggregate buckets/series, a dashboard stat, a chart point set, a timer, or a widget. It may emit Operations back to nodes through the Mediator.

The stopwatch example is valid:

```text
Explorer selection -> WorkspaceMediator -> Stopwatch panelData
  -> user marks time
  -> OperationNode: add/update property value on selected FileNodes
  -> queue preview OR bypass direct mode
```

`panelData` may expose capabilities through `PanelHandle` too, but not the same default set as `panelExplorer`. A `viewScene` or `sortScene` should target panels by declared capability:

- explorer supports view-config/sort/group/filter by default.
- data panels may support chart type, metric query, bucketing, time range, color scale, drill-down, or input binding.
- layout-edit mode targets Scene/panel/primitive placement, resize, and provider/kind editing through the LayoutBuilder, not through explorer sort/view semantics.

Charts in proto v7 may be visually unlike explorer but still represent nodes as points. That does not force them into `panelExplorer`; the deciding question is whether the primary interaction is explorer-like node browsing, or computed data visualization/control.

Spreadsheet-like table behavior is unresolved. Some parts belong to Table engine over node cells; formula and operational math may belong to `panelData`, a formula/cell-source layer, or external bridges.
Scriptable logic (JS/Python/Dataview/Datacore/JS Engine/MetaBind-style) needs separate research; bridge existing plugins before building our own execution sandbox.

## UI Primitive Library Strategy

Bits UI / shadcn-svelte / UnoCSS should not decide the architecture. The safer pattern is a **VM Primitive Adapter layer**:

- Vaultman owns stable primitive contracts: button/action trigger, menu, checkbox, popover, tabs, slider, combobox, command palette, toolbar item, drawer, tooltip, resizer.
- Implementation can wrap Bits UI, copied shadcn-svelte code, or our own Svelte component.
- Presets choose styling and placement; primitive behavior contracts stay stable.
- If a library fights mobile, Obsidian DOM, UnoCSS, or deep customization, replace the adapter without changing Scene contracts.

Research is still required before removing Bits UI or rejecting shadcn-svelte. The right test is a small prototype: one toolbar, one popover/menu, one drawer, one checkbox variant, styled through Obsidian-native and Notion-like presets.

## Notion / Widget Inspiration Fit

Notion-like databases/toolbars and mobile homescreen widget apps validate existing Vaultman directions:

- **Notion-style database richness** maps to Scene templates + `panelExplorer`/`panelData` + view-config
  + LayoutBuilder presets.
- **Notion vs Obsidian toolbar switching** maps to Toolbar model resolver + primitive registry + placement policy + Style/Theme presets. Same ActionNodes, different preset composition.
- **Homescreen-widget flexibility** maps to LayoutBuilder live-edit mode: tile-tree/free-canvas, size-marks, placement marks, snippets/classes, resize handles, and preset bundles.

This does not require breaking the locked model. It adds pressure to formalize:
PanelData, node occurrences/membership, primitive adapters, toolbar presets, and storage policy.

## New Follow-up Decisions

- S-26: node identity vs occurrence/membership model. **LOCKED 2026-05-29**.
- S-27: `panelData` data contract (`MetricProvider`/`DataSnapshot`) vs treating charts as ordinary nodes.
- S-28: external provider remote actions and undo/offline guarantees.
- S-29: UI primitive adapter strategy for Bits UI / shadcn-svelte / custom primitives.
- S-30: Notion-like vs Obsidian-native toolbar preset target.

## Status

Captured as feature-intake continuation. No spec or implementation greenlight.
