---
title: Scout A3 Tests and verification gates
type: scout-report
status: draft
parent: "[[docs/work/hardening/plans/2026-05-11-explorer-data-plane-transition/01-wave-a-b-claude-handoff|wave-a-b-claude-handoff]]"
created: 2026-05-12T07:59:03
updated: 2026-05-12T07:59:03
tags:
  - agent/scout
  - initiative/hardening
  - explorer/tests
  - scout-report
created_by: claude
updated_by: claude
---

# Scout A3 — Tests and verification gates

## Files Read

- `AGENTS.md`
- `.agents/docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/14-wave-4-files-tree-snapshot-first-slice.md`
- `.agents/docs/work/hardening/issues/explorer-data-plane/002-files-snapshot-data-plane-foundation.md`
- `.agents/docs/work/hardening/plans/2026-05-11-explorer-data-plane-transition/01-wave-a-b-claude-handoff.md`
- `.agents/docs/work/hardening/plans/2026-05-11-explorer-data-plane-transition/reports/a2-panel-selection-reveal.md` (header for cross-reference)
- `package.json`
- `vitest.config.ts`
- `test/helpers/obsidian-mocks.ts`
- `test/unit/components/explorerFiles.test.ts`
- `test/unit/logic/logicsFiles.test.ts`
- `test/unit/logic/logicExplorer.test.ts`
- `test/unit/services/serviceFilesIndex.test.ts`
- `test/unit/services/createNodeIndex.test.ts`
- `test/unit/services/serviceSelection.test.ts`
- `test/unit/services/serviceViews.test.ts`
- `test/component/panelExplorerSelection.test.ts`
- `test/component/panelExplorerEmpty.test.ts`
- `test/component/panelExplorerBadgeCollision.test.ts`
- `test/component/viewTreeSelection.test.ts`
- `test/component/viewTreeDecorations.test.ts`
- `test/component/viewTreeAdoptedNodes.test.ts`
- `test/component/reactiveExplorers.test.ts`
- `src/types/typeNode.ts`
- `src/types/typeContracts.ts` (NodeBase, INodeIndex, IFilesIndex)
- `src/providers/explorerFiles.ts` (sections around `getTree()` and `_decorateTree`)
- `src/components/containers/panelExplorer.svelte` (`visibleNodeIds()` usage)

No project-level `vitest.config*.ts` shards beyond `vitest.config.ts:1`. No `test/setup*.ts` file exists; `test/integration/setup.ts:1` exists but is integration-only and out of scope. The shared factory module is `test/helpers/obsidian-mocks.ts`.

Targets `src/types/typeExplorerDataPlane.ts`, `src/logic/logicExplorerSnapshot.ts`, and `src/services/serviceExplorerDataPlane.svelte.ts` do not exist yet (Grep returned only doc hits), confirming this is true greenfield code with red tests required.

## Current Files provider test coverage

`test/unit/components/explorerFiles.test.ts`
- Cases (file:line):
  - File-click selection: `test/unit/components/explorerFiles.test.ts:56`
  - Secondary node action opens file: `test/unit/components/explorerFiles.test.ts:69`
  - Registered context menu delete: `test/unit/components/explorerFiles.test.ts:82`
  - Multi-select delete via context: `test/unit/components/explorerFiles.test.ts:108`
  - `setShowSelectedOnly`: `test/unit/components/explorerFiles.test.ts:135`
  - Non-markdown vault files: `test/unit/components/explorerFiles.test.ts:146`
  - Dot-hidden default: `test/unit/components/explorerFiles.test.ts:159`
  - Dot-hidden when enabled: `test/unit/components/explorerFiles.test.ts:179`
  - Folders-first ordering: `test/unit/components/explorerFiles.test.ts:201`
  - Folders-first disabled: `test/unit/components/explorerFiles.test.ts:231`
  - Ancestor folder synthesis: `test/unit/components/explorerFiles.test.ts:256`
  - Folder context menu: `test/unit/components/explorerFiles.test.ts:280`
  - Extension countLabel: `test/unit/components/explorerFiles.test.ts:305`
  - Root image icon: `test/unit/components/explorerFiles.test.ts:322`
  - File rename handoff: `test/unit/components/explorerFiles.test.ts:337`
  - Hover badge -> queue: `test/unit/components/explorerFiles.test.ts:368`
  - Hover badge multi-select: `test/unit/components/explorerFiles.test.ts:389`
  - Adopted children when enabled: `test/unit/components/explorerFiles.test.ts:414`
  - Adoption disabled keeps empty: `test/unit/components/explorerFiles.test.ts:435`
  - Adopted preload notifies subscribers: `test/unit/components/explorerFiles.test.ts:457`

