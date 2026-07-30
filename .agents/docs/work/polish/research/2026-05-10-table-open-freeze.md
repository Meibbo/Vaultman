---
title: Table open freeze diagnosis
type: bug-diagnosis
status: complete
parent: "[[docs/work/polish/specs/2026-05-07-tanstack-node-table/index|tanstack-node-table]]"
created: 2026-05-10T04:34:01
updated: 2026-05-10T04:34:01
tags:
  - agent/research
  - bug/table
  - performance
---

# Table Open Freeze Diagnosis

## Symptom

Opening Vaultman's Table view could freeze Obsidian hard enough that CLI developer commands timed out until the app recovered or was restarted.

## Repro Loop

Created `test/component/viewTableStress.test.ts` with two focused component stress cases:

- `PanelExplorer` in `viewMode: 'table'` with 5,000 flat nodes.
- Raw `ViewNodeTable` with 1,000 precomputed table rows.

Before the fix:

- 20,000 `PanelExplorer` table nodes did not complete within a 180s command timeout.
- 5,000 `PanelExplorer` table nodes completed in about 50s.
- 1,000 raw `ViewNodeTable` rows completed in about 7.6s.

## Root Cause

`ViewNodeTable.svelte` had two unbounded first-frame costs:

1. When the TanStack virtualizer had not emitted its first virtual window, `renderedRows` fell back to mapping every table row. That rendered thousands of table rows before virtualization could take over.
2. The component used `@tanstack/table-core` row model wrappers for every row before rendering the virtualized window. For large row counts, that created a large synchronous row/cell object graph on the UI thread.

The combination made opening Table view an unbounded main-thread operation.

## Fix

`ViewNodeTable.svelte` now:

- caps the startup fallback render to an initial viewport-sized window;
- renders directly from Vaultman's `ViewRow` and `ViewColumn` contracts;
- keeps local controlled sorting for sortable headers;
- preserves stable row ids, selection/focus/active classes, provider-specific columns, context menu callbacks, keyboard callbacks, and select-all behavior.

`serviceViewTableAdapter.ts` still owns the provider table row/column contract and keeps the existing adapter tests green.

## Verification

Focused regression:

- `pnpm exec vp test run --project component --config vitest.config.ts test/component/viewTableStress.test.ts --fileParallelism=false --reporter verbose`
  - 5,000-node `PanelExplorer` table open: about 1.7s.
  - 1,000-row raw table mount: about 0.3s.

Focused behavior:

- `pnpm exec vp test run --project component --config vitest.config.ts test/component/viewTableSelection.test.ts test/component/panelExplorerSelection.test.ts test/component/virtualizerItemKeys.test.ts --fileParallelism=false --reporter verbose`
- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceViewTableAdapter.test.ts --reporter verbose`

Broad checks:

- `pnpm run check`
- `pnpm run lint`
- `pnpm run build`

Live Obsidian smoke:

- `obsidian plugin:reload id=vaultman`
- `obsidian command id=vaultman:open`
- Programmatically opened the view menu and clicked Table.
- DOM result: `hasTable: true`, `rows: 23`, headers `Name / Kind / Type / Count`.
- `obsidian dev:errors`: no errors captured.
- `obsidian dev:console level=error`: no console messages captured after attaching debugger.

