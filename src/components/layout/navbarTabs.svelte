<script lang="ts">
	import { translate } from '../../i18n/index';

	type FiltersTab = 'files' | 'props' | 'tags' | 'content';

	const TAB_ICONS: Record<FiltersTab, string> = {
		files: 'lucide-folder',
		tags: 'lucide-tag',
		props: 'lucide-archive',
		content: 'lucide-file-search',
	};
	const FILTER_TABS: FiltersTab[] = ['files', 'props', 'tags', 'content'];

	let {
		activeTab,
		showLabels = false,
		minimalStyle = false,
		onTabChange,
		icon,
	}: {
		activeTab: FiltersTab;
		showLabels?: boolean;
		minimalStyle?: boolean;
		onTabChange: (tab: FiltersTab) => void;
		icon: (node: HTMLElement, name: string) => { update(n: string): void };
	} = $props();
</script>

<div
	class="vaultman-tab-bar"
	class:has-labels={showLabels}
	class:vaultman-tab-bar--minimal={minimalStyle}
	class:workspace-tab-header-container={minimalStyle}
>
	<div
		class="vaultman-tab-bar-inner"
		class:workspace-tab-header-container-inner={minimalStyle}
	>
		{#each FILTER_TABS as tab (tab)}
			<div
				class="vaultman-tab workspace-tab-header tappable"
				class:is-active={activeTab === tab}
				onclick={() => onTabChange(tab)}
				onkeydown={(e: KeyboardEvent) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						onTabChange(tab);
					}
				}}
				aria-label={translate('filter.tab.' + tab)}
				role="tab"
				tabindex="0"
			>
				<div
					class="vaultman-tab-inner"
					class:workspace-tab-header-inner={minimalStyle}
				>
					<span
						class="vaultman-tab-icon"
						class:workspace-tab-header-inner-icon={minimalStyle}
						use:icon={TAB_ICONS[tab]}
					></span>
					{#if showLabels}
						<span
							class="vaultman-tab-label"
							class:workspace-tab-header-inner-title={minimalStyle}
							>{translate('filter.tab.' + tab)}</span
						>
					{/if}
				</div>
			</div>
		{/each}
	</div>
</div>
