---
title: Notebook Navigator index and explorer comparison
type: research
status: draft
parent: "[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/index|explorer-data-plane-structural-taxonomy]]"
created: 2026-05-14T00:39:54
updated: 2026-05-14T00:39:54
tags:
  - agent/research
  - initiative/hardening
  - explorer/views
  - notebook-navigator
  - svelte
created_by: codex
updated_by: codex
source_repos:
  - "C:\\Users\\vic_A\\Desktop\\notebook-navigator"
  - "C:\\Users\\vic_A\\Desktop\\vaultman\\.claude\\worktrees\\jovial-wilson-f81c67"
---

# Notebook Navigator Index And Explorer Comparison

## Takeaway

Notebook Navigator's useful prior art is not React itself and not IndexedDB by default. The useful pattern is a staged explorer data path:

1. source facts are indexed first;
2. tree services build canonical lookup structures;
3. pane-specific source state combines settings, visibility, ordering, and revision inputs;
4. panes flatten to row items;
5. stable lookup maps such as `pathToIndex` are built after final row projection;
6. scroll, list, selection, and keyboard consumers resolve late against the current visible map.

Vaultman is already moving toward the same architecture with `ExplorerSnapshot`, `ExplorerDataPlaneService`, snapshot row inputs, and revision-gated reveal targets. The current `claude/explorer` worktree still has an important connection gap: `filesSnapshot` is consumed by `panelExplorer`, but the source scan did not find structural snapshot publication into `ExplorerDataPlaneService`.

Confidence: high for the architectural direction, medium for exact current implementation state because local file reads against the worktree were slow and the final targeted scan timed out. The earlier repository-wide scan found `ExplorerDataPlaneService` creation/consumption and Tags/Props `getSnapshot()`, but no Files snapshot `publish()` call.

## Decision Frame

| Dimension | Notebook Navigator | Vaultman target |
| --- | --- | --- |
| Framework constraint | React contexts and hooks. | Svelte 5 runes, `.svelte.ts` services, component-local adapters. |
| Data-plane goal | Keep navigation/list panes fed by pre-derived trees, row lists, and lookup maps. | Make `ExplorerSnapshot` the structural contract for Files first, then Tags/Props. |
| Storage posture | IndexedDB plus memory cache for rebuildable file-derived data. | Memory-first structural snapshots; separate media/derived-content cache only when needed. |
| Explorer connection | Navigation pane and list pane consume services and maps, not ad hoc tree scans. | `panelExplorer`, `viewTree`, list/grid/table/cards should consume snapshot maps and row inputs. |
| Migration constraint | Mature React architecture can keep hooks as composition boundaries. | Do not port hooks literally; move durable boundaries into Svelte services and pure builders. |

## Evidence Ledger

