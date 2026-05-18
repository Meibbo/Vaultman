---
title: Explorer Sub-System 0-A baseline log
type: verification-log
status: active
parent: "[[2026-05-18-explorer-sub-system-0-a-native-dom-parity/index]]"
created: 2026-05-18T00:00:00
updated: 2026-05-18T00:00:00
tags:
  - agent/verification
  - initiative/hardening
  - explorer/native-dom-parity
---

# Explorer Sub-System 0-A Baseline Log

## Preflight repair

Before the baseline shard could pass, `pnpm verify` failed in
`test/unit/lint/noMutableVfsRule.test.ts` because commit `83806ad` moved
`eslint-rules/no-mutable-vfs.mjs` to `scripts/no-mutable-vfs.mjs`, while the
unit test still imported the old path. The tracked ESLint config already used
`scripts/no-mutable-vfs.mjs`.

- Red: `pnpm verify` failed before any 0-A source edits with
  `Cannot find module '../../../eslint-rules/no-mutable-vfs.mjs'`.
- Green: focused test passed after the import was aligned:
  `pnpm vitest run --project unit test/unit/lint/noMutableVfsRule.test.ts --config vitest.config.ts`
  -> 1 file / 1 test passed.
- Full gate after the repair: `pnpm verify` passed.
- Commit: `c491f41` `test: align mutable VFS rule import`.

## Step 1 - Working tree

Command:

```powershell
git status --short --branch
```

Result after the preflight repair commit:

```text
## sandbox...origin/sandbox [ahead 168]
```

No dirty files were present at the start of the baseline capture.

## Step 2 - pnpm verify baseline

Command:

```powershell
pnpm verify
```

Result: PASS.

- `vp lint`: 0 warnings, 0 errors.
- `svelte-check`: 0 errors, 0 warnings.
- Build: Vite production build passed and synced build artifacts to repo,
  `dist/build`, `plugin-dev`, and `test/vaults/stress-vault`.
- Unit tests: 140 files / 882 tests passed.
- Component tests: 81 files / 454 tests passed.

## Step 3 - panelExplorer size and mode switch

Commands:

```powershell
(Get-Content src/components/containers/panelExplorer.svelte | Measure-Object -Line).Lines
Select-String -Path src/components/containers/panelExplorer.svelte -Pattern "viewMode ===" -SimpleMatch
```

Result:

- `src/components/containers/panelExplorer.svelte`: 1345 LOC.
- Inline mode switch range:
  - line 1205: `{#if viewMode === 'tree'}`
  - line 1238: `{:else if viewMode === 'grid'}`
  - line 1287: `{:else if viewMode === 'cards'}`
  - line 1312: `{:else if viewMode === 'markmap'}`
  - line 1330: `{:else if viewMode === 'list'}`
  - line 1349: `{:else if viewMode === 'table'}`
- Other `viewMode ===` reactive/control-flow reads remain above the switch
  and must be preserved during C5 extraction.

## Step 4 - Native-class emission baseline

Command:

```powershell
Select-String -Path src/components/views/*.svelte -Pattern "class:nav-file|class:tree-item|class:nav-file-title" -SimpleMatch
```

`rg` equivalent used for a clean regex inventory:

```text
src/components/views/viewTree.svelte:882: class:tree-item={useNativeDom}
src/components/views/viewTree.svelte:903: class:tree-item-self={useNativeDom}
src/components/views/viewTree.svelte:955: class:tree-item-inner={useNativeDom}
src/components/views/ViewNodeGrid.svelte:1001: class:nav-file={useNativeDom}
src/components/views/ViewNodeGrid.svelte:1046: class:nav-file-title={useNativeDom}
src/components/views/ViewNodeCards.svelte:469: class:nav-file={useNativeDom}
src/components/views/ViewNodeCards.svelte:496: class:nav-file-title={useNativeDom && field.kind === 'title'}
src/components/views/ViewNodeTable.svelte:730: class:nav-file={useNativeDom}
src/components/views/ViewNodeTable.svelte:759: class:nav-file-title={useNativeDom}
```

## Step 5 - btnMultiSelection pre-rename baseline

Command:

```powershell
Select-String -Path src,test,.agents/docs -Pattern "btnMultiSelection" -SimpleMatch -Recurse
```

Result:

- `src/`: 0 hits.
- `test/`: 0 hits.
- `.agents/docs/`: 63 hits.

Doc hit inventory, grouped by file:

```text
.agents/docs/work/hardening/specs/2026-05-18-explorer-sub-system-0-a-native-dom-parity/index.md: 27
.agents/docs/work/hardening/specs/2026-05-18-explorer-sub-system-0-a-native-dom-parity/11-risks-and-followups.md: 107, 115
.agents/docs/work/hardening/specs/2026-05-18-explorer-sub-system-0-a-native-dom-parity/10-verification-matrix.md: 23
.agents/docs/work/hardening/specs/2026-05-18-explorer-sub-system-0-a-native-dom-parity/09-migration-sequence.md: 25
.agents/docs/work/hardening/specs/2026-05-18-explorer-sub-system-0-a-native-dom-parity/06-overlay-view-menu-wiring.md: 189, 191, 201, 207
.agents/docs/work/hardening/specs/2026-05-18-explorer-sub-system-0-a-native-dom-parity/01-architecture.md: 134, 137
.agents/docs/work/hardening/specs/2026-05-15-explorer-view-platform-pass/index.md: 33
.agents/docs/work/hardening/specs/2026-05-15-explorer-view-platform-pass/04-feedback-loops-acceptance.md: 28
.agents/docs/work/hardening/specs/2026-05-15-explorer-view-platform-pass/02-architecture-contracts.md: 68
.agents/docs/work/hardening/specs/2026-05-15-explorer-0-b-servicetheme-token-layer/index.md: 34, 201
.agents/docs/work/hardening/specs/2026-05-15-explorer-0-b-servicetheme-token-layer/09-risks-and-open-items.md: 191
.agents/docs/work/hardening/specs/2026-05-15-explorer-0-b-servicetheme-token-layer/07-consumer-wiring-scope.md: 106, 144
.agents/docs/work/hardening/specs/2026-05-15-explorer-0-b-servicetheme-token-layer/06-settings-shape.md: 323
.agents/docs/work/hardening/specs/2026-05-15-explorer-0-b-servicetheme-token-layer/04-built-in-presets.md: 33, 102, 195, 219, 222
.agents/docs/work/hardening/specs/2026-05-15-explorer-0-b-servicetheme-token-layer/03-api-contract.md: 180
.agents/docs/work/hardening/specs/2026-05-15-explorer-0-b-servicetheme-token-layer/01-context-and-motivation.md: 73, 75, 109
.agents/docs/work/hardening/research/2026-05-15-explorer-view-platform-infinite-canvas/index.md: 44, 65
.agents/docs/work/hardening/research/2026-05-15-explorer-view-platform-infinite-canvas/03-rendering-media-contracts.md: 26, 37, 197, 265
.agents/docs/work/hardening/research/2026-05-15-explorer-view-platform-infinite-canvas/02-architecture-execution-handoff.md: 47, 165, 189, 192
.agents/docs/work/hardening/plans/2026-05-18-explorer-sub-system-0-a-native-dom-parity/index.md: 19
.agents/docs/work/hardening/plans/2026-05-18-explorer-sub-system-0-a-native-dom-parity/13-verification-gates.md: 58, 61, 67, 71, 141, 152
.agents/docs/work/hardening/plans/2026-05-18-explorer-sub-system-0-a-native-dom-parity/07-c7-overlay-view-menu.md: 7, 12, 17, 22, 27, 305, 314, 319, 364, 372
.agents/docs/work/hardening/plans/2026-05-18-explorer-sub-system-0-a-native-dom-parity/00-pre-step-baseline.md: 67, 72, 126
.agents/docs/work/hardening/plans/2026-05-15-explorer-view-platform-pass/02-projection-feature-menu-contracts.md: 104, 119
.agents/docs/work/hardening/plans/2026-05-15-explorer-0-b-servicetheme-token-layer/phase-1-types-and-builtins.md: 569, 635
```

## Step 6 - EXPLORER_PLATFORM_VIEW_MODES consumers

Command:

```powershell
Select-String -Path src,test -Pattern "EXPLORER_PLATFORM_VIEW_MODES" -SimpleMatch -Recurse
```

Consumer inventory:

```text
src/services/serviceExplorerViewContract.ts:3
src/services/serviceExplorerViewContract.ts:5
src/services/serviceExplorerViewContract.ts:81
src/components/layout/overlays/overlayViewMenu.svelte:10
src/components/layout/overlays/overlayViewMenu.svelte:43
test/unit/services/serviceExplorerViewContract.test.ts:3
test/unit/services/serviceExplorerViewContract.test.ts:14
test/unit/services/serviceExplorerViewContract.test.ts:37
```

## Step 7 - Scroll smoke baseline

Initial combined command timed out while running the sequence. Isolated rerun
showed the current runner does not switch the already-open Explorer frame to
the requested view by itself. Direct `pnpm smoke:scroll -- --view=list` failed
with `reason="scroll target not found"` while Tree was active. For the baseline,
each target view was selected in the live UI first, then the runner was invoked
with `--no-build --no-reload --no-open` so it measured the selected view.

Before rerun, stale `plugin-dev` error buffer contained one unrelated
Calendar/Settings Search error (`Cannot read properties of undefined (reading
'dow')`). It was cleared with `obsidian dev:errors clear vault=plugin-dev`;
subsequent smoke runs ended with `No errors captured.`

Results:

| View | Command shape | Result | blankFrames | maxBlank | maxDelay | dev errors |
|---|---|---:|---:|---:|---:|---|
| Tree | `pnpm smoke:scroll -- --view=tree --jumps=100` | PASS | 0 | 0 ms | 216 ms | clean |
| List | selected List, then `--no-build --no-reload --no-open` | PASS | 0 | 0 ms | 46 ms | clean |
| Table | selected Table, then `--no-build --no-reload --no-open` | PASS | 0 | 0 ms | 235 ms | clean |
| Grid | selected Grid, then `--no-build --no-reload --no-open` | PASS | 0 | 0 ms | 28 ms | clean |
| Cards | selected Cards, then `--no-build --no-reload --no-open` | PASS | 0 | 0 ms | 5 ms | clean |

## Step 8 - Live plugin-dev preset/open baseline

Commands:

```powershell
obsidian plugin:reload id=vaultman vault=plugin-dev
obsidian command id=vaultman:open vault=plugin-dev
obsidian eval code="document.querySelectorAll('.vm-tree-virtual-row').length" vault=plugin-dev
obsidian dev:errors vault=plugin-dev
```

Result:

```text
Reloaded: vaultman
Executed: vaultman:open
=> 3
No errors captured.
```

## Baseline summary

- Source files modified in shard 00: none.
- Baseline artifact created: this file.
- Known baseline caveat: scroll runner can measure the active requested view,
  but it does not switch views on its own when the Explorer frame is already
  mounted; manual view selection was used for List/Table/Grid/Cards.
- Known environment caveat: stale unrelated `plugin-dev` Calendar/Settings
  Search error was cleared before live smoke capture.
