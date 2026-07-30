---
title: BETA Snippets And Smoke
type: implementation-plan-shard
status: draft
parent: "[[docs/work/polish/plans/2026-05-11-elastic-ui-chameleon/02-beta-engine|beta-engine]]"
created: 2026-05-10T20:20:23
updated: 2026-05-10T20:20:23
tags:
  - agent/plan
  - elastic-ui
  - beta
created_by: codex
updated_by: codex
---

# BETA Snippets And Smoke

## Task B6: Svelte 5 Snippet Contract For Reusable Rows

When splitting row/tile markup, use snippets instead of legacy slots:

```svelte
{#snippet nodeLabel(row: ViewRow<TNode>, display: string)}
	<span class="vm-node-table-primary nav-file-title" data-vm-table-primary>
		{display}
	</span>
{/snippet}

{#snippet nodeCell(row: ViewRow<TNode>, column: ViewColumn<TNode>)}
	{@const display = cellDisplay(row, column)}
	<div class="vm-node-table-cell" role="gridcell" data-vm-table-cell={cellDataId(row, column.id)}>
		{#if column.id === 'label'}
			{@render nodeLabel(row, display)}
		{:else}
			{display}
		{/if}
	</div>
{/snippet}
```

Verification:

```bash
pnpm run check
pnpm exec svelte-check --tsconfig ./tsconfig.json
```

Expected: no Svelte snippet typing errors.

## Task B7: Large Vault Scroll Smoke

Use the existing performance probe after build:

```bash
pnpm run build:plugin
obsidian vault=plugin-dev plugin:reload id=vaultman
obsidian vault=plugin-dev command id=vaultman:open
obsidian vault=plugin-dev eval code="window.__vaultmanPerfProbe.run('tree-scroll',{steps:24}).then(r=>JSON.stringify(r))"
obsidian vault=plugin-dev dev:errors
```

Expected: JSON result is returned, scroll does not freeze, and no Vaultman stack is captured.
