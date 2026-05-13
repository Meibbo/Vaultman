---
title: Performance baseline
type: research
status: active
parent: "[[docs/work/hardening/specs/2026-05-05-performance-diagnosis-loop/index|performance-diagnosis-loop]]"
created: 2026-05-05T20:58:26
updated: 2026-05-12T22:30:00
tags:
  - agent/research
  - performance
---

# Performance Baseline

## Environment

- Date: 2026-05-05
- Branch: hardening-refactor
- Command path: Obsidian CLI `obsidian eval`
- Plugin reload: passed

## Scenario Results

### filters-search

```json
{"startedAt":4907659.700000003,"endedAt":4908177.200000003,"counters":{"scenario.filters-search":{"count":1,"totalNodes":0,"totalRows":0,"totalVisibleRows":0}},"timings":{"panelExplorer.bubbleHiddenTreeBadges":{"count":4,"totalNodes":416,"totalRows":0,"totalVisibleRows":0,"totalMs":309.8999999910593,"maxMs":204.59999999403954},"viewTree.flatten":{"count":4,"totalNodes":416,"totalRows":0,"totalVisibleRows":0,"totalMs":2.3999999910593033,"maxMs":2.0999999940395355},"decoration.decorate":{"count":1098,"totalNodes":1098,"totalRows":0,"totalVisibleRows":0,"totalMs":1.399999976158142,"maxMs":0.10000000894069672},"viewService.getModel":{"count":12,"totalNodes":12,"totalRows":0,"totalVisibleRows":0,"totalMs":1,"maxMs":0.7999999970197678},"panelExplorer.getTree":{"count":2,"totalNodes":0,"totalRows":0,"totalVisibleRows":0,"totalMs":79.8999999910593,"maxMs":61.099999994039536}},"scenario":"filters-search"}
```

### tree-scroll

```json
{"startedAt":4921642,"endedAt":4921661.200000003,"counters":{"scenario.tree-scroll":{"count":1,"totalNodes":0,"totalRows":0,"totalVisibleRows":0},"viewTree.scroll":{"count":12,"totalNodes":0,"totalRows":144,"totalVisibleRows":144}},"timings":{},"scenario":"tree-scroll"}
```

### filter-select

```json
{"startedAt":4937611.599999994,"endedAt":4937801.700000003,"counters":{"scenario.filter-select":{"count":1,"totalNodes":0,"totalRows":0,"totalVisibleRows":0},"viewService.clearSelection":{"count":1,"totalNodes":0,"totalRows":0,"totalVisibleRows":0},"viewService.select":{"count":1,"totalNodes":0,"totalRows":0,"totalVisibleRows":0},"viewService.setFocused":{"count":1,"totalNodes":0,"totalRows":0,"totalVisibleRows":0}},"timings":{"decoration.decorate":{"count":324,"totalNodes":324,"totalRows":0,"totalVisibleRows":0,"totalMs":0.7000000178813934,"maxMs":0.20000000298023224},"panelExplorer.getTree":{"count":4,"totalNodes":0,"totalRows":0,"totalVisibleRows":0,"totalMs":86.8999999910593,"maxMs":61.70000000298023},"panelExplorer.bubbleHiddenTreeBadges":{"count":4,"totalNodes":22,"totalRows":0,"totalVisibleRows":0,"totalMs":24.200000002980232,"maxMs":14.300000011920929},"viewTree.flatten":{"count":4,"totalNodes":22,"totalRows":0,"totalVisibleRows":0,"totalMs":0.19999998807907104,"maxMs":0.09999999403953552},"viewService.getModel":{"count":152,"totalNodes":152,"totalRows":0,"totalVisibleRows":0,"totalMs":6.500000059604645,"maxMs":2}},"scenario":"filter-select"}
```

### operation-badges

```json
{"startedAt":4952371.700000003,"endedAt":4952771.200000003,"counters":{"scenario.operation-badges":{"count":1,"totalNodes":0,"totalRows":0,"totalVisibleRows":0},"viewService.clearSelection":{"count":1,"totalNodes":0,"totalRows":0,"totalVisibleRows":0},"viewService.select":{"count":1,"totalNodes":0,"totalRows":0,"totalVisibleRows":0},"viewService.setFocused":{"count":1,"totalNodes":0,"totalRows":0,"totalVisibleRows":0}},"timings":{"decoration.decorate":{"count":2324,"totalNodes":2324,"totalRows":0,"totalVisibleRows":0,"totalMs":5.700000032782555,"maxMs":2.5999999940395355},"panelExplorer.getTree":{"count":4,"totalNodes":0,"totalRows":0,"totalVisibleRows":0,"totalMs":77.10000002384186,"maxMs":42.20000000298023},"panelExplorer.bubbleHiddenTreeBadges":{"count":4,"totalNodes":152,"totalRows":0,"totalVisibleRows":0,"totalMs":113.30000001192093,"maxMs":57.20000000298023},"viewTree.flatten":{"count":4,"totalNodes":152,"totalRows":0,"totalVisibleRows":0,"totalMs":0.09999999403953552,"maxMs":0.09999999403953552},"viewService.getModel":{"count":152,"totalNodes":152,"totalRows":0,"totalVisibleRows":0,"totalMs":2.2000000178813934,"maxMs":0.20000000298023224}},"scenario":"operation-badges"}
```

