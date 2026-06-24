---
title: Bases import choose mode implementation plan
type: plan-index
status: completed
parent: "[[docs/work/hardening/specs/2026-05-05-bases-import-choose-mode/index|bases-import-choose-mode]]"
created: 2026-05-05T02:36:37
updated: 2026-05-05T16:11:11
tags:
  - agent/plan
  - initiative/hardening
  - bases/import
---

# Bases Import Choose Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import compatible Obsidian Bases filters into Vaultman active filters through a files-only chooser mode, while renaming internal filter group logic to `and | or | not`.

**Architecture:** First normalize the filter core so both legacy and new group logic values evaluate safely. Then add a pure Bases interop service that parses `.base`/fenced `bases` sources into preview/report data and compatible `FilterGroup` trees. Finally wire a constrained files chooser UI and reusable empty/loading landing without mutating `.base` files.

**Tech Stack:** TypeScript, Svelte 5 runes, Vitest unit/component tests, `js-yaml`, Obsidian vault APIs, existing `ExplorerProvider`, `ViewService`, `PanelExplorer`, and content/file indexes.

---

## File Map

- Modify `src/types/typeFilter.ts`: rename group logic contract, add legacy normalizer.
- Modify `src/utils/filter-evaluator.ts`: evaluate normalized `and | or | not`.
- Modify `src/services/serviceFilter.svelte.ts`: write new logic values and normalize loaded templates.
- Create `src/types/typeBasesInterop.ts`: preview, report, source, and target contracts.
- Create `src/services/serviceBasesInterop.ts`: pure YAML/fenced block parsing and filter import.
- Create `src/index/indexBasesImportTargets.ts`: discover compatible `.base` and fenced `bases` targets.
- Create `src/components/containers/explorerBasesImport.ts`: files-style provider for import targets.
- Modify `src/components/containers/panelExplorer.svelte`: render shared empty/loading state.
- Create `src/components/views/viewEmptyLanding.svelte`: reusable explorer landing.
- Modify `test/helpers/obsidian-mocks.ts`: expose `vault.getFiles()` for `.base` discovery tests.
- Modify `src/components/explorers/explorerActiveFilters.svelte`: four-squircle toolbar and import/export flyout.
- Modify `src/components/pages/pageFilters.svelte`: choose-mode layout and disabled/faint tabs.
- Modify `src/components/frame/frameVaultman.svelte` and `src/components/frame/framePages.ts`: FAB exit behavior during choose mode.
- Tests: `test/unit/utils/filter-evaluator.test.ts`, `test/unit/services/serviceFilter.test.ts`, `test/unit/services/serviceBasesInterop.test.ts`, `test/unit/index/indexBasesImportTargets.test.ts`, `test/component/viewEmptyLanding.test.ts`, `test/component/viewList.test.ts` or a focused new filters-page component test.

## Shards

1. [[docs/work/hardening/plans/2026-05-05-bases-import-choose-mode/01-filter-logic-rename|Filter logic rename]]
2. [[docs/work/hardening/plans/2026-05-05-bases-import-choose-mode/02-bases-interop-service|Bases interop service]]
3. [[docs/work/hardening/plans/2026-05-05-bases-import-choose-mode/03-import-target-discovery|Import target discovery]]
4. [[docs/work/hardening/plans/2026-05-05-bases-import-choose-mode/04-empty-loading-landing|Empty/loading landing]]
5. [[docs/work/hardening/plans/2026-05-05-bases-import-choose-mode/05-ui-integration|UI integration]]
6. [[docs/work/hardening/plans/2026-05-05-bases-import-choose-mode/06-final-verification|Final verification]]

## Guardrails

- Do not commit unless the user explicitly asks.
- Do not write or export `.base` files in this slice.
- Do not make import depend on `serviceFnR`.
- Do not show incompatible source rows in chooser; keep reasons in report.
- Preserve existing saved filters/templates by normalizing legacy `all | any | none`.
- Run Svelte autofixer before finalizing touched `.svelte` files.

## Execution Order

Use TDD per shard. Do not start UI integration until filter logic, Bases service,
and target discovery tests pass.
