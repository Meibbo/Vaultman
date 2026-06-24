---
title: DELTA DnD And Main View
type: implementation-plan-shard
status: draft
parent: "[[docs/work/polish/plans/2026-05-11-elastic-ui-chameleon/04-delta-interaction|delta-interaction]]"
created: 2026-05-10T20:20:23
updated: 2026-05-10T20:20:23
tags:
  - agent/plan
  - elastic-ui
  - delta
created_by: codex
updated_by: codex
---

# DELTA DnD And Main View

## Task D5: DnD Adapter Gate Execution

If dependency gate keeps `@dnd-kit/svelte`:

- Preserve `createDndKitDraggableInput`, `createDndKitDroppableInput`, and
  `createDndKitProviderHandlers`.
- Add drag subject kind:

```ts
export type DndSubjectKind =
	| 'node'
	| 'row'
	| 'group'
	| 'column'
	| 'tab'
	| 'filter'
	| 'card'
	| 'outline-block';
```

- Add operation:

```ts
export type DndOperation = 'reorder' | 'move' | 'apply-template' | 'embed-block';
```

If dependency gate approves `@thisux/sveltednd`, DELTA must:

- Replace `@dnd-kit/svelte` imports in `serviceDndSvelteAdapter.ts`.
- Preserve exported semantic functions under compatibility names or update all
  call sites in the same shard.
- Update tests to assert semantic `DndDropResult`, not library event shapes.

Verification:

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceDnd.test.ts test/unit/services/serviceDndSvelteAdapter.test.ts --fileParallelism=false
```

Expected: drag start, drag over, drag end, cancel, selected multi-drag, and
outline block target tests pass.

## Task D7: Main View Snippet Orchestration Contract

DELTA does not own layout implementation, but must preserve interaction events
when Main View uses Svelte snippets:

```svelte
{#snippet col1()}
	<ExplorerActiveFiltersComp onRuleClick={handleRuleClick} />
{/snippet}

{#snippet col2()}
	<FiltersPage
		{plugin}
		bind:filtersActiveTab
		onOperationScopeChange={setFiltersOperationScope}
	/>
{/snippet}

{#snippet col3()}
	{#if statsPreviewFile}
		<StatisticsPage {plugin} previewFile={statsPreviewFile} onShowStats={showStatsPage} />
	{:else}
		<OperationsPage {plugin} {icon} />
	{/if}
{/snippet}
```

All event handlers passed into these snippets must continue through
`serviceMouse` and current keyboard handlers. Do not attach global listeners in
snippet bodies.

Verification:

```bash
pnpm exec vp test run --project component --config vitest.config.ts test/component/framePages.test.ts test/component/frameOverlaysCommandHooks.test.ts test/component/navbarTabs.test.ts --fileParallelism=false
```

Expected: page navigation, overlay hooks, and keyboard/mouse actions continue
to pass after dashboard snippets are introduced by the owning layout shard.