## Findings

1. Highest call count: `decoration.decorate`, count `2324`, scenario `operation-badges`; it matters because decoration work scales per rendered semantic row and can amplify any refresh that rebuilds explorer nodes.
2. Highest total measured time: `panelExplorer.bubbleHiddenTreeBadges`, total `309.8999999910593` ms, scenario `filters-search`; it matters because this single derived pass dominated measured work during search.
3. Highest max measured time: `panelExplorer.bubbleHiddenTreeBadges`, max `204.59999999403954` ms, scenario `filters-search`; this matches the reported search/filter jank better than `viewTree.flatten`, which stayed near 2.1 ms max.
4. Missing metrics: `panelExplorer.getFiles` was absent from the active DOM scenarios; `panelExplorer.getTree.totalNodes` remains `0` because reading `nodes.length` inside the tree refresh effect caused a Svelte dependency loop and was removed; operation/filter badge recomputation is visible indirectly through decoration, view-service, and bubbling metrics but is not yet split into a dedicated counter.

## Next Optimization Candidates

1. `PanelExplorer` badge bubbling: optimize or cache `bubbleHiddenTreeBadges` because it had the highest total and max duration, especially during `filters-search`.
2. `DecorationManager` / semantic row projection: reduce or cache `decoration.decorate` calls because it reached `2324` calls in `operation-badges` and `1098` calls in `filters-search`, even though individual call time was low.

## Badge Bubbling Optimization Comparison

Change:

- `bubbleHiddenTreeBadges` now structurally shares unchanged nodes and child arrays.
- The utility still traverses descendants to find hidden badges, but it clones only branches that gain inherited badges or contain changed children.
- The perf probe now has a timer fallback for `requestAnimationFrame` waits so CLI scenarios do not hang when Obsidian does not deliver animation frames while the CLI is waiting.

### filters-search after optimization

```json
{"startedAt":7985751.799999997,"endedAt":7985981.899999991,"counters":{"scenario.filters-search":{"count":1,"totalNodes":0,"totalRows":0,"totalVisibleRows":0},"viewTree.scroll":{"count":1,"totalNodes":0,"totalRows":12,"totalVisibleRows":12}},"timings":{"panelExplorer.bubbleHiddenTreeBadges":{"count":4,"totalNodes":416,"totalRows":0,"totalVisibleRows":0,"totalMs":50.400000005960464,"maxMs":39.79999999701977},"viewTree.flatten":{"count":4,"totalNodes":416,"totalRows":0,"totalVisibleRows":0,"totalMs":11.5,"maxMs":11.300000011920929},"decoration.decorate":{"count":1098,"totalNodes":1098,"totalRows":0,"totalVisibleRows":0,"totalMs":1.4000000208616257,"maxMs":0.20000000298023224},"viewService.getModel":{"count":12,"totalNodes":12,"totalRows":0,"totalVisibleRows":0,"totalMs":0.6000000089406967,"maxMs":0.4000000059604645},"panelExplorer.getTree":{"count":2,"totalNodes":0,"totalRows":0,"totalVisibleRows":0,"totalMs":42.50000001490116,"maxMs":31.900000005960464}},"scenario":"filters-search"}
```

### filter-select after optimization

```json
{"startedAt":7996097.899999991,"endedAt":7996179.099999994,"counters":{"scenario.filter-select":{"count":1,"totalNodes":0,"totalRows":0,"totalVisibleRows":0},"viewService.clearSelection":{"count":1,"totalNodes":0,"totalRows":0,"totalVisibleRows":0},"viewService.select":{"count":1,"totalNodes":0,"totalRows":0,"totalVisibleRows":0},"viewService.setFocused":{"count":1,"totalNodes":0,"totalRows":0,"totalVisibleRows":0}},"timings":{"decoration.decorate":{"count":324,"totalNodes":324,"totalRows":0,"totalVisibleRows":0,"totalMs":0.3999999910593033,"maxMs":0.10000000894069672},"panelExplorer.getTree":{"count":4,"totalNodes":0,"totalRows":0,"totalVisibleRows":0,"totalMs":33.19999998807907,"maxMs":21.69999998807907},"panelExplorer.bubbleHiddenTreeBadges":{"count":4,"totalNodes":22,"totalRows":0,"totalVisibleRows":0,"totalMs":1.5,"maxMs":0.7000000029802322},"viewTree.flatten":{"count":4,"totalNodes":22,"totalRows":0,"totalVisibleRows":0,"totalMs":0.10000000894069672,"maxMs":0.10000000894069672},"viewService.getModel":{"count":152,"totalNodes":152,"totalRows":0,"totalVisibleRows":0,"totalMs":5.399999991059303,"maxMs":2.2999999970197678}},"scenario":"filter-select"}
```

