<script lang="ts">
	import type { VaultmanPlugin } from '../../main';
	import { translate } from '../../index/i18n/lang';
	import { TTabs } from '../../types/typeTab'; //, type OpsTab
	import NavbarTabs from '../layout/navbarTabs.svelte';
	import PageToolsOpsLog from './pageToolsOpsLog.svelte';
	import PageToolsLayout from './pageToolsLayout.svelte';
	import TabPlugins from './tabPlugins.svelte';
	import TabSnippets from './tabSnippets.svelte';
	import ViewDiff from '../views/viewDiff.svelte';
	import type { OpsLogService } from '../../services/serviceOpsLog.svelte';
	// import TabLinter from "./tabLinter.svelte";
	// ─── Props ───────────────────────────────────────────────────────────────
	let {
		plugin,
		activeTab = $bindable('layout'),
	}: {
		plugin: VaultmanPlugin;
		icon?: (el: HTMLElement, name: string) => any;
		activeTab?: string;
	} = $props();

	// ─── Tabs definition ─────────────────────────────────────────────────────

	// function openLinter() {
	// 	const selected = getSelectedFiles();
	// 	const targets =
	// 		selected.length > 0 ? selected : plugin.filterService.filteredFiles;
	// 	new LinterModal(plugin.app, plugin.propertyIndex, targets).open();
	// }

</script>

<NavbarTabs tabs={TTabs} bind:active={activeTab} showLabels={true} labelPosition="side" />

<div class="vm-tab-area">
	<!-- File Ops tab (always in DOM so QueueListComponent persists) -->

	<!-- Linter tab (always in DOM) -->
	<!-- <div class="vm-tab-content" class:is-active={Tabs === "linter"}>
		<LinterTab {openLinter} />
	</div> -->

	<!-- Template tab -->
	<div class="vm-tab-content" class:is-active={activeTab === 'template'}>
		<div class="vm-coming-soon">
			{translate('ops.coming_soon')}
		</div>
	</div>

	<!-- Layout tab -->
	<div class="vm-tab-content" class:is-active={activeTab === 'layout'}>
		<PageToolsLayout {plugin} />
	</div>

	<!-- File diff tab -->
	<div class="vm-tab-content" class:is-active={activeTab === 'file_diff'}>
		{#if activeTab === 'file_diff'}
			<ViewDiff
				queueService={plugin.queueService}
				chains={plugin.queueService.chains}
				mode="snapshot-focused"
				themeService={plugin.themeService}
			/>
		{/if}
	</div>

	<!-- Snippets tab -->
	<div class="vm-tab-content" class:is-active={activeTab === 'snippets'}>
		<TabSnippets {plugin} active={activeTab === 'snippets'} />
	</div>

	<!-- Plugins tab -->
	<div class="vm-tab-content" class:is-active={activeTab === 'plugins'}>
		<TabPlugins {plugin} active={activeTab === 'plugins'} />
	</div>

	<!-- Ops log tab -->
	<div class="vm-tab-content" class:is-active={activeTab === 'ops_log'}>
		{#if (plugin as VaultmanPlugin & { opsLogService?: OpsLogService }).opsLogService}
			<PageToolsOpsLog
				opsLog={(plugin as VaultmanPlugin & { opsLogService: OpsLogService }).opsLogService}
			/>
		{/if}
	</div>
</div>
