---
title: SDF-011 Bases-parity table view layout
type: issue
issue_id: SDF-011
status: completed
issue_kind: AFK
parent: "[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]]"
created: 2026-06-06T07:53:25
updated: 2026-06-06T15:38:32-05:00
labels:
  - completed
tags:
  - agent/issue
  - initiative/hardening
  - release/1.1.0
  - explorer/table
  - obsidian/bases
created_by: codex-gpt-5
updated_by: codex-gpt-5
---

# SDF-011 Bases-Parity Table View Layout

## Parent

[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]]

## What To Build

Repair Vaultman's table view so it behaves and reads as a real table with separated columns, stable headers, cells, and widths comparable to Obsidian Core Bases under equivalent row limits.

## Research Gate

- [x] Capture a before/evidence comparison for Vaultman table view and Core Bases table view under the same row-count conditions. Screenshot capture was unavailable because `obsidian vault=plugin-dev dev:screenshot ...` returned `TypeError: Cannot read properties of undefined (reading 'includes')`; DOM rect/scroll evidence below substitutes for this CLI failure.
- [x] Use `obsidian-cli` against `plugin-dev` to inspect Core Bases DOM/classes for headers, rows, cells, column separators, resize handles, widths, overflow, sticky header behavior, and virtualization.
- [x] Determine whether `obsidian-web-lab` is needed for Bases table layout, virtualization, or column-resize behavior. DOM inspection was sufficient for this fix, so web-lab was not used.
- [x] Document which Bases classes can be reused directly and which behaviors must be mirrored.

## Acceptance Criteria

- [x] Table view renders visually separated columns with real headers.
- [x] Headers, rows, cells, separators, resize handles, and state classes reuse Core Bases CSS where viable.
- [x] File name, extension/type, folder, count, and date columns align as columns, not as text concatenated into list rows.
- [x] Columns support resizing or at minimum stable responsive widths that do not break scroll.
- [x] Table virtualization and native scroll remain functional on the `plugin-dev` vault.
- [x] DOM evidence demonstrates reasonable structural parity with Core Bases under equivalent conditions;
      screenshot capture remains blocked by the CLI TypeError noted above.

## Blocked By

None - can start immediately.

## Verification

- Core Bases reference file created in `plugin-dev`:
  `_vaultman_table_parity_reference.base`, with a table view limit of `11110` rows and columns `file.name`, `file.ext`, `file.folder`, and `file.mtime`.
- Core Bases DOM finding: `.bases-table-container` contains `.bases-table`, `.bases-thead`, and `.bases-tbody`; headers and row cells are `.bases-td` elements positioned with inline `inset-inline-start` and `width`, not CSS grid tracks. Reference widths observed:
  file name `300px`, file extension `111px`, folder `201px`, modified time `213px`.
- Vaultman before-fix finding: header and row cells all measured at the same x-coordinate, producing list-like overlap even though the renderer assigned `gridTemplateColumns`.
- Product fix: `src/logic/logicTableLayout.ts` now resolves stable Bases-style column offsets and widths; `src/components/layout/viewGrid.ts` applies `insetInlineStart` / `width` to every header and body `.bases-td`; `styles.css` scopes absolute table-cell positioning under `.vaultman-files-table-root`; `.md` rows show basename while non-Markdown rows keep `file.name` such as `_vaultman_table_parity_reference.base`.
- Focused tests:
  `pnpm exec vitest run test/unit/tableLayout.test.ts test/unit/gridViewSource.test.ts test/unit/tableVirtualization.test.ts --config vitest.unit.config.mts` passed (`3` files / `6` tests).
- Full gate: `pnpm run verify` passed: lint, `svelte-check`, format check, stylelint, production build, `27` unit files / `87` tests, and scorecard regression scan `17` checks.
- Runtime `plugin-dev` gate: `pnpm run build` synced artifacts to `C:/Users/vic_A/Desktop/plugin-dev/.obsidian/plugins/vaultman`; `obsidian vault=plugin-dev plugin:reload id=vaultman` and `obsidian vault=plugin-dev command id=vaultman:open` passed;
  `obsidian vault=plugin-dev dev:errors` returned `No errors captured`; after `dev:debug on`, `obsidian vault=plugin-dev dev:console level=error` returned `No console messages captured`.
- Vaultman after-fix DOM: root width `247`, scroll `clientWidth=235`, `scrollWidth=612`, `scrollHeight=333570`; header cells measured at x/width/inset `(48,300,0px)`, `(348,111,300px)`, `(459,201,411px)`; first row cells matched those same positions. Horizontal scroll set `scrollLeft=250` and header transform became `translateX(-250px)`.
- Scroll virtualization smoke: near-bottom scroll rendered rows with tops `332520px` through `332730px` and paths such as `+/Warcraft III The Frozen Throne.md`; `repeatedFirstAtBottom=false`, so the earlier duplicate-from-top table behavior was not observed.
