<script lang="ts">
	import CellAction from '../cells/cellAction.svelte';
	import type { SasiNode } from '../../services/serviceSasiProvider';

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
		clearLabel = 'Clear search',
		trailingActionIds = [],
		toggleState = {},
		resolve,
		translate,
		onInvoke,
		onValueChange,
		icon,
	}: {
		value: string;
		placeholder: string;
		variant?: SearchControlVariant;
		styleOrder?: number;
		clearLabel?: string;
		/**
		 * U130-05b: el reparto, en orden. Son ids de SASI, no nodos: la identidad
		 * la guarda el registro y la CARA la proyecta el host con `resolve`,
		 * porque el icono de categoria cicla y una def estatica no lo representa.
		 */
		trailingActionIds?: readonly string[];
		/** Solo los toggles publican pulsado; el resto no son toggles. */
		toggleState?: Readonly<Record<string, boolean>>;
		resolve: (id: string) => SasiNode | null;
		translate: (key: string) => string;
		onInvoke?: (id: string) => void;
		onValueChange: (value: string) => void;
		icon: (el: HTMLElement, name: string) => { update(name: string): void };
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
	{#if trailingActionIds.length > 0}
		<div class="input-right-decorator vaultman-filters-search-decorator">
			{#each trailingActionIds as actionId (actionId)}
				<CellAction
					{actionId}
					placement="inline"
					toggle={actionId in toggleState
						? { on: toggleState[actionId] }
						: null}
					{resolve}
					{icon}
					{translate}
					{onInvoke}
				/>
			{/each}
		</div>
	{/if}
</div>
