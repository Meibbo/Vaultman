---
title: Explorer View Platform pass implementation plan
type: plan-index
status: completed
parent: "[[docs/work/hardening/specs/2026-05-15-explorer-view-platform-pass/index|Explorer View Platform pass spec]]"
created: 2026-05-15T18:00:10.0199112-05:00
updated: 2026-05-16T06:20:10-05:00
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
- [[07-performance-comparison-repair|Performance comparison repair]]

## Execution Rules

- Start with tests, harnesses, and probes.
- Do not make Map/ViewNodeMap selectable.
- Do not redesign tree visuals outside the accepted fixes.
- Keep media render off by default in every view.
- Avoid tree/list-only platform APIs.
- Commit after each task or small coherent group.
- If a task uncovers unrelated visual polish, record it as follow-up instead of bundling it into this pass.

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

## Completion Snapshot

Completed on branch `claude/explorer` through Task 20, then repaired after review found the missing Notebook Navigator comparison gate and lingering Markmap menu exposure.

Key verification record:
[[perf-baseline|Explorer View Platform perf baseline]].

Repair record:
[[07-performance-comparison-repair|Explorer platform performance comparison repair]].

Final task commits:

- `6aa23aa` `refactor: migrate tree rows to explorer projection`
- `f1ba4ac` `refactor: route tree reveal through scroll coordinator`
- `25c9d6b` `refactor: align panel tree list projection adapters`
- `8056ef5` `refactor: add platform contracts to table grid cards`
- `4f609af` `test: verify explorer platform focused gates`
- `c457d01` `test: record live explorer platform perf probe`

Final local gates:

- `pnpm check`: passed, 0 Svelte errors / 0 warnings.
- `pnpm run build`: passed and synced plugin build artifacts to `plugin-dev`.
- `pnpm verify`: passed with unit `135` files / `821` tests and component `69` files / `372` tests. Lint emitted 8 warnings in pre-existing unrelated files, with 0 errors.
- `git diff --check`: passed.
- Live Obsidian CLI target confirmed with `obsidian eval code="app.vault.getName()" vault=plugin-dev` returning `plugin-dev`.
- `obsidian dev:errors vault=plugin-dev`: `No errors captured.`

Post-review repair gates:

- Notebook Navigator original focused tests passed: 4 files / 19 tests with Node 24.15.0.
- New Notebook Navigator comparison bridge passed and enforces Vaultman 50K projection faster than the comparable Notebook Navigator list bridge.
- Logged bridge medians: Notebook Navigator list `61.1534 ms`; Vaultman projection `26.9575 ms`; Notebook Navigator lookups `0.7050 ms`; Vaultman lookups `0.1517 ms`.
- View menu live smoke in `plugin-dev` exposes only `Tree`, `List`, `Table`, `Grid`, and `Cards`; `Markmap` is absent.
- `pnpm verify`: passed with unit `136` files / `824` tests and component `69` files / `372` tests. Lint emitted 8 pre-existing warnings, with 0 errors.