| Claim | Notebook Navigator evidence | Vaultman `claude/explorer` evidence | Confidence |
| --- | --- | --- | --- |
| Navigation builds a final item array and lookup map before virtual rendering. | `src/hooks/navigationPane/data/useNavigationPaneItemPipeline.ts` combines sections, decorates/filter items, inserts spacing, then calls `buildNavigationPathIndexMap()`. `src/utils/navigationIndex.ts` maps typed navigation keys to indexes. | `src/types/typeExplorerDataPlane.ts` defines `rows`, `visibleIds`, `idToIndex`, `pathToId`, `folderPathToId`, and `domainKeyToId`. | High |
| Source state is separate from pane rendering. | `src/hooks/navigationPane/data/useNavigationPaneSourceState.ts` derives profile/settings/root/tag/property state and revisions before the pane pipeline. | `src/index/indexNodeCreate.ts`, `indexFiles.ts`, `indexTags.ts`, and `indexProps.ts` provide flat source indexes, but providers still own much of the structural projection. | High |
| Tree lookup services bridge React and non-React consumers. | `src/services/TagTreeService.ts` and `src/services/PropertyTreeService.ts` hold canonical trees, indexes, listeners, descendants, and file-path lookup caches. | Vaultman has `ExplorerDataPlaneService`, `logicExplorerSnapshot`, and `serviceExplorerRowInput`, but the branch has not yet generalized service-style lookup across all explorers. | High |
| Revisions distinguish source changes from metadata/decoration changes. | `useFolderNavigationSourceState.ts`, `useTagTreeSync.ts`, and `usePropertyTreeSync.ts` separate file-change and metadata-decoration invalidation. | `typeExplorerDataPlane.ts` models structural upstream revisions; `explorerFiles.ts` separates structural read from decoration more than Tags/Props. | High |
| Scroll/reveal should resolve late against current maps. | `useNavigationPaneScroll.ts` gates pending scrolls by index version and resolves path to index from `pathToIndex`. | `ExplorerRevealTarget` and `resolveRowInputRevealIndex()` use snapshot revision and `idToIndex` gates. | High |
| Files data-plane wiring is not finished. | Not applicable. | `panelExplorer.svelte` reads `plugin.explorerDataPlaneService?.snapshot('files')`; repo scan found `ExplorerDataPlaneService` and Tags/Props `getSnapshot()`, but no visible Files `getSnapshot()` or data-plane `publish()` wiring. | Medium |

## Criteria Matrix

| Criterion | Notebook Navigator lesson | Vaultman implication |
| --- | --- | --- |
| Structural ownership | Put tree/item construction before view rendering. | Move Files structural projection into a pure snapshot builder or data-plane adapter before `panelExplorer` decoration work. |
| Lookup determinism | Build lookup maps after final visible item projection. | Treat `visibleIds`, `idToIndex`, `pathToId`, `folderPathToId`, and `domainKeyToId` as required snapshot outputs. |
| Decoration isolation | Let metadata/content changes update decoration without rebuilding row structure. | Keep queue/filter/media badges out of structural snapshots; route them through batched `ViewService`/layer overlays. |
| Svelte fit | React hooks are composition, not the thing to copy. | Use `.svelte.ts` services, pure functions, immutable snapshot replacement, and small Svelte contexts only for dependency access. |
| Migration safety | Existing panes can remain while source and lookup contracts improve. | Keep `TreeNode` compatibility, provider action hooks, and view adapters while adding snapshots underneath. |
| Performance | Synchronous reads and precomputed maps avoid repeated scans in hot render paths. | Remove recursive panel scans and per-node decoration once snapshots and batch layers are available. |
| Persistence | Persistent storage is useful for rebuildable expensive derived data, not mandatory for all structure. | Do not persist structural snapshots yet; persist media/derived-content cache separately if thumbnails/previews need it. |

## What Vaultman Should Copy

| Lesson | Notebook Navigator shape | Vaultman translation |
| --- | --- | --- |
| Source state boundary | Raw storage facts, profile settings, visibility, hidden matchers, comparators, order maps, and revisions are derived before navigation items exist. | Add `ExplorerSourceState` or provider-specific snapshot inputs between flat indexes/providers and `ExplorerSnapshot` generation. Files source state should include file index revision, hidden rules, search, sort, root ordering, expansion, and adopted-child structural inputs. |
| Snapshot maps as outputs | `pathToIndex` is built after items are combined, filtered, decorated, and spaced. | Make `byId`, `idToIndex`, `pathToId`, `folderPathToId`, `domainKeyToId`, and `visibleIds` required Files snapshot outputs. Views should consume row inputs from snapshots instead of walking `TreeNode[]`. |
| Service bridges | `TagTreeService` and `PropertyTreeService` let selection, list panes, and commands resolve current targets outside React components. | Use `.svelte.ts` services with synchronous lookup, subscriptions, and reconciliation helpers for selection/list/reveal consumers. |
| Late reveal resolution | Scroll intent is stored by path/context and resolved after the current index version can answer the target. | Keep `ExplorerRevealTarget` and `resolveRowInputRevealIndex()`, but require every reveal-capable explorer to publish a current visible row map with a revision. |
| Batched decoration layers | Metadata/content decoration changes do not rebuild full row structure. | Keep structural snapshots for hierarchy/lookup; route `ViewService`, queue/filter/media badges, and row chrome through batched overlay revisions. |

