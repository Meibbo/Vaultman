---
title: Wave and task breakdown
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/index|explorer-data-plane-structural-taxonomy]]"
created: 2026-05-11T00:00:00
updated: 2026-05-11T19:56:34
tags:
  - agent/spec
  - explorer/views
---

# Wave And Task Breakdown

This is the operating ladder requested by the user. It separates research/spec work from later implementation planning and issue publication.

## Wave 1 - Reconnaissance, Complete

Goal: understand the existing codebase domains independently.

- Agent A: render surfaces and view adapters.
- Agent B: providers, indexes, logic, and source data.
- Agent C: `ViewService`, selection, overlays, scroll, DnD, invalidation.
- Agent D: existing docs, plans, stale edges, and conflicts.
- Agent E: tests, performance gates, and prior-art verification.

Output: this structural taxonomy folder and the parent data-plane PRD.

## Wave 2 - Vertical Codebase Specs, Complete

Goal: write detailed structural specs for the codebase slices that will be touched. This wave was captured from read-only codebase reconnaissance and then integrated locally after the user asked to continue without subagents.

- Spec Agent 1: Files tree vertical spec:
  [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/06-wave-2-files-tree-vertical-spec|Wave 2 files tree vertical spec]].
  - Covers files index, files provider adapter, file tree projection, `panelExplorer`, `ViewService`, `ViewTree`, selection, scroll reveal, tests.
- Spec Agent 2: Tags and Props vertical spec:
  [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/07-wave-2-tags-props-vertical-spec|Wave 2 tags and props vertical spec]].
  - Covers tag/property indexes, metadata cache reads, provider actions, search/sort modes, action scope, active-filter overlays, tests.
- Spec Agent 3: Queue and active-filter overlay spec:
  [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/08-wave-2-overlay-invalidation-spec|Wave 2 overlay invalidation spec]].
  - Covers operations index, active filters index, badge taxonomy, overlay invalidation, `ViewLayers`, `utilViewLayers`, queue/filter tests.
- Spec Agent 4: View adapter and virtualizer spec:
  [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/09-wave-2-view-adapter-virtualizer-spec|Wave 2 view adapter and virtualizer spec]].
  - Covers tree/grid/table/cards/list/SVAR adapters, row models, reveal-by-id, virtualizer keys, scroll services, adapter compatibility.
- Spec Agent 5: Selection/control state spec:
  [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/10-wave-2-selection-control-spec|Wave 2 selection and control state spec]].
  - Covers `NodeSelectionService`, focus/active/hover distinction, expansion, keyboard flows, DnD/drop context, surface coordinator responsibilities.
- Spec Agent 6: Test and performance gate spec:
  [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/11-wave-2-test-performance-gates|Wave 2 test and performance gates]].
  - Covers red/green gates, existing prior-art tests, missing snapshot tests, perf probes, live smoke boundaries.
- Spec Agent 7: Plan reconciliation spec:
  [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/12-wave-2-plan-reconciliation-spec|Wave 2 plan reconciliation spec]].
  - Covers stale serviceViews plan, completed table/cards/grid work, DnD deferrals, badge/scroll plan completion, and supersession notes.

Exit: each spec names current files, target seams, risks, and test gates.

## Wave 3 - Notebook Navigator React To Svelte Research, Initial Pass Complete

Goal: deepen the external comparison. This wave was started before the Wave 2 vertical specs were written, so its integration conclusions must be revalidated against shards 06 through 12 before Wave 4 implementation specs.

- Research how Notebook Navigator's storage, provider registry, memory cache, row subscriptions, scroll index versioning, and virtual panes work in React.
- Translate patterns into Svelte-native options: runes, derived snapshots, stores, service singletons, component-local virtualizers, and row-level subscriptions.
- Decide whether Vaultman needs persistent storage, memory-only mirrors, or versioned in-memory snapshots first.

Exit: [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/05-notebook-navigator-react-to-svelte-research|Notebook Navigator React to Svelte research]].

## Wave 4 - Implementation Specs, Draft Complete

Goal: turn confirmed architecture into implementation specs without guessing.

- Files-tree snapshot first slice:
  [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/14-wave-4-files-tree-snapshot-first-slice|Wave 4 files tree snapshot first slice]].
- Batched `ViewService` overlay layer slice:
  [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/15-wave-4-viewservice-overlay-batching|Wave 4 ViewService overlay batching]].
- `panelExplorer` compatibility and reveal slice:
  [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/16-wave-4-panel-reveal-compatibility|Wave 4 panel and reveal compatibility]].
- Props/Tags, overlay extraction, adapter cleanup, selection cleanup, and perf follow-ups:
  [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/17-wave-4-follow-up-slices|Wave 4 follow-up slices]].

Exit: [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/13-wave-4-implementation-spec-set|Wave 4 implementation spec set]].

## Wave 5 - Plan Comparison And Issues, Draft Complete

Goal: compare all new specs against existing plans and PRDs.

- Include the parent Explorer Data Plane PRD.
- Include Explorer View Service spec and serviceViews implementation plan.
- Include Node Selection Service, TanStack table, Pretext cards, scroll, badges, DnD, and performance records.
- Mark what is done, stale, superseded, in progress, or still planned:
  [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/18-wave-5-plan-comparison-reconciliation|Wave 5 plan comparison and reconciliation]].
- Draft final issues and/or PRDs:
  [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/19-wave-5-issue-prd-candidates|Wave 5 issue and PRD candidates]].

Exit: draft issue list in dependency order; publication requires user approval and tracker target.
