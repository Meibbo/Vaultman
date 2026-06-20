---
title: Phase 06d - Complete Inventory
created: 2026-05-17
status: done
source:
  - src/services/
  - src/types/
  - src/logic/
  - src/registry/
  - src/utils/
---

# Phase 06d - Complete Inventory

## Services

| File | Lines | Role |
|---|---:|---|
| `serviceQueue.svelte.ts` | 1044 | Operation queue, mutable transactions, immutable chains, execute/delete conflict flow. |
| `serviceOverlayProjection.ts` | 683 | Operation/filter overlay indexes and layer projection. |
| `serviceFilter.svelte.ts` | 497 | Active filter tree and filtered/selected files. |
| `serviceViews.svelte.ts` | 488 | Render model builder, selection bridge, overlays, row layers. |
| `serviceViewTableAdapter.ts` | 392 | Provider-specific table columns, rows, selection, sorting adapters. |
| `serviceFnR.ts` | 377 | FnR state, rename handoffs, content replace queue changes. |
| `serviceAPI.ts` | 360 | Read/plan/enqueue facade with risk and scope summaries. |
| `serviceExplorerMediaCache.ts` | 333 | Explorer media cache records and lifecycle. |
| `serviceFnRTemplate.ts` | 325 | FnR template token parsing and resolution. |
| `serviceDnd.ts` | 323 | Generic drag/drop state machine and candidate resolution. |
| `serviceCommands.ts` | 280 | Obsidian quick command registration. |
| `serviceSelection.svelte.ts` | 278 | Node selection authority and snapshots. |
| `serviceNodeFieldVisibility.ts` | 271 | Visible node field definitions and settings persistence. |
| `serviceBasesInterop.ts` | 269 | Bases import preview and fenced block extraction. |
| `serviceLayout.ts` | 267 | Layout settings, dashboard gate, drop action resolver. |
| `serviceDiff.ts` | 261 | File, operation, frontmatter, body diff builders. |
| `serviceExplorerScrollGeometry.ts` | 257 | Fixed and variable scroll geometry coordinators. |
| `serviceMouse.ts` | 253 | Mouse gesture grammar and node action mapping. |
| `serviceNodeBinding.ts` | 242 | Binding-note aliases, lookup, create/open flows. |
| `serviceExplorerLayers.ts` | 235 | Batch view-layer projection onto explorer rows. |
| `serviceExplorerRowInput.ts` | 225 | Snapshot/tree/view row input adapters. |
| `serviceManualDnd.ts` | 221 | Explorer manual DnD and workspace payloads. |
| `serviceFnRIsland.svelte.ts` | 217 | Panel-scoped FnR island state. |
| `serviceNativeSurfaceBinding.ts` | 212 | Native Obsidian hover/click binding bridge. |
| `serviceDndSvelteAdapter.ts` | 208 | Svelte/DnD adapter payloads. |
| `serviceCMenu.ts` | 205 | Context menu service. |
| `serviceTheme.svelte.ts` | 171 | Elastic UI/theme preset state and custom CSS. |
| `serviceFnRDateParser.ts` | 170 | FnR date expression parser. |
| `serviceLeafDetach.ts` | 167 | Independent leaf persistence and restore. |
| `serviceTextMeasure.ts` | 165 | Pretext/fallback text measurement caches. |
| `serviceQueuePresentation.ts` | 164 | Queue action presentation rows and badges. |
| `serviceScroll.ts` | 161 | Fixed virtual rows and RAF rect observer helpers. |
| `serviceExplorerProjection.ts` | 148 | Explorer projection rows, visible IDs, ID/index maps. |
| `serviceMessage.ts` | 139 | Service message/logger/notice facade. |
| `serviceAddonsIsland.svelte.ts` | 122 | Addons island panes and quick switcher state. |
| `serviceTagQueue.ts` | 120 | Tag add/delete/rename queue builders. |
| `serviceOpsLog.svelte.ts` | 113 | Ops-log retention and queue/perf binding. |
| `serviceNodeRowStyle.ts` | 111 | Row measurement style resolver. |
| `serviceDecorate.ts` | 108 | Decoration manager. |
| `serviceDndAliasAware.ts` | 102 | Alias-aware drop payload and effect resolution. |
| `serviceNodeCardStyle.ts` | 100 | Card measurement style resolver. |
| `perfMeter.ts` | 95 | Perf event emitter and timing helpers. |
| `serviceGroups.ts` | 91 | Logic groups, filter reorder, queue grouping. |
| `serviceNodeCardLayout.ts` | 87 | Card fields, height buckets, row height. |
| `serviceViewSize.ts` | 87 | View size presets and CSS vars. |
| `serviceFileQueue.ts` | 85 | File rename/move/delete/link queue builders. |
| `serviceExplorerViewContract.ts` | 83 | Platform view modes and feature/scale contract. |
| `serviceOperationScope.ts` | 82 | Selected/filtered/auto operation scope resolver. |
| `serviceIcons.ts` | 81 | Iconic service wrapper. |
| `serviceExplorer.svelte.ts` | 77 | Generic explorer service over an index and decoration manager. |
| `serviceFnRPropSet.ts` | 74 | Prop-set island prefill, parse, and change builder. |
| `serviceNavigation.svelte.ts` | 74 | Router service implementation. |
| `serviceActiveFilterPresentation.ts` | 72 | Active filter labels, details, reorder checks. |
| `serviceFoulDetection.svelte.ts` | 67 | Portal/foul detection state. |
| `serviceNativeClickIntercept.ts` | 64 | Native alias click interception. |
| `serviceVfsChain.ts` | 57 | Immutable virtual file snapshot chain. |
| `serviceExplorerDataPlane.svelte.ts` | 54 | Explorer snapshot publish/snapshot/subscribe store. |
| `serviceDiffSnapshot.ts` | 45 | Snapshot diff builder. |
| `serviceNodeRowMeasure.ts` | 44 | Row height measurement service. |
| `serviceAliasTokens.ts` | 37 | Alias token helpers. |
| `serviceCache.ts` | 36 | Generic service cache. |
| `serviceSorting.ts` | 34 | Generic node sorting helper. |
| `servicePortalResolver.ts` | 31 | Portal target resolver. |
| `serviceOverlayState.svelte.ts` | 29 | Overlay stack service. |
| `serviceAdoption.svelte.ts` | 21 | Adopted node state service. |
| `serviceTemplatesIndex.ts` | 11 | Templates index factory. |
| `badgeRegistry.ts` | 2 | Placeholder/empty registry file. |

## Types Logic Registry Utils

| Area | Files |
|---|---|
| Types | `typeThemePreset`, `typeViews`, `typeContracts`, `typeSettings`, `typeObsidian`, `typeOps`, `typeExplorerDataPlane`, `typeNode`, `typeBasesInterop`, `typeTab`, `typeFnR`, `typeExplorer`, `typeTabLeaf`, `typeElasticUi`, `typeProp`, `typeSelection`, `typeFilter`, `typeVfsImmutable`, `typeFrame`, `typePrimitives`, `typeCtxMenu`, `typeAdoptedNode`. |
| Logic | `logicKeyboard`, `logicExplorerSnapshot`, `logicProps`, `logicsFiles`, `logicTags`, `logicExplorer`. |
| Registry | `tabRegistry`, `explorerAddOps`. |
| Utils | `filter-evaluator`, `autocomplete`, `utilViewLayers`, `utilBadgeBubbling`, `dropDAutoSuggestionInput`, `utilDebounce`, `utilExplorerExpansion`, `inputModal`, `fileSuggestModal`. |
