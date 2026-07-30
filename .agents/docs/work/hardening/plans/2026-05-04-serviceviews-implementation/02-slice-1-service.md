---
title: Slice 1 service
type: plan-shard
status: historical
parent: "[[docs/work/hardening/plans/2026-05-04-serviceviews-implementation/index|serviceviews-plan]]"
created: 2026-05-04T16:40:00
updated: 2026-05-12T09:00:34
tags:
  - agent/plan
  - explorer/views
updated_by: codex
---

# Slice 1 Service

> [!warning] Historical Slice
> This shard belongs to the historical
> [[docs/work/hardening/plans/2026-05-04-serviceviews-implementation/index|serviceViews implementation plan]].
> Do not execute it as current Explorer data-plane work.

## Files

- Create: `src/services/serviceViews.svelte.ts`
- Modify: `test/unit/services/serviceViews.test.ts`

## Steps

- [ ] Add failing tests for per-explorer mode state, selection toggling, expansion toggling, subscriber notification, and flat render model creation.
- [ ] Add a failing test that passes a fake decoration manager and verifies `icons` become `layers.icons` and query ranges become `layers.highlights.query`.
- [ ] Run the specific unit test and confirm the new tests fail because `ViewService` does not exist.
- [ ] Implement `ViewService` with Svelte rune state only where state is needed;
  keep pure row/model mapping in small private methods.
- [ ] Expose `createListModel`/`getModel` behavior through `IViewService` without requiring Obsidian `App` or concrete explorer services.
- [ ] Run the specific unit test and confirm all `serviceViews` tests pass.

## Acceptance

- Service can produce list rows from `QueueChange` and `ActiveFilterEntry` using supplied label/action mappers.
- Service does not import Svelte components.
- Service does not import queue/filter/index implementations.
