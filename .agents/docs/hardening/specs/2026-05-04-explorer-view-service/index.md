---
title: Explorer view service spec
type: spec-index
status: draft
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-05-04T15:25:00
updated: 2026-05-04T18:15:57
tags:
  - agent/spec
  - initiative/hardening
  - explorer/views
---

# Explorer View Service Spec

This spec defines a service-owned view architecture for Vaultman explorers.
It preserves the full design conversation instead of compressing it into a
single short note.

## Decision Summary

- Build `serviceViews.svelte.ts` as the owner of explorer view state and render
  models.
- Views receive semantic layers; they do not query plugin services directly.
- Each view projects the same layers in its own visual form.
- Replace the current failed `viewGrid.svelte` table attempt.
- Add a real `viewTable.svelte` modeled after Obsidian Bases table semantics.
- Rebuild `viewGrid.svelte` as file-explorer icon grid, not matrix/table.
- Add or reuse `viewCards.svelte` following Bases card-view semantics.
- Add `viewList.svelte` for queue, active filters, marks, and compact lists.
- Keep `viewTree.svelte` as hierarchy renderer with expansion and bubbling.

## Shards

1. [[docs/work/hardening/specs/2026-05-04-explorer-view-service/01-background-current-state|Background and current state]]
2. [[docs/work/hardening/specs/2026-05-04-explorer-view-service/02-research-and-taxonomy|Research and view taxonomy]]
3. [[docs/work/hardening/specs/2026-05-04-explorer-view-service/03-architecture-principles|Architecture principles]]
4. [[docs/work/hardening/specs/2026-05-04-explorer-view-service/04-serviceviews-contract|serviceViews contract]]
5. [[docs/work/hardening/specs/2026-05-04-explorer-view-service/05-render-model-layers|Render model layers]]
6. [[docs/work/hardening/specs/2026-05-04-explorer-view-service/06-view-projections|View projections]]
7. [[docs/work/hardening/specs/2026-05-04-explorer-view-service/07-decorations-and-marks|Decorations and marks]]
8. [[docs/work/hardening/specs/2026-05-04-explorer-view-service/08-interactions|Interactions]]
9. [[docs/work/hardening/specs/2026-05-04-explorer-view-service/09-groups-sorting-templates|Groups, sorting, templates]]
10. [[docs/work/hardening/specs/2026-05-04-explorer-view-service/10-migration-plan|Migration plan]]
11. [[docs/work/hardening/specs/2026-05-04-explorer-view-service/11-testing-and-verification|Testing and verification]]
12. [[docs/work/hardening/specs/2026-05-04-explorer-view-service/12-open-questions-risks|Open questions and risks]]
13. [[docs/work/hardening/specs/2026-05-04-explorer-view-service/13-hierarchical-badge-bubbling|Hierarchical badge bubbling]]

## Non-Goals

- Do not implement the whole system in one change.
- Do not use the current `viewGrid.svelte` API as the table foundation.
- Do not couple views back to `queueService`, `filterService`,
  `DecorationManager`, `App`, or explorer providers.
- Do not expose Obsidian internal Bases APIs unless they are verified and
  routed through a documented integration boundary.

## Source Notes

- Current queue and active filters explorers self-render their popup lists.
- Current `viewGrid.svelte` is file-specific and table-like, not a true grid.
- Current `DecorationManager` handles icons and query highlights, but queue,
  filters, bubbling, and marks are still distributed across explorers/views.
- Obsidian Bases official docs distinguish table, cards, list, and map views.
- Windows list-view taxonomy distinguishes icon/tile views from details/table.