`test/unit/logic/logicsFiles.test.ts`
- `FilesLogic.flatList`, `FilesLogic.buildFileTree` (folder grouping, count, filterFlat with/without precomputed buffers): `test/unit/logic/logicsFiles.test.ts:18-69`.

`test/unit/services/serviceFilesIndex.test.ts`
- `createFilesIndex` produces all files (not only markdown), `byId`, `flatIds`, search buffers: `test/unit/services/serviceFilesIndex.test.ts:5-37`.

`test/unit/services/createNodeIndex.test.ts`
- Index publish lifecycle: build fn, subscribers, monotonic `revision`, search buffers: `test/unit/services/createNodeIndex.test.ts:9-66`. This is the template the new data-plane service revision semantics must mirror.

`test/component/panelExplorerSelection.test.ts`
- Selection/prune/range/box/keyboard scenarios that consume `visibleNodeIds()` paths today. Provider id `EXPLORER_ID = 'selection-test'`: `test/component/panelExplorerSelection.test.ts:12`. Files-specific selection path uses provider id `'files'` and `FileMeta` at `test/component/panelExplorerSelection.test.ts:289-313`.

## Tests to EXTEND vs CREATE for snapshot contracts

| Target test file | Status | Cases to add |
| --- | --- | --- |
| `test/unit/logic/logicExplorerSnapshot.test.ts` | CREATE | rows/visibleIds/parent links/childrenIds/depth, `byId`, `idToIndex`, `pathToId`, `folderPathToId`, duplicate labels distinct ids, hidden folder absence, adopted child inclusion, expansion-collapsed parents drop hidden descendants from `visibleIds` but keep them in `byId`, source-`TreeNode` reference preservation, lookup stability across two identical inputs, `sourceRevisions` carry through (files/queue/filter) without rebuilding when queue/filter alone change |
| `test/unit/services/serviceExplorerDataPlane.test.ts` | CREATE | `publish(explorerId, snapshot)` increments `revision`, `snapshot(id)` returns last published, `subscribe` fires once per publish and unsubscribe stops fires, `clear(id)` resets snapshot and drops subscribers' subsequent fires, immutable read (mutating returned arrays/maps must not affect future reads), revision is per-explorer (publishing 'tags' does not bump 'files'), `$state.raw` use covered by not freezing input maps but rejecting in-place mutation observability |
| `test/unit/components/explorerFiles.test.ts` | EXTEND | (a) provider exposes `getStructuralSource()` (or named adapter method per spec) returning undecorated tree with the same row IDs/order as `getTree()` minus decoration fields (`icon`/`highlights`/`cls` overrides), (b) action hooks (`handleNodeClick`, `handleContextMenu`, `handleNodeSecondaryAction`, `handleHoverBadge`, registered context actions) still operate against `TreeNode` after data-plane wiring, (c) calling `getStructuralSource()` does NOT call `viewService.getModel` while `getTree()` still does |
| `test/component/panelExplorerSelection.test.ts` | EXTEND | Files-specific test (`provider.id === 'files'`, near `test/component/panelExplorerSelection.test.ts:289-313`) asserts that prune ordering used by `selectionService.prune` equals the Files snapshot's `visibleIds` (e.g. nested folder collapse drops descendants from prune, expansion restores them), and that range selection across two visible siblings uses snapshot `idToIndex` order |
| `test/unit/services/serviceSelection.test.ts` | KEEP AS-IS | No new cases; the snapshot only feeds `orderedIds` arguments — the service contract itself is untouched. The existing `prune` test at `test/unit/services/serviceSelection.test.ts:195-209` already encodes the consumer contract. |
| `test/component/viewTreeSelection.test.ts` / `viewTreeDecorations.test.ts` / `viewTreeAdoptedNodes.test.ts` | KEEP AS-IS | Should remain green via the `TreeNode` compatibility bridge. |

