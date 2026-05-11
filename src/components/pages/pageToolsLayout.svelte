<script lang="ts">
	import { onMount } from 'svelte';
	import type { VaultmanPlugin } from '../../main';
	import { ALL_TAB_IDS, type TabId } from '../../registry/tabRegistry';
	import type { LeafDetachState } from '../../services/serviceLeafDetach';
	import { MenuCuratorPanel } from '../containers/panelCurator';
	import SettingsLeafToggle from '../settings/settingsLeafToggle.svelte';

	let {
		plugin,
	}: {
		plugin: VaultmanPlugin;
	} = $props();

	const leafDetach = $derived.by(() => plugin.leafDetachService);
	let detachState = $state<LeafDetachState>({});
	let busyTab = $state<TabId | null>(null);

	const mountCurator = (node: HTMLElement) => {
		const panel = new MenuCuratorPanel(node, plugin);
		plugin.addChild(panel);
		return {
			destroy() {
				plugin.removeChild(panel);
			},
		};
	};

	onMount(() => {
		if (!leafDetach?.subscribe) return;
		detachState = leafDetach.getState();
		return leafDetach.subscribe((state) => {
			detachState = state;
		});
	});

	async function toggleTab(tabId: TabId): Promise<void> {
		if (!leafDetach || busyTab) return;
		busyTab = tabId;
		try {
			if (detachState[tabId] === true) {
				await leafDetach.attach(tabId);
			} else {
				await leafDetach.detach(tabId);
			}
			detachState = leafDetach.getState();
		} finally {
			busyTab = null;
		}
	}

	function refreshDetachState(): void {
		if (leafDetach) detachState = leafDetach.getState();
	}
</script>

<div class="vm-page-tools-layout">
	<div class="vm-layout-curator" use:mountCurator></div>

	{#if leafDetach}
		<section class="vm-layout-detach-section" aria-label="Detachable tabs">
			<SettingsLeafToggle {leafDetach} onChange={refreshDetachState} />
			<div class="vm-layout-detach-list">
				{#each ALL_TAB_IDS as tabId (tabId)}
					{@const detached = detachState[tabId] === true}
					<div class="vm-layout-detach-row" data-vm-tab-id={tabId}>
						<span class="vm-layout-detach-name">{tabId}</span>
						<span class="vm-layout-detach-status">{detached ? 'Detached' : 'Attached'}</span>
						<button
							type="button"
							class="vm-layout-detach-action"
							disabled={busyTab === tabId}
							onclick={() => void toggleTab(tabId)}
						>
							{detached ? 'Attach' : 'Detach'}
						</button>
					</div>
				{/each}
			</div>
		</section>
	{/if}
</div>
