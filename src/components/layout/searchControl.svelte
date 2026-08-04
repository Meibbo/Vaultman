<script lang="ts">
	import type { PanelWidgetNode } from '../../types/typePanelWidget';

	let {
		value,
		placeholder,
		ownRow = false,
		styleOrder = undefined,
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
		styleOrder?: number;
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
	style:order={styleOrder}
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
	<!-- Core styles `.search-input-container` as `position: relative` only, and
	     positions its trailing controls absolutely over the input. A plain child
	     here is a block box and drops onto its own line, which is what put these
	     cells outside the box. `.input-right-decorator` is the slot Core already
	     ships for exactly this, and Core shifts it aside when the clear button
	     appears, so the controls compose with the clear button instead of
	     fighting it for the same corner. -->
	{#if categoryIcon || createIcon || trailingActions.length > 0}
		<div class="input-right-decorator vaultman-filters-search-decorator">
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
	{/if}
</div>