Notes:
- Spec shard 14 names `test/unit/components/explorerFiles.test.ts` and `test/component/panelExplorerSelection.test.ts` explicitly as gate sites — both exist and only need extension.
- The two new files (`logicExplorerSnapshot.test.ts`, `serviceExplorerDataPlane.test.ts`) match the file names already called out in spec shard 14 Test Gates section.

## Existing test factories

Note: there is no shared `TreeNode` factory in `test/helpers/`; each test file defines a local `nodes()` / `provider()` / `makePlugin()`. The plan must NOT add a new shared helper just for snapshot tests (out of scope) — instead, mirror the local-factory pattern.

Signatures to reuse:

- `mockTFile(path: string, options: { frontmatter?: Record<string, unknown> } = {}): TFile` at `test/helpers/obsidian-mocks.ts:384`
- `mockTFolder(path: string): TFolder` at `test/helpers/obsidian-mocks.ts:406`
- `mockApp(opts: MockAppOptions = {}): App` at `test/helpers/obsidian-mocks.ts:413`
- `MockAppOptions` (files/metadata/folders/configDir/adapterFiles) at `test/helpers/obsidian-mocks.ts:376`
- `function nodes(): TreeNode[]` at `test/component/panelExplorerSelection.test.ts:15`
- `function nestedNodes(): TreeNode[]` at `test/component/panelExplorerSelection.test.ts:22`
- `function manyFlatNodes(count = 40): TreeNode[]` at `test/component/panelExplorerSelection.test.ts:49`
- `function plugin(selectionService = new NodeSelectionService(), viewService = …): VaultmanPlugin` at `test/component/panelExplorerSelection.test.ts:59`
- `function provider(overrides: Partial<ExplorerProvider> = {}): ExplorerProvider` at `test/component/panelExplorerSelection.test.ts:79`
- `function makePlugin(): { plugin: VaultmanPlugin; files: TFile[]; openLinkText; setSelectedFiles }` at `test/unit/components/explorerFiles.test.ts:10` (real Files provider construction)
- `function setup()` (FilesLogic with three TFiles + meta) at `test/unit/logic/logicsFiles.test.ts:5`
- `class MutableIndex<TNode>` (mutable `INodeIndex` impl used in `reactiveExplorers`) at `test/component/reactiveExplorers.test.ts:17`
- `createNodeIndex` test harness signature `createNodeIndex<TNode>({ build, searchText? })` at `test/unit/services/createNodeIndex.test.ts:15` — pattern to follow for `ExplorerDataPlane` service tests
- Existing `viewService.getModel` consumer pattern at `test/unit/services/serviceViews.test.ts:79-100` shows how to declare a `Pick<IViewService, 'getModel'>` service stub — same shape pattern applies to the new data-plane service tests

## Smallest red→green sequence for EDP-002

Step 1: RED — Pure contracts and snapshot rows.
- Action: Create `test/unit/logic/logicExplorerSnapshot.test.ts` with cases for rows, `byId`, `idToIndex`, `pathToId`, `folderPathToId`, parent/child ids, depth, visible-id order under default expansion, and `tree` reference preservation. Import `buildExplorerSnapshot` from `src/logic/logicExplorerSnapshot` and types from `src/types/typeExplorerDataPlane`.
- Expected before: `pnpm run test:unit -- test/unit/logic/logicExplorerSnapshot.test.ts` fails with module-resolution error or assertion mismatch.
- Expected after Step 2: same command passes.

Step 2: GREEN — Implement types + builder.
- Action: Add `src/types/typeExplorerDataPlane.ts` and `src/logic/logicExplorerSnapshot.ts` (pure walk; no Svelte runes).
- Expected before: Step 1 red.
- Expected after: Step 1 green; no other test changes.

