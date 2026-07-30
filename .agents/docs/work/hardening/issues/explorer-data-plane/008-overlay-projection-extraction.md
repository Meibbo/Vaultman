---
title: EDP-008 Overlay projection extraction
type: issue
issue_id: EDP-008
status: completed
issue_kind: AFK
parent: "[[docs/work/hardening/issues/explorer-data-plane/index|Explorer data plane local issues]]"
created: 2026-05-11T20:55:00
updated: 2026-05-13T05:25:49
labels:
  - completed
tags:
  - agent/issue
  - initiative/hardening
  - explorer/views
blocked_by:
  - "[[004-batched-files-overlay-layers-viewservice|EDP-004]]"
  - "[[006-tags-props-snapshot-adapters|EDP-006]]"
created_by: codex
updated_by: codex
---

# EDP-008 Overlay Projection Extraction

## Parent

[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-transition/index|Explorer data plane transition]]

## Source

[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/17-wave-4-follow-up-slices#slice-b---overlay-projection-module|Wave 4 Slice B]]

## What To Build

Extract queue/filter projection rules behind a tested module while keeping `ViewLayers` as the output vocabulary and preserving existing badge registry semantics.

## Acceptance Criteria

- [x] Queue/filter projection rules move behind a tested module while `ViewLayers` stays output.
- [x] Queue popup and active-filter list presentation have pure projection tests outside Svelte components.
- [x] Existing `serviceBadge` and `badgeRegistry` vocabulary is reused.

## Completion Notes

- Implemented pure overlay projection in `src/services/serviceOverlayProjection.ts`.
- `ViewService` remains the render-model coordinator and now delegates queue, filter, and structural-row overlay layers to the projection module.
- Queue popup presentation moved to `src/services/serviceQueuePresentation.ts`.
- Active-filter labels, details, and reorder boundaries moved to `src/services/serviceActiveFilterPresentation.ts`.
- Files, Tags, and Props still consume overlays through the shared `ViewService`/`ViewLayers` path; structural snapshot adapters were not modified.

## Blocked By

- [[004-batched-files-overlay-layers-viewservice|EDP-004]]
- [[006-tags-props-snapshot-adapters|EDP-006]]

## Verification

- RED: focused EDP-008 tests failed on missing `serviceOverlayProjection`, `serviceActiveFilterPresentation`, `queueActionTone`, and `presentQueueModel` exports.
- PASS: `pnpm run test:unit -- test/unit/services/serviceOverlayProjection.test.ts test/unit/services/serviceQueuePresentation.test.ts test/unit/services/serviceActiveFilterPresentation.test.ts`
  - 3 files / 10 tests.
- PASS: `pnpm run test:unit -- test/unit/services/serviceViews.test.ts test/unit/services/badgeRegistry.test.ts test/unit/badges/serviceBadge.test.ts test/unit/services/serviceQueuePresentation.test.ts test/unit/services/serviceActiveFiltersIndex.test.ts test/unit/components/explorerFiles.test.ts test/unit/components/explorerTags.test.ts test/unit/components/explorerTagsSnapshot.test.ts test/unit/components/explorerProps.test.ts`
  - 9 files / 105 tests.
- PASS: `pnpm exec vitest run --project component --config vitest.config.ts test/component/navbarQueueDoubleClickClear.test.ts --fileParallelism=false`
  - 1 file / 4 tests.
- PASS: EDP-006 regression gate
  - 5 files / 51 tests.
- PASS: Sticky tree focused gate
  - 4 files / 39 tests.
- PASS: `pnpm run lint:full`.
- PASS: `pnpm run check`.
- PASS: `pnpm run build:plugin`.
- PASS: `git diff --check`.
- Integrated into `claude/explorer` with merge commit `10855e5`.
- PASS on merged `claude/explorer`: focused overlay unit 4 files / 27 tests, EDP-006 regression unit 5 files / 51 tests, sticky component 4 files / 39 tests, `lint:full`, `check`, and `build:plugin`.
