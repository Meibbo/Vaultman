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
'dow')`). It was cleared with `obsidian vault=plugin-dev dev:errors clear`;
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
obsidian vault=plugin-dev plugin:reload id=vaultman
obsidian vault=plugin-dev command id=vaultman:open
obsidian vault=plugin-dev eval code="document.querySelectorAll('.vm-tree-virtual-row').length"
obsidian vault=plugin-dev dev:errors
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

## C5 pre-extraction panel baseline

The shard named `test/component/containers/`, but this repo's existing
panelExplorer component tests live directly under `test/component/`. The
equivalent pre-extraction baseline was captured with PowerShell-expanded
`test/component/panelExplorer*.test.ts` paths and `--project component`.

Result: PASS, 5 files / 66 tests. No panelExplorer snapshot files were present
under `test/component/__snapshots__/`.

## C5 live plugin-dev smoke

Important CLI correction discovered during C5: `vault=<name>` must be the
first parameter after `obsidian`, before the subcommand. The safe smoke command
shape is:

```powershell
obsidian vault=plugin-dev eval code="app.vault.getName()"
obsidian vault=plugin-dev plugin:reload id=vaultman
obsidian vault=plugin-dev command id=vaultman:open
obsidian vault=plugin-dev dev:errors
```

Verification:

- `obsidian vault=plugin-dev eval code="app.vault.getName()"` returned
  `plugin-dev`.
- `plugin:reload id=vaultman` returned `Reloaded: vaultman`.
- `vaultman:open` behaves as a toggle when the frame is already open; the
  second execution opened one `vm-frame`.
- Live DOM after open: `vmFrame: 1`, `legacy: 0`, `panels: 3`,
  `viewHost: 1`, `markmap: 0`, `empty: 2`.
- View menu traversal rendered each platform mode under
  `.vm-view-host-container`:

| Mode | Active menu label | ViewHost count | Primary rendered selector |
|---|---:|---:|---:|
| Tree | Tree | 1 | `.vm-tree-virtual-row`: 25 |
| List | List | 1 | `.vm-view-list-row`: 18 |
| Table | Table | 1 | `.vm-node-table-row`: 30 |
| Grid | Grid | 1 | `.vm-node-grid-tile`: 33 |
| Cards | Cards | 1 | `.vm-node-card`: 16 |

`Markmap` is not exposed by the current view-mode popup, so live C5 smoke did
not force it through private Svelte state. The new component test covers the
markmap branch and confirms it stays outside `.vm-view-host-container`.

Final live error check: `obsidian vault=plugin-dev dev:errors` returned
`No errors captured.`

## C7 overlay view menu verification

C7 corrected active 0-A Obsidian CLI examples to keep `vault=plugin-dev` as
the first parameter after `obsidian`. Do not use the historical
`obsidian <command> ... vault=plugin-dev` form; it can target the most recently
focused vault before the vault selector is applied.

Focused tests:

```powershell
pnpm vitest run test/component/overlayViewMenu.test.ts test/component/explorer/ViewHost.test.ts --project component --config vitest.config.ts --fileParallelism=false
```

Result: PASS, 2 files / 17 tests.

Aggregate verification:

```powershell
pnpm check
pnpm lint
pnpm run build
pnpm verify
```

Result: PASS. `pnpm verify` reported 142 unit files / 914 unit tests and 88
component files / 473 component tests.

Live plugin-dev smoke used only vault-first commands:

```powershell
obsidian vault=plugin-dev eval code="app.vault.getName()"
obsidian vault=plugin-dev plugin:reload id=vaultman
obsidian vault=plugin-dev dev:errors clear
obsidian vault=plugin-dev command id=vaultman:open-view-menu
obsidian vault=plugin-dev dev:errors
```

Result:

- Vault identity: `plugin-dev`.
- Existing frame count before smoke: `vmFrame: 1`; `vaultman:open` was not run
  because that command behaves as a toggle when a frame is already open.
- Vaultman preset menu: `Tree`, `List`, `Table`, `Grid`, `Cards`;
  `.vm-node-elements-toggle` visible with 11 checkboxes.
- Native preset menu after `themeService.setPreset('native')`: `Tree` only;
  `.vm-node-elements-toggle` hidden and field pills hidden.
- Preset restored to `vaultman`.
- Final `obsidian vault=plugin-dev dev:errors`: `No errors captured.`

## C8 native-class emission verification

Focused C8 tests:

```powershell
pnpm vitest run test/unit/services/serviceNodeClassEmission.test.ts test/component/views/ViewNodeTable.NativeClassEmission.test.ts test/component/views/ViewNodeCards.NativeClassEmission.test.ts test/component/views/ViewNodeGrid.NativeClassEmission.test.ts test/component/views/ViewNodeList.NativeClassEmission.test.ts test/component/views/viewTree.NativeClassEmission.test.ts test/component/viewNodeMirrorClasses.test.ts test/component/viewNodeTableHeightmap.test.ts test/component/snippetMimicry.test.ts --config vitest.config.ts --fileParallelism=false
```

Result: PASS, 9 files / 24 tests.

Aggregate verification:

```powershell
pnpm check
pnpm lint
pnpm run build
pnpm verify
```

Result: PASS. `pnpm verify` reported 143 unit files / 918 unit tests and 93
component files / 484 component tests.

Live plugin-dev smoke used a temporary in-memory custom preset
`c8-native-all` (`useNativeDom=true`, `viewModes=['tree','list','table','grid','cards']`)
so native vocabulary could be inspected for table/cards despite the built-in
Native preset intentionally exposing only Tree through the C7 view-mode filter.
The preset was restored to `vaultman` and unregistered before the final error
check.

Smoke result:

- Tree: `.tree-item` and `.tree-item-self` present.
- Table: `.bases-tr`, `.bases-td`, and `.bases-table-cell` present;
  `.vm-node-table-row.nav-file` absent.
- Cards: `.bases-cards-item`, `.bases-cards-property`, and
  `.bases-cards-property.mod-title` present; `.vm-node-card.nav-file` absent.
- Grid: `.vm-node-grid-tile` present; `.nav-file`, `.nav-file-title`, and
  `bases-*` classes absent.
- Final `obsidian vault=plugin-dev dev:errors`: `No errors captured.`