## What Vaultman Should Not Copy

| Notebook Navigator pattern | Why not copy literally | Svelte/Vaultman alternative |
| --- | --- | --- |
| React provider and hook layering | It reflects React's composition model, not the durable architecture boundary. | Pure builders plus `.svelte.ts` services and small Svelte context for dependency injection. |
| IndexedDB for structural rows | Vaultman's current structural problem is ownership and invalidation, not reload-time persistence. | Memory-first immutable snapshots; rebuild from source indexes/providers. |
| One large pane data hook | Svelte would turn this into an overgrown component/service hybrid. | Split source state, snapshot builder, overlay builder, and adapter-local virtualizer. |
| Generic per-row subscriptions early | They can fragment invalidation before the row identity contract is stable. | Snapshot revision subscriptions plus narrow media/file subscriptions only when needed. |
| UI tree as source of truth for lists/commands | It couples list selection and commands to visual tree shape. | Source services and snapshot lookups feed list, reveal, selection, and commands. |

## Current Vaultman Gap

The branch has the right pieces: `typeExplorerDataPlane.ts` defines snapshot contracts; `logicExplorerSnapshot.ts` builds rows and maps;
`serviceExplorerDataPlane.svelte.ts` stores snapshots; `serviceExplorerRowInput` adapts rows and reveal gating; Tags/Props expose `getSnapshot()`; Files exposes structural tree/revisions; and `panelExplorer.svelte` reads a `files` snapshot.

The gap is publication and ownership. The scan did not find a Files snapshot publisher that calls the data plane after structural rebuild. Therefore the implementation likely has a half-connected Files data-plane path: consumers are ready, the service exists, but the source publish step is missing or not in the searched paths.

Before implementation, re-run a targeted search in the active `claude/explorer` worktree:

```powershell
rg -n "explorerDataPlaneService|\\.publish\\(|getSnapshot\\(|buildExplorerSnapshot" src
```

If no Files publish path appears, the next slice should add it deliberately rather than adding more consumer-side fallbacks.

## Recommended Next Slice

Use Files as the tracer bullet:

| Step | Action |
| --- | --- |
| 1 | Add `explorerFiles.getSnapshot(expandedIds)` or a Files adapter that calls `buildExplorerSnapshot()` from the undecorated structural tree. |
| 2 | Publish the Files snapshot through `ExplorerDataPlaneService.publish('files', snapshot)` whenever structural source inputs change. |
| 3 | Keep `getTree()` returning decorated `TreeNode[]` for compatibility until adapters fully consume row inputs. |
| 4 | Make `panelExplorer` use snapshot maps for parent lookup, visible order, selected-node lookup, reveal, and range navigation. |
| 5 | Keep queue/filter/active badge updates out of the structural publish path. |
| 6 | Convert Tags/Props after Files proves the contract, replacing per-node decoration with batch layer maps. |

## Acceptance Signals

- Files publishes a structural snapshot before decoration.
- `panelExplorer` can resolve Files selection, parent, visible order, and reveal through snapshot maps.
- Repeated queue/filter overlay changes do not rebuild Files structural rows.
- `viewTree` receives stable row keys and revision-gated `idToIndex`.
- Existing provider action hooks and `TreeNode` compatibility still work.
- Tags/Props have an explicit follow-up path to batch decoration and service lookup parity.

## Decision

Proceed with a Svelte-native version of Notebook Navigator's staged data path:
source state, structural snapshot, lookup maps, overlay layers, adapter-local virtualization. Do not copy React hooks literally. Do not persist structural snapshots. Do use Notebook Navigator's tree service and late lookup discipline as the architectural reference.