Step 3: RED — Service revision/subscribe contract.
- Action: Create `test/unit/services/serviceExplorerDataPlane.test.ts` covering `publish`, `snapshot`, `subscribe`, `clear`, monotonic per-explorer `revision`, immutability of consumed reads, and isolation between explorer ids.
- Expected before: fails with module-resolution error.
- Expected after Step 4: passes.

Step 4: GREEN — Implement service.
- Action: Add `src/services/serviceExplorerDataPlane.svelte.ts` using `$state.raw` or immutable assignments per spec.
- Expected before: Step 3 red.
- Expected after: Step 3 green.

Step 5: RED — Files provider undecorated source parity.
- Action: Extend `test/unit/components/explorerFiles.test.ts` with a new `describe('structural source')` block that asserts `explorer.getStructuralSource()` returns a tree with the same row IDs and parent/child shape as `getTree()` and does NOT call `viewService.getModel`. Also assert action hooks remain functional after structural-source access.
- Expected before: `pnpm run test:unit -- test/unit/components/explorerFiles.test.ts` fails because the method does not exist.
- Expected after Step 6: passes.

Step 6: GREEN — Add `getStructuralSource()` (or equivalent adapter method) on `explorerFiles` that returns the pre-decoration tree.
- Action: Refactor `getTree()` in `src/providers/explorerFiles.ts` so `getStructuralSource()` runs filter → sort → buildTree → attachAdoptedChildren, and `getTree()` then layers `_decorateTree` on top. Reuse existing logic; do not change `getTree()` output.
- Expected before: Step 5 red.
- Expected after: Step 5 green; existing explorerFiles cases still green.

Step 7: RED — Panel selection prune uses snapshot visible order for Files.
- Action: Extend `test/component/panelExplorerSelection.test.ts` with a new test that mounts `PanelExplorer` with `provider.id = 'files'`, publishes a snapshot via a data-plane stub, collapses a folder, and asserts `selectionService.prune` is called with the snapshot's `visibleIds` (not the recursive scan). Also assert that for non-files providers the recursive fallback still runs (no regression).
- Expected before: fails because panel still uses recursive `visibleNodeIds()` for files.
- Expected after Step 8: passes.

Step 8: GREEN — Wire panel compatibility path.
- Action: In `src/components/containers/panelExplorer.svelte`, branch `visibleNodeIds()` so that when `provider.id === 'files'` and a data-plane snapshot exists, return `snapshot.visibleIds`; otherwise keep current recursive scan.
- Expected before: Step 7 red.
- Expected after: Step 7 green; all other panelExplorerSelection cases still green.

Step 9: VERIFY — Full unit + component suites.
- Action: Run focused commands then full unit + component suites.
- Expected: all green, no skipped tests, no console errors related to decoration.

## Focused Vitest commands the plan must require

Per `package.json:25-31`, Vaultman drives Vitest through `vp test` (vite-plus wrapper). Commands the plan must hardcode (copy-pasteable):

Single-file red/green during steps 1-8:
- `pnpm run test:unit -- test/unit/logic/logicExplorerSnapshot.test.ts`
- `pnpm run test:unit -- test/unit/services/serviceExplorerDataPlane.test.ts`
- `pnpm run test:unit -- test/unit/components/explorerFiles.test.ts`
- `pnpm run test:component -- test/component/panelExplorerSelection.test.ts`

Targeted groups for compatibility-bridge regression checks:
- `pnpm run test:unit -- test/unit/components/explorerFiles.test.ts test/unit/logic/logicsFiles.test.ts test/unit/services/serviceFilesIndex.test.ts test/unit/services/createNodeIndex.test.ts test/unit/services/serviceSelection.test.ts test/unit/services/serviceViews.test.ts`
- `pnpm run test:component -- test/component/panelExplorerSelection.test.ts test/component/panelExplorerEmpty.test.ts test/component/panelExplorerBadgeCollision.test.ts test/component/panelExplorerDeleteConflict.test.ts test/component/viewTreeSelection.test.ts test/component/viewTreeDecorations.test.ts test/component/viewTreeAdoptedNodes.test.ts test/component/viewTreeHoverBadges.test.ts test/component/viewTreeScrollFallback.test.ts test/component/reactiveExplorers.test.ts`

