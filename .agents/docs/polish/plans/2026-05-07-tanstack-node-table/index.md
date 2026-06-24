---
title: TanStack node table implementation plan
type: implementation-plan-index
status: active
parent: "[[docs/work/polish/specs/2026-05-07-tanstack-node-table/index|tanstack-node-table]]"
created: 2026-05-07T08:26:53
updated: 2026-05-07T08:26:53
tags:
  - agent/plan
  - initiative/polish
  - explorer/views
  - table
  - tanstack
created_by: codex
updated_by: codex
---

# TanStack Node Table Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking. Use test-driven-development for each
> behavior change and run Svelte autofixer before finalizing any Svelte
> component.

**Goal:** Build the real `viewTable` as a dense, read-only, node-backed table
using TanStack Table Core while preserving Vaultman's shared selection service.

**Architecture:** Add `@tanstack/table-core@8.21.3`, then create a pure adapter
that maps Vaultman `ViewRow` and `ViewColumn` data to TanStack table options.
Render the table in a new Svelte 5 `ViewNodeTable.svelte` component and route
`panelExplorer.svelte` table mode to it. `NodeSelectionService` remains the
selection authority; TanStack selection APIs are controlled table helpers.

**Tech Stack:** TypeScript, Svelte 5 runes, `@tanstack/table-core@8.21.3`,
`@tanstack/svelte-virtual@3.13.24`, Vitest unit and component tests, existing
Obsidian mocks, SCSS partials, existing `NodeSelectionService`.

---

## Source Records

- [[docs/work/polish/specs/2026-05-07-tanstack-node-table/index|TanStack node table spec]]
- [[docs/work/hardening/specs/2026-05-04-explorer-view-service/index|Explorer view service spec]]
- [[docs/work/hardening/plans/2026-05-06-node-selection-service/index|Node selection service plan]]
- [[docs/current/engineering-context|Engineering context]]
- TanStack installation docs: https://tanstack.com/table/latest/docs/installation
- TanStack row selection guide: https://tanstack.com/table/latest/docs/guide/row-selection

## File Map

- Create `src/services/serviceViewTableAdapter.ts`: pure adapter functions for
  table rows, column defs, sorting state, and controlled row selection.
- Create `test/unit/services/serviceViewTableAdapter.test.ts`: adapter unit
  coverage.
- Create `src/components/views/ViewNodeTable.svelte`: node table view adapter.
- Create `test/component/viewTableSelection.test.ts`: table component coverage.
- Modify `src/components/containers/panelExplorer.svelte`: route table mode,
  build table rows and columns, and wire callbacks into `NodeSelectionService`.
- Modify `test/component/panelExplorerSelection.test.ts`: table-mode selection
  and context-menu integration tests.
- Modify `test/component/panelExplorerEmpty.test.ts`: remove `table` from
  unsupported fallback expectations and add table empty-state coverage.
- Create `src/styles/data/_table.scss`: table matrix styles.
- Modify `src/main.scss`: import the table SCSS partial.
- Modify `package.json` and `pnpm-lock.yaml`: add `@tanstack/table-core`.
- Modify `.agents/docs/work/polish/index.md` and `.agents/docs/current/status.md`
  only if execution status needs to be recorded.

## Phase Order

1. [[docs/work/polish/plans/2026-05-07-tanstack-node-table/01-dependency-adapter|Dependency and adapter]]
2. [[docs/work/polish/plans/2026-05-07-tanstack-node-table/01-dependency-adapter-part-2|Dependency and adapter part 2]]
3. [[docs/work/polish/plans/2026-05-07-tanstack-node-table/02-component|ViewNodeTable component]]
4. [[docs/work/polish/plans/2026-05-07-tanstack-node-table/02-component-part-2|ViewNodeTable component part 2]]
5. [[docs/work/polish/plans/2026-05-07-tanstack-node-table/03-panel-integration|Panel integration]]
6. [[docs/work/polish/plans/2026-05-07-tanstack-node-table/04-styles-accessibility|Styles and accessibility]]
7. [[docs/work/polish/plans/2026-05-07-tanstack-node-table/05-verification|Verification and docs]]

## Execution Rules

- Do not base table behavior on `src/components/views/viewGrid.svelte`.
- Do not introduce the alpha Svelte 5 TanStack adapter.
- Do not let TanStack own the canonical selection state.
- Do not add inline edit, copy/paste, rectangular range selection, formulas,
  summaries, or persistent column layout in this cut.
- Avoid parallel Vite/Svelte verification commands; current status records a
  known transient Svelte resolver issue.
- Do not commit unless the active user request explicitly allows commits.

## Stop Conditions

- Stop if `@tanstack/table-core@8.21.3` cannot be installed with pnpm.
- Stop if table-core APIs differ from the plan enough that adapter tests cannot
  compile; inspect the installed package types before continuing.
- Stop if `NodeSelectionService` cannot express a required table selection
  transition. Record the missing command instead of adding a second selection
  store.
- Stop if table mode needs provider-specific columns to be useful. Ship the
  generic label/detail/count table first, then plan provider columns separately.
