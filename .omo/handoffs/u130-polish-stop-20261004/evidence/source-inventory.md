# Source inventory at stop (2026-10-04)

Target: `/data/data/com.termux/files/home/wt/u130-c1-grouping` on `fix/u130-polish-update-1002`.
Base for all three trees: `f0ac41f6` (includes `a317da06`; both descend from canonical `1bfcbfbe`).

## Canonical `~/wt/u130` (read-only, untouched)
- HEAD: `1bfcbfbe chore: update SASI lifecycle catalogue metadata`
- Status at stop: `M manifest.json` only (pre-existing, not staged, not touched).

## Source: `~/wt/u130-panel-content` (left intact as safety backup)
- HEAD: `f0ac41f6 fix(u130): wire menu reset buttons to delete-key override removal`
- Tracked diff vs `f0ac41f6` (5 files, +114/-39):
  - `src/components/containers/explorerPlugins.ts`
  - `src/components/layout/navbarFilters.svelte` (Lane1 gate only)
  - `src/services/servicePluginUpdates.ts`
  - `src/types/typePanelWidget.ts`
  - `test/unit/servicePluginUpdates.test.ts`
- Untracked (5 files, preserved by copy):
  - `src/services/pendingUpdateSupport.ts` sha256 `3e54fdc8ba4619d9e4480c80fe27b712c47b8861bdba08fcde9336ac283398e2` (144 lines)
  - `src/services/servicePendingUpdatesStore.ts` sha256 `0eb26646ce45eba463880f472d329a2f40c1c3f91b33d8145b58203a9c8786d0` (193 lines)
  - `test/unit/pluginUpdatesToolbar.test.ts` sha256 `c4f7f91e8be9a6505f6f39831621e2116653316dfa007ae4107642f719bf1efa` (139 lines)
  - `test/unit/servicePendingUpdatesStore.test.ts` sha256 `699b282228a2e410d2890a0857f4696156bdfdd70dd3d5e937585e59cc3c18c4` (165 lines)
  - `test/unit/servicePluginUpdatesCache.test.ts` sha256 `5024aed39c59bfd221ae1d7289aea1109f26d25a226436d7db1a951f87498656` (233 lines)
- Branch left untouched; working copy left intact after copying.

## Source: `~/wt/u130-row-polish` (left intact as safety backup)
- HEAD: `f0ac41f6 fix(u130): wire menu reset buttons to delete-key override removal`
- Tracked diff vs `f0ac41f6` (7 files, +116/-29):
  - `src/components/containers/explorerFiles.ts`
  - `src/components/layout/navbarFilters.svelte` (Lane2 title-strip only, 2 deletions)
  - `src/components/layout/viewTree.ts` (1 deletion)
  - `src/logic/logicSelectionTargets.ts`
  - `test/helpers/dom-obsidian-polyfill.ts`
  - `test/unit/shiftRangeSelection.test.ts`
  - `test/unit/singleRowTooltip.test.ts`
- Untracked (2 files, preserved by copy):
  - `test/unit/filesCheckboxParity.test.ts` sha256 `f2028ee6ba80d990fecc29cdefdb32c2e849d07f00affd7e37aaa742ddbf4226` (210 lines)
  - `test/unit/hoverTooltipOwnership.test.ts` sha256 `111e49ad62863bc87bd43a7e006bc57208e2f12798973b4c716f0e0aab94b69b` (249 lines, improved source-tree version)
- Branch left untouched; working copy left intact after copying.

## Target pre-existing partial (backed up BEFORE replacement)
- `test/unit/hoverTooltipOwnership.test.ts` original bytes: sha256 `60402e21d5d74086a3017659c186141d046b7f30569b1df02df6ed88c42ed67f` (208 lines).
- Backup: `.omo/handoffs/u130-polish-stop-20261004/evidence/hoverTooltipOwnership.test.ts.orig-target-60402e` (same sha, verified).
- Replaced with source-tree version `111e49ad...` (249 lines) in commit `8b805a46`.

## Shared-overlap reconciliation
- `src/components/layout/navbarFilters.svelte`: merged file keeps BOTH Lane1 (`pendingUpdateCount` gate/subscription/model logic, import, both `isPluginUpdateToolbarActionVisible` call sites) AND Lane2 (removal of both redundant native `title={toolbarNodeTitle(...)}` attributes). Verified by `git diff` showing all four Lane1 hunks plus both Lane2 deletions.

## Target preservation commits (all local-only, no push)
- `14eaeaf9` service lifecycle (C3)
- `ec8bf079` panel feed + port (C2/C3)
- `a802499e` toolbar gate + title-strip reconciliation (B1+C2)
- `46d31961` checkbox grammar + policy (E1/E2)
- `8b805a46` tooltip strip + suites (B1/B3)
- `139b2b16` polyfill + range suite (E1/E2)
- `fe5d65e0` update toolbar/store/cache suites (C2/C3)
- Pre-existing `a317da06` / `f0ac41f6` unchanged.
