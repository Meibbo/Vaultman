<script lang="ts">
	import type { PanelWidgetNode } from '../../types/typePanelWidget';

	/**
	 * Where this search field is mounted. The three values are not cosmetic:
	 * the stylesheet dresses each one differently and, in the phone drawer,
	 * hides `--inline` outright because that surface uses its own row. Collapsing
	 * them to a boolean made the phone field render as `--inline` and disappear,
	 * leaving only the row's padding pushing the explorer down.
	 */
	type SearchControlVariant = 'inline' | 'phone' | 'row';

	let {
		value,
		placeholder,
		variant = 'inline',
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
		variant?: SearchControlVariant;
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
	class:vaultman-filters-header-search-pill--row={variant === 'row'}
	class:vaultman-filters-header-search-pill--inline={variant === 'inline'}
	class:vaultman-filters-header-search-pill--phone={variant === 'phone'}
	data-search-own-row={variant === 'row' ? 'true' : undefined}
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
			{#if trailingActions.length > 0}
				{#each trailingActions as action, i (action.id)}
					<button
						type="button"
						class={i === 0
							? 'vaultman-filters-search-mode'
							: 'vaultman-filters-search-create'}
						aria-label={action.label}
						title={action.label}
						class:is-active={action.checked}
						use:icon={action.icon}
						onclick={() => onAction?.(action)}
					></button>
				{/each}
			{:else}
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
			{/if}
		</div>
	{/if}
</div>
