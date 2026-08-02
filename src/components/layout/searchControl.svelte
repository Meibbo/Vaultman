<script lang="ts">
	import type { PanelWidgetNode } from '../../types/typePanelWidget';

	let {
		value,
		placeholder,
		ownRow = false,
		trailingActions = [],
		clearLabel = 'Clear search',
		categoryIcon,
		categoryLabel,
		onCycleCategory,
		createIcon,
		createLabel,
		onCreateTarget,
		onValueChange,
		onAction,
		icon,
	}: {
		value: string;
		placeholder: string;
		ownRow?: boolean;
		trailingActions?: readonly PanelWidgetNode[];
		clearLabel?: string;
		categoryIcon?: string;
		categoryLabel?: string;
		onCycleCategory?: () => void;
		createIcon?: string;
		createLabel?: string;
		onCreateTarget?: () => void;
		onValueChange: (value: string) => void;
		onAction?: (action: PanelWidgetNode) => void;
		icon: (el: HTMLElement, name: string) => any;
	} = $props();
</script>

<div
	class="search-input-container vaultman-filters-header-search-pill"
	class:vaultman-filters-header-search-pill--row={ownRow}
	class:vaultman-filters-header-search-pill--inline={!ownRow}
	data-search-own-row={ownRow ? 'true' : undefined}
>
	<input
		class="vaultman-filters-search-input"
		type="search"
		enterkeyhint="search"
		autocomplete="off"
		autocorrect="off"
		autocapitalize="off"
		spellcheck="false"
		{placeholder}
		{value}
		oninput={(event: Event) =>
			onValueChange((event.currentTarget as HTMLInputElement).value)}
	/>
	{#if value}
		<!-- svelte-ignore a11y_interactive_supports_focus -->
		<div
			class="search-input-clear-button"
			aria-label={clearLabel}
			role="button"
			tabindex="0"
			onclick={() => onValueChange('')}
			onkeydown={(event: KeyboardEvent) => {
				if (event.key !== 'Enter' && event.key !== ' ') return;
				event.preventDefault();
				onValueChange('');
			}}
		></div>
	{/if}
	{#if categoryIcon}
		<button
			type="button"
			class="vaultman-filters-search-mode"
			aria-label={categoryLabel}
			use:icon={categoryIcon}
			onclick={() => onCycleCategory?.()}
		></button>
	{/if}
	{#if createIcon}
		<button
			type="button"
			class="vaultman-filters-search-create"
			aria-label={createLabel}
			title={createLabel}
			use:icon={createIcon}
			onclick={() => onCreateTarget?.()}
		></button>
	{/if}
	{#each trailingActions as action (action.id)}
		<button
			type="button"
			class="vaultman-filters-search-trailing-action"
			aria-label={action.label}
			title={action.label}
			disabled={action.available === false}
			use:icon={action.icon}
			onclick={() => onAction?.(action)}
		></button>
	{/each}
</div>
