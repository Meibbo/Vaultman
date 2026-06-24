---
title: Hover multiselection badges primitive
type: implementation-plan-shard
status: draft
parent: "[[docs/work/hardening/plans/2026-05-07-multifacet-2/index|multifacet wave 2 plan]]"
created: 2026-05-07T02:30:00
updated: 2026-05-07T02:30:00
tags:
  - agent/plan
  - explorer/badges
created_by: claude
updated_by: claude
---

# Phase 3 — Hover Multiselection Badges Primitive

> Spec: [[docs/work/hardening/specs/2026-05-07-multifacet-2/02-hover-badges-and-ops-log|Hover badges and ops log]]

## Tasks

- [x] Create `src/services/badgeRegistry.ts` with `ORDER`,
      `BadgeKind`, `visibleHoverBadges`, `activeBadges`.
- [x] Replace per-adapter badge ordering in
      `src/components/views/viewTree.svelte` and
      `src/components/views/ViewNodeGrid.svelte` with calls to
      `badgeRegistry`.
- [x] Update `src/styles/components/_badges.scss` (badge styles
      live there, not in `_badges.scss` under `explorer/`):
      - Drop the surrounding box style — scoped to `.is-hover-badge`
        so existing `.vm-badge` queue-popup rendering is unchanged.
      - Hover state: opacity faint, icon-only (`font-size: 0`).
      - Active state: full-weight text + icon (via `.is-active`).
- [x] Wire `activeOpsByNode` derivation from
      `OperationQueueService` so the registry knows which badges are
      already active. `panelExplorer.svelte` subscribes to
      `queueService.on('changed')`, increments a `queueVersion`
      counter, and rebuilds the map via `$derived` keyed on that
      counter.
- [x] Hide hover badge of kind K if the node already has K queued.
- [x] When `delete` is queued for a node, registry returns
      `['filter']` only.

## Tests

- [x] `test/unit/services/badgeRegistry.test.ts` — ordering, hide-on-
      duplicate, delete-only-filter (12/12 pass).
- [x] `test/component/viewTreeHoverBadges.test.ts` — hover renders
      4 badges, icon-only, convert excluded, click routes through
      `onHoverBadgeAction` (4/4 pass).
- [x] `test/component/viewGridHoverBadges.test.ts` — same contract on
      the grid adapter (3/3 pass).
- [x] `test/component/panelExplorerBadgeCollision.test.ts` —
      simulating queued ops, asserting hover badge subset (4/4 pass).

## Verification

- [x] Focused unit + component runs (12 unit + 11 hover-badge
      component + 26 regression component).
- [x] `pnpm exec vp lint` — 0 warnings 0 errors.
- [x] `pnpm exec vp build` — `styles.css` regenerated.
- [x] `git diff --check` scoped to touched files — clean.

## Stop Conditions

- Stop if removing the badge box style breaks layout for queue-popup
  badges. Scope new styles to `is-hover-badge` class only.
- Stop if `activeOpsByNode` derivation triggers a render-loop in
  Svelte runes; memoize via `$derived` keyed on queue version.