### operation-badges after optimization

```json
{"startedAt":8012160,"endedAt":8012360,"counters":{"scenario.operation-badges":{"count":1,"totalNodes":0,"totalRows":0,"totalVisibleRows":0},"viewService.clearSelection":{"count":1,"totalNodes":0,"totalRows":0,"totalVisibleRows":0},"viewService.select":{"count":1,"totalNodes":0,"totalRows":0,"totalVisibleRows":0},"viewService.setFocused":{"count":1,"totalNodes":0,"totalRows":0,"totalVisibleRows":0}},"timings":{"decoration.decorate":{"count":2324,"totalNodes":2324,"totalRows":0,"totalVisibleRows":0,"totalMs":0.7999999970197678,"maxMs":0.10000000894069672},"panelExplorer.getTree":{"count":4,"totalNodes":0,"totalRows":0,"totalVisibleRows":0,"totalMs":38,"maxMs":18.900000005960464},"panelExplorer.bubbleHiddenTreeBadges":{"count":4,"totalNodes":152,"totalRows":0,"totalVisibleRows":0,"totalMs":19.99999998509884,"maxMs":13.899999991059303},"viewTree.flatten":{"count":4,"totalNodes":152,"totalRows":0,"totalVisibleRows":0,"totalMs":0.30000001192092896,"maxMs":0.20000000298023224},"viewService.getModel":{"count":152,"totalNodes":152,"totalRows":0,"totalVisibleRows":0,"totalMs":1.5000000298023224,"maxMs":0.19999998807907104}},"scenario":"operation-badges"}
```

### Comparison Findings

1. `filters-search` `panelExplorer.bubbleHiddenTreeBadges.totalMs` improved from `309.8999999910593` ms to `50.400000005960464` ms, about an `83.7%` reduction.
2. `filters-search` `panelExplorer.bubbleHiddenTreeBadges.maxMs` improved from `204.59999999403954` ms to `39.79999999701977` ms, about an `80.5%` reduction.
3. `filter-select` `panelExplorer.bubbleHiddenTreeBadges.totalMs` improved from `24.200000002980232` ms to `1.5` ms, about a `93.8%` reduction.
4. `operation-badges` `panelExplorer.bubbleHiddenTreeBadges.totalMs` improved from `113.30000001192093` ms to `19.99999998509884` ms, about an `82.3%` reduction.
5. Next candidate remains `panelExplorer.getTree` or upstream provider rebuild frequency. After the badge optimization, `panelExplorer.getTree` is now comparable to or larger than badge bubbling in the measured scenarios.

## EDP-005 Files Data-Plane Gate

Source issue:
[[docs/work/hardening/issues/explorer-data-plane/005-files-data-plane-performance-gate|EDP-005 Files data-plane performance gate]].

Change:

- Added probe timings for `explorerDataPlane.snapshot.create`,
  `explorerDataPlane.snapshot.lookupMaps`, `explorerDataPlane.layers.batch`,
  `explorerDataPlane.reveal.lookup`, and `panelExplorer.refresh.total`.
- Added Files structural counters:
  `explorerDataPlane.files.structure.rebuild` and
  `explorerDataPlane.files.structure.cacheHit`.
- Kept `panelExplorer.getTree`, `panelExplorer.bubbleHiddenTreeBadges`,
  `viewTree.flatten`, and `viewService.getModel` labels intact for comparison
  with the 2026-05-05 baseline above.

Automated probe evidence:

- `logicExplorerSnapshot.test.ts` verifies snapshot creation and lookup-map
  timing labels on Files-like trees.
- `serviceExplorerLayers.test.ts` verifies one batched layer timing with queue
  and filter totals.
- `explorerFiles.test.ts` verifies a queue-only operation refresh records one
  structural rebuild before the queue change and one structural cache hit after
  the queue change.
- `panelExplorerEmpty.test.ts` verifies total panel refresh timing through the
  mounted Files panel path without rebuilding snapshots locally.
- `viewTreeScrollFallback.test.ts` verifies reveal lookup timing when the
  snapshot row map resolves the target id.

Architectural note:

- The earlier `sandbox` attempt expected `panelExplorer.svelte` to rebuild
  snapshots locally. That was rejected during reconciliation because EDP-003
  made `ExplorerDataPlaneService` the canonical snapshot store. Snapshot create
  and lookup-map probes belong to `logicExplorerSnapshot`; panel refresh timing
  stays separate.
