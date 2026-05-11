<script lang="ts">
	import type { TabConfig } from '../../types/typeTab';
	import { setIcon } from 'obsidian';
	import { translate } from '../../index/i18n/lang';
	import type { LayoutLabelPosition } from '../../services/serviceLayout';

	let {
		tabs,
		active = $bindable(),
		showLabels = false,
		labelPosition = 'side',
		disabledTabIds = [],
		faintTabIds = [],
		externalTabIds = [],
		onSelect,
	}: {
		tabs: TabConfig[];
		active: string;
		showLabels?: boolean;
		labelPosition?: LayoutLabelPosition;
		disabledTabIds?: string[];
		faintTabIds?: string[];
		externalTabIds?: string[];
		onSelect?: (tabId: string) => void;
	} = $props();

	const disabledTabs = $derived(new Set(disabledTabIds));
	const faintTabs = $derived(new Set(faintTabIds));
	const externalTabs = $derived(new Set(externalTabIds));

	function attachIcon(node: HTMLElement, iconName: string): { update: (n: string) => void } {
		setIcon(node, iconName);
		return { update: (n: string) => setIcon(node, n) };
	}

	function selectTab(tabId: string): void {
		if (disabledTabs.has(tabId)) return;
		if (!externalTabs.has(tabId)) active = tabId;
		onSelect?.(tabId);
	}

	function tabLabel(tab: TabConfig): string {
		return tab.label ?? (tab.labelKey ? translate(tab.labelKey) : tab.id);
	}
</script>

<div class={`vm-tab-bar label-${labelPosition}`} class:has-labels={showLabels}>
	{#each tabs as tab (tab.id)}
		{@const disabled = disabledTabs.has(tab.id)}
		{@const external = externalTabs.has(tab.id)}
		{@const label = tabLabel(tab)}
		<div
			class="vm-tab nav-action-button"
			class:is-active={active === tab.id && !external}
			class:is-disabled={disabled}
			class:is-faint={faintTabs.has(tab.id)}
			class:is-external-mounted={external}
			data-tab={tab.id}
			data-external-mounted={external ? 'true' : undefined}
			onclick={() => selectTab(tab.id)}
			onkeydown={(e: KeyboardEvent) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					selectTab(tab.id);
				}
			}}
			aria-label={label}
			aria-disabled={disabled}
			role="tab"
			tabindex={disabled ? -1 : 0}
		>
			<span class="vm-tab-icon" use:attachIcon={tab.icon}></span>
			{#if showLabels}
				<span class="vm-tab-label">{label}</span>
			{/if}
		</div>
	{/each}
</div>