Full-suite gates (must run before declaring done):
- `pnpm run test:unit`
- `pnpm run test:component`

Static gates (already in `verify`):
- `pnpm run lint`
- `pnpm run check`
- `pnpm run build:plugin`

Notes:
- Vaultman uses `vp test run --project unit|component --config vitest.config.ts` under the hood, so `--reporter` and `--changed` flags should be appended after the `--` separator if needed, e.g. `pnpm run test:unit -- test/unit/logic/logicExplorerSnapshot.test.ts --reporter=verbose`. The `--changed` flag is NOT used by any current script and is not recommended for the EDP-002 loop because the new files are net-new and would not be discovered without an explicit path.
- `--fileParallelism=false` is already enforced for `test:component` (`package.json:27`). Do not override.

## Package scripts inventory

From `package.json:11-35`:

- `"lint"`: `"vp lint && eslint ."` (`package.json:14`)
- `"lint:fast"`: `"vp lint"` (`package.json:15`)
- `"lint:full"`: `"eslint ."` (`package.json:16`)
- `"check"`: `"svelte-check --tsconfig ./tsconfig.json"` (`package.json:24`); svelte-check `^4.1.0` (`package.json:71`)
- `"build"`: `"tsc -noEmit -skipLibCheck && vp build && node scripts/sync-test-build.mjs"` (`package.json:12`)
- `"build:plugin"`: `"tsc -noEmit -skipLibCheck && vp build"` (`package.json:13`)
- `"test:unit"`: `"vp test run --project unit --config vitest.config.ts"` (`package.json:26`)
- `"test:component"`: `"vp test run --project component --config vitest.config.ts --fileParallelism=false"` (`package.json:27`)
- `"test:integrity"`: `"vp test run --project integration --config vitest.config.ts"` (`package.json:25`)
- `"test:cover"`: `"vp test run --project unit --coverage --config vitest.config.ts"` (`package.json:28`)
- `"verify"`: `"pnpm run lint && pnpm run check && pnpm run build && pnpm run test:unit && pnpm run test:component"` (`package.json:31`)
- Vitest version: `^4.1.0` (`package.json:78`); `vite-plus`: `^0.1.20` (`package.json:77`); svelte: `^5.55.1` (`package.json:70`).

`vitest.config.ts` (single file, 73 lines): three projects (`integration` node, `component` jsdom, `unit` node) with `alias: { obsidian: <obsidian-mocks.ts> }` for unit + component (`vitest.config.ts:35-50`). Coverage gates: lines 60, functions 65, branches 55, statements 60 (`vitest.config.ts:65-70`) — the new `src/logic/logicExplorerSnapshot.ts` and `src/services/serviceExplorerDataPlane.svelte.ts` will be included automatically by `include: ['src/utils/**', 'src/logic/**', 'src/services/**']` (`vitest.config.ts:56`).

## Tests that must NOT regress

Files provider behavior and decoration:
- `test/unit/components/explorerFiles.test.ts`
- `test/unit/logic/logicsFiles.test.ts`
- `test/unit/services/serviceFilesIndex.test.ts`
- `test/unit/services/createNodeIndex.test.ts`
- `test/unit/services/serviceDecorate.test.ts`
- `test/unit/services/serviceViews.test.ts`
- `test/unit/services/serviceViewsZombie.test.ts`

Panel/selection/keyboard/reveal:
- `test/component/panelExplorerSelection.test.ts`
- `test/component/panelExplorerEmpty.test.ts`
- `test/component/panelExplorerBadgeCollision.test.ts`
- `test/component/panelExplorerDeleteConflict.test.ts`
- `test/component/panelExplorerCrear.test.ts`
- `test/component/reactiveExplorers.test.ts`
- `test/unit/services/serviceSelection.test.ts` (prune contract at lines 195-209)
- `test/unit/logic/logicKeyboard.test.ts`

Tree views (compat bridge must keep `TreeNode` rendering intact):
- `test/component/viewTreeSelection.test.ts`
- `test/component/viewTreeDecorations.test.ts`
- `test/component/viewTreeAdoptedNodes.test.ts`
- `test/component/viewTreeHoverBadges.test.ts`
- `test/component/viewTreeScrollFallback.test.ts`
- `test/component/virtualizerItemKeys.test.ts`
- `test/component/viewGridSelection.test.ts`
- `test/component/viewGridHoverBadges.test.ts`
- `test/component/viewTableSelection.test.ts`
- `test/component/viewNodeCards.test.ts`

