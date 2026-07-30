---
title: SDF-007 Nested and flat hierarchy mode across explorers
type: issue
issue_id: SDF-007
status: completed
issue_kind: AFK
parent: "[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]]"
created: 2026-06-06T07:53:25
updated: 2026-06-06T15:02:00-05:00
labels:
  - completed
tags:
  - agent/issue
  - initiative/hardening
  - release/1.1.0
  - explorer/views
created_by: codex-gpt-5
updated_by: codex-gpt-5
---

# SDF-007 Nested And Flat Hierarchy Mode Across Explorers

## Parent

[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]]

## What To Build

Make the `Nested` view-menu option work across Files, Props, and Tags. Nested is on by default; when disabled, hierarchy is represented as flat path-style labels.

## Acceptance Criteria

- [x] Files, Props, and Tags expose a `Nested` view option.
- [x] `Nested` is enabled by default for all three explorers.
- [x] When `Nested` is enabled, nodes render as tree hierarchy with level indentation.
- [x] When `Nested` is disabled, nodes render flat with labels like `level1/level2/levelN`.
- [x] Selection, context menu, badges/decorations, filters, and queue interactions still work in both modes.
- [x] Switching modes does not break virtualization or duplicate visible rows.

## Blocked By

None - can start immediately.

## Verification

- Run focused tree projection tests for nested and flat output.
- Build, sync, reload `plugin-dev`, and smoke all three explorers in both modes.

## Resolution - 2026-06-06

Implemented in product worktree `hotfix/1.0.2-css-scorecard`.

- Added `src/logic/logicExplorerHierarchy.ts` with pure `cloneTree`, `groupRootHierarchy`, and `flattenTreeToPathLabels` helpers.
- Files, Props, and Tags now default `visibleCells` to include `nested`, and both minimal native View menus and the non-minimal view popup expose the `Nested` option.
- Files tree projects flat labels such as `_dev-tools/dev-diagnostics` and `+/2025-10-03-0702...` when `Nested` is off; folders no longer toggle hidden expansion state in flat mode.
- Props tree projects flat labels such as `AI-Agent/[[Claude]]` and `BankPayment/Yape` when `Nested` is off, preserving original ids like `AI-Agent::[[Claude]]` for filters, context menu, and decorations.
- Tags uses the same projection path; `Nested` remains on by default and flat mode removes indentation/carets without changing tag ids.

Verification evidence:

- Focused tests: `pnpm exec vitest run test/unit/explorerHierarchy.test.ts test/unit/navbarFiltersSource.test.ts test/unit/filesLogic.test.ts test/unit/propsLogic.test.ts --config vitest.unit.config.mts` passed (`4` files / `16` tests).
- `pnpm run verify` passed (`25` unit files / `82` tests; scorecard `17` checks).
- `pnpm run build` synced artifacts to `C:/Users/vic_A/Desktop/plugin-dev/.obsidian/plugins/vaultman`.
- `obsidian vault=plugin-dev plugin:reload id=vaultman`, `obsidian vault=plugin-dev command id=vaultman:open`, and `obsidian vault=plugin-dev dev:errors` passed; final `dev:errors` returned `No errors captured`.
- Runtime DOM smoke confirmed Files `Nested` is present and checked by default;
  disabling it produced path-style rows with `depth=0`, no carets, and no duplicate row stream. Props flat smoke confirmed `prop/value` labels, `depth=0`, no carets, and preserved ids.
