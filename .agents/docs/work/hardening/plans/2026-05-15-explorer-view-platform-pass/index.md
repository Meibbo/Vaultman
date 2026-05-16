---
title: Explorer View Platform pass implementation plan
type: plan-index
status: draft
parent: "[[docs/work/hardening/specs/2026-05-15-explorer-view-platform-pass/index|Explorer View Platform pass spec]]"
created: 2026-05-15T18:00:10.0199112-05:00
updated: 2026-05-15T18:00:10.0199112-05:00
tags:
  - agent/plan
  - initiative/hardening
  - explorer/views
  - explorer/performance
  - explorer/tree
created_by: codex
updated_by: codex
---

# Explorer View Platform Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Explorer platform layer, migrate `viewTree` for real, restore known tree visual contracts, and prove 10K/50K/100K behavior with deterministic feedback loops before product rewrites.

**Architecture:** Add shared projection, feature/menu contracts, scroll/geometry coordination, decoration/media layers, and a conservative tree adapter path. Existing tree markup stays visually locked except for the accepted fixes: box selection, selected/filtered state composition, right-aligned extensions, and hidden `.md`.

**Tech Stack:** Svelte 5 runes; `@tanstack/svelte-virtual`; Vitest unit/component suites; existing `perfProbe`; Obsidian CLI live `plugin-dev` smokes; Pretext-backed `TextMeasureService`; existing `ExplorerMediaCache`.

---

## Project Commands

| Action | Command |
|---|---|
| Unit tests | `pnpm test:unit` |
| Component tests | `pnpm test:component` |
| Svelte check | `pnpm check` |
| Build | `pnpm run build` |
| Full gate | `pnpm verify` |
| Diff hygiene | `git diff --check` |

## Plan Shards

- [[01-feedback-harness-and-probes|Feedback harness and probes]]
- [[02-projection-feature-menu-contracts|Projection, feature, and menu contracts]]
- [[03-scroll-geometry-decoration-media|Scroll, geometry, decoration, and media layers]]
- [[04-tree-visual-contract-recovery|Tree visual contract recovery]]
- [[05-viewtree-platform-migration|viewTree platform migration]]
- [[06-integration-verification-handoff|Integration, verification, and handoff]]

## Execution Rules

- Start with tests, harnesses, and probes.
- Do not make Map/ViewNodeMap selectable.
- Do not redesign tree visuals outside the accepted fixes.
- Keep media render off by default in every view.
- Avoid tree/list-only platform APIs.
- Commit after each task or small coherent group.
- If a task uncovers unrelated visual polish, record it as follow-up instead of
  bundling it into this pass.

## File Map

- Create: `test/support/explorerSyntheticDataset.ts`
- Create: `test/unit/performance/explorerPlatformSynthetic.test.ts`
- Create: `test/unit/services/serviceExplorerProjection.test.ts`
- Create: `test/unit/services/serviceExplorerViewContract.test.ts`
- Create: `test/unit/services/serviceExplorerScrollGeometry.test.ts`
- Create: `test/component/viewTreeVisualContract.test.ts`
- Modify: `src/dev/perfProbe.ts`
- Modify: `src/services/serviceExplorerRowInput.ts`
- Modify: `src/services/serviceExplorerLayers.ts`
- Modify: `src/services/serviceExplorerMediaCache.ts`
- Modify: `src/services/serviceNodeFieldVisibility.ts`
- Modify: `src/components/layout/overlays/overlayViewMenu.svelte`
- Modify: `src/components/views/viewTree.svelte`
- Modify: `src/components/views/ViewNodeList.svelte`
- Modify: `src/components/views/ViewNodeTable.svelte`
- Modify: `src/components/views/ViewNodeGrid.svelte`
- Modify: `src/components/views/ViewNodeCards.svelte`
- Modify: `src/components/panels/panelExplorer.svelte`

## Success Summary

- 10K is a release gate.
- 50K must pass for core, tree, and list.
- 100K proof benchmark runs and reports without architectural collapse.
- `table`, `grid`, and `cards` keep platform contracts and 10K gates.
- Tree visual contract fixes are covered by tests.
- Map is absent from selectable views.
- Hidden media cost is measured and near zero.
