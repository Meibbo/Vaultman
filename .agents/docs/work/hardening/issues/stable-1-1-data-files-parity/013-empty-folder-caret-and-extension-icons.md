---
title: SDF-013 Empty folder caret and extension-aware file icons
type: issue
issue_id: SDF-013
status: done
issue_kind: AFK
parent: "[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]]"
created: 2026-06-06T09:52:29
updated: 2026-06-06T10:25:49
labels:
  - completed
tags:
  - agent/issue
  - initiative/hardening
  - release/1.1.0
  - explorer/files
  - explorer/visual-semantics
created_by: codex-gpt-5
updated_by: codex-gpt-5
---

# SDF-013 Empty Folder Caret And Extension-Aware File Icons

## Parent

[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]]

## What To Build

Keep folder/file identity visible in Files explorer rows even when the icon cell is hidden. Empty
folders must still reserve and show the caret affordance slot, and file nodes should use icons derived
from their file extension/type instead of a single generic file icon.

## Acceptance Criteria

- [ ] Empty folders render a visible caret/chevron affordance slot even when they have no child nodes.
- [ ] Empty-folder caret treatment makes the node identifiable as a folder when the `icon` cell is disabled.
- [ ] Empty-folder caret does not imply there are hidden children and does not trigger a broken expand state.
- [ ] File nodes map common extensions to appropriate icons, including at least Markdown, Bases `.base`,
      Canvas `.canvas`, images, PDFs, and unknown/other file types.
- [ ] Markdown files keep the normal note/file affordance and still do not show an `.md` extension cell.
- [ ] Iconized/custom icon behavior remains compatible where Vaultman already supports it; custom icons
      should win over extension fallback icons.
- [ ] Unit or focused view tests cover empty-folder caret rendering and extension icon fallback mapping.
- [ ] `plugin-dev` DOM smoke confirms an empty folder remains visually identifiable with icon cell hidden
      and mixed file extensions show distinct icons.

## Blocked By

None - can start immediately.

## Notes

This issue follows SDF-001 but is not only extension-cell polish. The goal is row-level semantic
identity when a user hides icon/text/count/type cells through the view menu.

## Closeout - 2026-06-06

- Implemented in product worktree `hotfix/1.0.2-css-scorecard`.
- `TreeNode` now supports `showCaret`; `FilesLogic.buildFileTree()` sets it on folder nodes so empty
  folders reserve a visible caret slot even when they have no child nodes.
- `UnifiedTreeView` renders `showCaret` rows with a disabled `vaultman-tree-toggle--empty` caret, so
  empty folders remain identifiable without producing a broken expand action.
- `FilesLogic` now assigns fallback file icons by extension:
  Markdown/default text files use `lucide-file-text`; `.base` uses `lucide-database`; `.canvas` uses
  `lucide-layout-dashboard`; image extensions use `lucide-image`; code-like extensions use
  `lucide-file-code`; unknown extensions use `lucide-file-question`.
- Existing folder open/closed icon decoration still overrides folder icons at render time.

## Verification - 2026-06-06

- RED: `pnpm exec vitest run --config vitest.unit.config.mts test/unit/filesLogic.test.ts` failed
  because empty folders lacked `icon/showCaret` and file nodes lacked extension-aware icons.
- GREEN focused gate: same command passed, `1` file / `7` tests.
- `pnpm run verify`: pass; lint, check, format, stylelint, build plugin, unit tests, and scorecard
  regression scan all passed (`16` unit files / `51` tests; scorecard `17` checks).
- Final sync: `node scripts/sync-test-build.mjs`.
- `obsidian vault=plugin-dev plugin:reload id=vaultman`: pass.
- Fresh `obsidian vault=plugin-dev dev:errors`: `No errors captured`.
- DOM smoke created temporary `000-vm-*` test nodes and removed them afterward:
  empty folder row rendered `lucide-chevron-right` with `vaultman-tree-toggle--empty`; after enabling
  the icon cell, `.base`, `.png`, and unknown extension files rendered `lucide-database`,
  `lucide-image`, and `lucide-file-question` respectively.
