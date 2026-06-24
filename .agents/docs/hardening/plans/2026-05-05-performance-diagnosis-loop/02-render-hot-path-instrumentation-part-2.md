---
title: Render hot path instrumentation part 2
type: plan-shard
status: completed
parent: "[[docs/work/hardening/plans/2026-05-05-performance-diagnosis-loop/index|performance-diagnosis-loop-plan]]"
created: 2026-05-05T21:06:00
updated: 2026-05-05T21:45:00
tags:
  - agent/plan
  - performance
---

# Render Hot Path Instrumentation Part 2

Continuation of [[docs/work/hardening/plans/2026-05-05-performance-diagnosis-loop/02-render-hot-path-instrumentation|Render hot path instrumentation]].

- [x] **Step 5: Instrument `ViewService`**

In `src/services/serviceViews.svelte.ts`, import:

```ts
import { getActivePerfProbe } from '../dev/perfProbe';
```

Wrap `getModel()` body:

```ts
getModel<TNode extends NodeBase>(input: ExplorerViewInput<TNode>): ExplorerRenderModel<TNode> {
	return getActivePerfProbe()?.measure(
		'viewService.getModel',
		{ nodes: input.nodes.length },
		() => this.buildModel(input),
	) ?? this.buildModel(input);
}
```

Move the existing `getModel()` body into private `buildModel<TNode>(input)`.

Add counts to public mutation methods:

```ts
getActivePerfProbe()?.count('viewService.select');
getActivePerfProbe()?.count('viewService.clearSelection');
getActivePerfProbe()?.count('viewService.setFocused');
```

- [x] **Step 6: Instrument `DecorationManager`**

In `src/services/serviceDecorate.ts`, import `getActivePerfProbe` and wrap the body of `decorate()`:

```ts
decorate<TNode extends NodeBase>(node: TNode, context?: unknown): DecorationOutput {
	return getActivePerfProbe()?.measure(
		'decoration.decorate',
		{ nodes: 1 },
		() => this.decorateNode(node, context),
	) ?? this.decorateNode(node, context);
}
```

Move the existing method body into private `decorateNode<TNode>(node, context)`.

- [x] **Step 7: Instrument `PanelExplorer`**

In `src/components/containers/panelExplorer.svelte`, import `getActivePerfProbe`.

Replace `displayNodes` with a measured helper:

```ts
const displayNodes = $derived(resolveDisplayNodes(nodes, expandedIds));

function resolveDisplayNodes(items: TreeNode<TMeta>[], expanded: ReadonlySet<string>) {
	return getActivePerfProbe()?.measure(
		'panelExplorer.bubbleHiddenTreeBadges',
		{ nodes: items.length },
		() => bubbleHiddenTreeBadges(items, expanded),
	) ?? bubbleHiddenTreeBadges(items, expanded);
}
```

Wrap provider calls in `refreshData()`:

```ts
nodes = getActivePerfProbe()?.measure(
	'panelExplorer.getTree',
	{ nodes: nodes.length },
	() => provider.getTree(),
) ?? provider.getTree();
```

For `getFiles`, record `panelExplorer.getFiles` with `rows: files.length`.

- [x] **Step 8: Instrument `ViewTree`**

In `src/components/views/viewTree.svelte`, import `getActivePerfProbe`.

Replace `flatArray` with:

```ts
const flatArray = $derived(flattenMeasured(nodes, expandedIds));

function flattenMeasured(items: TreeNode[], expanded: Set<string>) {
	return getActivePerfProbe()?.measure(
		'viewTree.flatten',
		{ nodes: items.length },
		() => virtualizer.flatten(items, expanded),
	) ?? virtualizer.flatten(items, expanded);
}
```

In `onScroll`, add:

```ts
getActivePerfProbe()?.count('viewTree.scroll', {
	rows: flatArray.length,
	visibleRows: visibleSlice.length,
});
```

- [x] **Step 9: Verify targeted tests**

Run:

```powershell
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/dev/perfProbe.test.ts test/unit/services/serviceViews.test.ts
pnpm exec vp test run --project component --config vitest.config.ts --fileParallelism=false test/component/reactiveExplorers.test.ts
pnpm run check
```

Expected: all pass with no Svelte diagnostics.
