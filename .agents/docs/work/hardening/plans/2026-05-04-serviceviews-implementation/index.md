---
title: serviceViews implementation plan
type: plan-index
status: historical
parent: "[[docs/work/hardening/specs/2026-05-04-explorer-view-service/index|explorer-view-service]]"
created: 2026-05-04T16:40:00
updated: 2026-05-12T09:00:34
tags:
  - agent/plan
  - explorer/views
updated_by: codex
---

# serviceViews Implementation Plan

> [!warning] Historical Plan
> This plan is partially completed and is no longer executable as the current
> Explorer data-plane plan. Keep it as contract/list-migration history only.
> Current Explorer data-plane work starts from
> [[docs/work/hardening/plans/2026-05-11-explorer-data-plane-transition/02-edp-002-files-snapshot-data-plane-implementation-plan|EDP-002 Files snapshot data-plane implementation plan]].
> `NodeSelectionService` owns selection/focus/hover/active state; `serviceViews`
> remains the render-layer/decorative model boundary.

> For agentic workers: execute task-by-task with tests first. Do not migrate all
> explorer views in one slice.

Goal: introduce a service-owned explorer view render model and migrate the first compact list consumers without touching table/grid/tree rewrites yet.

Architecture: `typeViews.ts` defines the shared render contract. `serviceViews` turns explorer source nodes into semantic rows/layers. `viewList.svelte` renders those rows for queue and active filters while explorer popups keep their existing shells and actions.

Tech stack: TypeScript, Svelte 5 runes, Vitest unit/component tests, existing `Virtualizer`.

## Shards

1. [[docs/work/hardening/plans/2026-05-04-serviceviews-implementation/01-slice-0-contracts|Slice 0 contracts]]
2. [[docs/work/hardening/plans/2026-05-04-serviceviews-implementation/02-slice-1-service|Slice 1 service]]
3. [[docs/work/hardening/plans/2026-05-04-serviceviews-implementation/03-slice-2-viewlist-migration|Slice 2 viewList migration]]

## Guardrails

- Do not base `viewTable.svelte` on current `viewGrid.svelte`.
- Do not make views call `queueService`, `filterService`, `DecorationManager`, `App`, or indexes directly.
- Do not remove current queue/filter behavior until the shared list renders the same visible rows and remove/clear/execute actions still work.
- Keep `viewTree.svelte` changes out of Slice 0-2 unless a compile error requires a type-only import update.

## Verification

- Tooling: `node --test "tools/pkm-ai/test/*.test.mjs"`.
- Contracts/service: `pnpm run test:unit -- --run test/unit/services/serviceViews.test.ts`.
- Component migration: `pnpm run test:component -- --run test/component/viewList.test.ts`.
- Type/Svelte check when Svelte files change: `pnpm run check`.
