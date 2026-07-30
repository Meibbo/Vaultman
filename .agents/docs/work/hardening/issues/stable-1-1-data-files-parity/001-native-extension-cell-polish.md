---
title: SDF-001 Native extension cell polish
type: issue
issue_id: SDF-001
status: done
issue_kind: AFK
parent: "[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]]"
created: 2026-06-06T07:53:25
updated: 2026-06-06T08:49:57
labels:
  - completed
tags:
  - agent/issue
  - initiative/hardening
  - release/1.1.0
  - explorer/files
created_by: codex-gpt-5
updated_by: codex-gpt-5
---

# SDF-001 Native Extension Cell Polish

## Parent

[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]]

## What To Build

Polish the Files extension/type cell so markdown files do not show `.md`, while non-markdown files show their extension using the same visual treatment as Obsidian core File Explorer tags.

## Acceptance Criteria

- [x] Markdown files do not render `md` or `.md` in the extension/type cell.
- [x] Non-markdown files render their extension in the row-level extension/type cell.
- [x] The extension cell uses the native `nav-file-tag` style or equivalent class reuse from core File Explorer.
- [x] Extension styling has lower visual priority than the file/folder label and preserves readable contrast.
- [x] Focused unit tests cover markdown suppression and non-markdown extension display.
- [x] `plugin-dev` DOM smoke confirms `.base` and image extensions are visible while `.md` is hidden.

## Blocked By

None - can start immediately.

## Verification

- Run focused Files logic/view tests.
- Run `pnpm run check`.
- Build, sync, reload `plugin-dev`, and inspect visible Files rows with `obsidian-cli`.

## Closeout - 2026-06-06

- Implemented in product worktree `hotfix/1.0.2-css-scorecard`.
- `FilesLogic.buildFileTree()` now omits `typeText` for `.md` files and keeps non-markdown extensions.
- `UnifiedTreeView` renders type/ext cells with `vaultman-tree-type nav-file-tag`.
- `.vaultman-tree-type` CSS now keeps layout constraints without overriding the native tag contrast.
- Focused RED/GREEN: `pnpm exec vitest run --config vitest.unit.config.mts test/unit/filesLogic.test.ts` failed on `.md` rendering `typeText: "md"` before the fix and passed after.
- `pnpm run verify`: pass; unit suite `14` files / `47` tests; scorecard scan `17` checks.
- Final sync: `node scripts/sync-test-build.mjs`.
- `obsidian vault=plugin-dev plugin:reload id=vaultman`: pass.
- Fresh `obsidian vault=plugin-dev dev:errors`: `No errors captured`.
- DOM smoke in Files viewport confirmed `.base` and `.png` rows render `.vaultman-tree-type.nav-file-tag`; `.md` rows render no type cell.