Integration/regression catch-all (out of EDP-002 scope but listed for awareness): `test/integration/settingsMigration.test.ts`, `test/integration/plugin.test.ts`.

## Risks and Open Questions

- The structural-source method name (`getStructuralSource()` vs `getStructuralTree()` vs an adapter object) is not fixed by the spec — Wave B plan must pick exactly one name before red tests are written, otherwise the red command will not match the implementation surface. Recommend `getStructuralSource(): TreeNode<FileMeta>[]` to mirror the existing `getTree()` shape.
- `panelExplorer.svelte` already branches on `provider.id === 'files'` (per A2 report at `.agents/docs/work/hardening/plans/2026-05-11-explorer-data-plane-transition/reports/a2-panel-selection-reveal.md:35`). The data-plane wiring should reuse that branch rather than adding a parallel id check.
- `vitest.config.ts` coverage thresholds (60/65/55/60) include `src/logic/**` and `src/services/**` (`vitest.config.ts:56`); a thinly-tested service file could move thresholds downward globally. The plan must require ≥1 unit test per new file before `pnpm run test:cover` to avoid threshold regression.
- Spec shard 14 says queue-revision and filter-revision must NOT rebuild structural rows. The current `_decorateTree` reads `operationsIndex.revision` and `activeFiltersIndex.revision` (`src/providers/explorerFiles.ts:184-188`). The plan must define an explicit test that publishing a snapshot does not depend on those revisions even while `getTree()` still threads them through decoration.
- No shared `TreeNode` factory exists in `test/helpers/`. The plan should keep local `function buildTree()` helpers inside the two new test files instead of expanding `test/helpers/`; this matches Vaultman convention (see `test/component/panelExplorerSelection.test.ts:15-57`).
- `vp test` (vite-plus) is a thin Vitest wrapper. If a flag is unsupported in `vp`, fall back to `pnpm exec vitest run --project unit <path>` — none of the focused commands listed above are known to need that fallback.
- Open question for Wave B: should the service expose `subscribe(explorerId, cb)` per explorer, or a single global `subscribe(cb)` filtered by id? Spec shard 14 line 88 says per-explorer; test names assume per-explorer.

## Proposed exact files and tests the plan should touch

CREATE (new):
- `src/types/typeExplorerDataPlane.ts`
- `src/logic/logicExplorerSnapshot.ts`
- `src/services/serviceExplorerDataPlane.svelte.ts`
- `test/unit/logic/logicExplorerSnapshot.test.ts`
- `test/unit/services/serviceExplorerDataPlane.test.ts`

EXTEND (existing):
- `test/unit/components/explorerFiles.test.ts` — add `describe('structural source')` block; do NOT modify existing cases.
- `test/component/panelExplorerSelection.test.ts` — add Files-specific snapshot prune + range case alongside lines 289-313; keep existing `'selection-test'` cases intact.
- `src/providers/explorerFiles.ts` — add `getStructuralSource()` (or chosen method name); refactor `getTree()` to layer decoration on top; keep `_decorateTree`, `attachAdoptedChildren`, all action hooks, and `subscribe` semantics unchanged.
- `src/components/containers/panelExplorer.svelte` — branch `visibleNodeIds()` for `provider.id === 'files'` when a snapshot is published; keep recursive fallback for non-data-plane providers.

DO NOT TOUCH:
- `src/types/typeNode.ts` (TreeNode shape stays compatible).
- `src/services/serviceSelection.svelte.ts` and `test/unit/services/serviceSelection.test.ts`.
- `src/services/serviceViews.svelte.ts` and `test/unit/services/serviceViews.test.ts` (overlay batching deferred to EDP-004).
- `src/index/indexFiles.ts` and `test/unit/services/serviceFilesIndex.test.ts` (source index is upstream of EDP-002).
- `test/helpers/obsidian-mocks.ts` (no new factories needed).
