<script lang="ts">
	import type { VaultmanPlugin } from "../../main";
	import type { PopupType } from "../../types/typeUI";
	import ActiveFiltersPopup from "./popupFilters.svelte";
	import ScopePopup from "./popupScope.svelte";
	import SearchPopup from "./popupSearch.svelte";
	import MovePopup from "./popupMove.svelte";

	let {
		plugin,
		activePopup,
		popupOpen,
		closePopup,
		// Props for ActiveFilters
		activeFilterRules,
		refreshActiveFiltersPopup,
		updateStats,
		toggleFilterRule,
		deleteFilterRule,
		// Props for Scope
		scopeOptions,
		setScope,
		// Props for Search
		searchName = $bindable(),
		searchFolder = $bindable(),
		// Props for Move
		moveTargetFiles,
		moveTargetFolder = $bindable(),
		movePreviews,
		attachFolderSuggest,
		queueMoves,
		icon,
	}: {
		plugin: VaultmanPlugin;
		activePopup: PopupType | null;
		popupOpen: boolean;
		closePopup: () => void;
		activeFilterRules: any[];
		refreshActiveFiltersPopup: () => void;
		updateStats: () => void;
		toggleFilterRule: (rule: any) => void;
		deleteFilterRule: (rule: any) => void;
		scopeOptions: any[];
		setScope: (val: string) => void;
		searchName: string;
		searchFolder: string;
		moveTargetFiles: any[];
		moveTargetFolder: string;
		movePreviews: any[];
		attachFolderSuggest: (node: HTMLElement) => any;
		queueMoves: () => void;
		icon: (node: HTMLElement, name: string) => any;
	} = $props();
</script>

<div
	class="vaultman-popup-overlay"
	class:is-hidden={activePopup === null}
	class:is-open={popupOpen}
	onclick={(e: MouseEvent) => {
		if (e.target === e.currentTarget) closePopup();
	}}
	onkeydown={(e: KeyboardEvent) => {
		if (e.key === "Escape") closePopup();
	}}
	role="dialog"
	aria-modal="true"
	tabindex="-1"
>
	<div class="vaultman-popup-content">
		{#if activePopup === "active-filters"}
			<ActiveFiltersPopup
				{plugin}
				{activeFilterRules}
				{refreshActiveFiltersPopup}
				{updateStats}
				{closePopup}
				{toggleFilterRule}
				{deleteFilterRule}
				{icon}
			/>
		{:else if activePopup === "scope"}
			<ScopePopup
				{plugin}
				{scopeOptions}
				{setScope}
				{closePopup}
				{icon}
			/>
		{:else if activePopup === "search"}
			<SearchPopup
				bind:searchName
				bind:searchFolder
				{closePopup}
				{icon}
			/>
		{:else if activePopup === "move"}
			<MovePopup
				{moveTargetFiles}
				bind:moveTargetFolder
				{movePreviews}
				{attachFolderSuggest}
				{queueMoves}
				{closePopup}
				{icon}
			/>
		{/if}
	</div>
</div>
