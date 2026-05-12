<script lang="ts" generics="TMeta = unknown">
	import type { TreeNode } from '../../types/typeNode';

	interface Props {
		nodes: TreeNode<TMeta>[];
		selectedIds?: Set<string>;
		focusedId?: string | null;
		onNodeClick: (id: string, e: MouseEvent) => void;
		onSecondaryAction?: (id: string, e: MouseEvent) => void;
		onTertiaryAction?: (id: string, e: MouseEvent | KeyboardEvent) => void;
		onContextMenu: (id: string, e: MouseEvent) => void;
		onNodeKeydown?: (id: string, e: KeyboardEvent) => void;
		icon: (node: HTMLElement, name: string) => { update(n: string): void };
	}

	let {
		nodes,
		selectedIds,
		focusedId,
		onNodeClick,
		onSecondaryAction,
		onTertiaryAction,
		onContextMenu,
		onNodeKeydown,
		icon,
	}: Props = $props();

	function nodeCardClass(node: TreeNode<TMeta>): string {
		return ['vm-markmap-card', node.cls ?? ''].filter(Boolean).join(' ');
	}

	function handleKeydown(node: TreeNode<TMeta>, e: KeyboardEvent): void {
		if (onNodeKeydown) {
			onNodeKeydown(node.id, e);
			return;
		}
		if (e.key === 'Enter') onSecondaryAction?.(node.id, e as unknown as MouseEvent);
	}
</script>

{#snippet branch(node: TreeNode<TMeta>)}
	<div class="vm-markmap-branch" data-vm-markmap-depth={node.depth}>
		<div
			class={nodeCardClass(node)}
			class:is-selected={selectedIds?.has(node.id) ?? false}
			class:is-focused={focusedId === node.id}
			data-vm-markmap-node={node.id}
			role="treeitem"
			tabindex="0"
			aria-selected={selectedIds?.has(node.id) ?? false}
			onclick={(e) => onNodeClick(node.id, e)}
			onauxclick={(e) => onTertiaryAction?.(node.id, e)}
			oncontextmenu={(e) => onContextMenu(node.id, e)}
			onkeydown={(e) => handleKeydown(node, e)}
		>
			{#if node.icon}
				<span class="vm-markmap-icon" use:icon={node.icon}></span>
			{/if}
			<span class="vm-markmap-label">
				{#if node.labelPrefix}<span class="vm-markmap-prefix">{node.labelPrefix}</span>{/if}
				{node.label}
			</span>
			{#if node.countLabel || node.count != null}
				<span class="vm-markmap-count">{node.countLabel ?? node.count}</span>
			{/if}
		</div>
		{#if node.children?.length}
			<div class="vm-markmap-children" role="group">
				{#each node.children as child (child.id)}
					<div
						class="vm-markmap-edge"
						data-vm-markmap-edge={`${node.id}:${child.id}`}
						aria-hidden="true"
					></div>
					{@render branch(child)}
				{/each}
			</div>
		{/if}
	</div>
{/snippet}

<div class="vm-markmap-view" role="tree" aria-multiselectable="true">
	{#each nodes as node (node.id)}
		{@render branch(node)}
	{/each}
</div>

<style>
	.vm-markmap-view {
		--vm-markmap-gap-x: 18px;
		--vm-markmap-gap-y: 8px;
		--vm-markmap-edge: var(--background-modifier-border);
		--vm-markmap-card-bg: color-mix(in srgb, var(--background-secondary) 82%, transparent);
		--vm-markmap-card-border: color-mix(in srgb, var(--background-modifier-border) 72%, transparent);
		box-sizing: border-box;
		display: flex;
		align-items: flex-start;
		gap: var(--vm-markmap-gap-y);
		width: 100%;
		height: 100%;
		min-height: 0;
		overflow: auto;
		padding: 10px;
	}

	.vm-markmap-branch {
		position: relative;
		display: flex;
		align-items: flex-start;
		gap: var(--vm-markmap-gap-x);
		min-width: max-content;
	}

	.vm-markmap-card {
		box-sizing: border-box;
		display: grid;
		grid-template-columns: auto minmax(80px, 1fr) auto;
		align-items: center;
		gap: 6px;
		min-height: 28px;
		max-width: 260px;
		padding: 5px 8px;
		border: 1px solid var(--vm-markmap-card-border);
		border-radius: 8px;
		background: var(--vm-markmap-card-bg);
		color: var(--text-normal);
		outline: none;
	}

	.vm-markmap-card.is-selected {
		border-color: var(--interactive-accent);
		background: color-mix(in srgb, var(--interactive-accent) 14%, var(--background-secondary));
	}

	.vm-markmap-card.is-focused {
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--interactive-accent) 28%, transparent);
	}

	.vm-markmap-icon {
		display: inline-flex;
		width: 16px;
		height: 16px;
		color: var(--text-muted);
	}

	.vm-markmap-label {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 12px;
		line-height: 18px;
	}

	.vm-markmap-prefix {
		margin-right: 4px;
		color: var(--text-faint);
	}

	.vm-markmap-count {
		min-width: 18px;
		padding: 1px 5px;
		border-radius: 999px;
		background: var(--background-modifier-hover);
		color: var(--text-muted);
		font-size: 11px;
		line-height: 15px;
		text-align: center;
	}

	.vm-markmap-children {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: var(--vm-markmap-gap-y);
		padding-left: 12px;
	}

	.vm-markmap-children::before {
		position: absolute;
		top: 14px;
		bottom: 14px;
		left: 0;
		width: 1px;
		background: var(--vm-markmap-edge);
		content: '';
	}

	.vm-markmap-edge {
		position: absolute;
		left: 0;
		width: 12px;
		height: 1px;
		margin-top: 14px;
		background: var(--vm-markmap-edge);
	}
</style>
