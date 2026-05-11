<script lang="ts">
	import type { VaultmanPlugin } from '../../main';
	import { translate } from '../../index/i18n/lang';
	import { TTabs } from '../../types/typeTab'; //, type OpsTab
	import NavbarTabs from '../layout/navbarTabs.svelte';
	import PageToolsOpsLog from './pageToolsOpsLog.svelte';
	import PageToolsLayout from './pageToolsLayout.svelte';
	import TabPlugins from './tabPlugins.svelte';
	import TabSnippets from './tabSnippets.svelte';
	import type { OpsLogService } from '../../services/serviceOpsLog.svelte';
	// import TabLinter from "./tabLinter.svelte";
	// ─── Props ───────────────────────────────────────────────────────────────
	let {
		plugin,
	}: {
		plugin: VaultmanPlugin;
		icon?: (el: HTMLElement, name: string) => any;
	} = $props();

	// ─── State ───────────────────────────────────────────────────────────────
	let opsTab = $state<string>('layout');

	// ─── Tabs definition ─────────────────────────────────────────────────────

	// function openLinter() {
	// 	const selected = getSelectedFiles();
	// 	const targets =
	// 		selected.length > 0 ? selected : plugin.filterService.filteredFiles;
	// 	new LinterModal(plugin.app, plugin.propertyIndex, targets).open();
	// }

</script>

<NavbarTabs tabs={TTabs} bind:active={opsTab} showLabels={true} labelPosition="side" />

<div class="vm-tab-area">
	<!-- File Ops tab (always in DOM so QueueListComponent persists) -->

	<!-- Linter tab (always in DOM) -->
	<!-- <div class="vm-tab-content" class:is-active={Tabs === "linter"}>
		<LinterTab {openLinter} />
	</div> -->

	<!-- Template tab -->
	<div class="vm-tab-content" class:is-active={opsTab === 'template'}>
		<div class="vm-coming-soon">
			{translate('ops.coming_soon')}
		</div>
	</div>

	<!-- Layout tab -->
	<div class="vm-tab-content" class:is-active={opsTab === 'layout'}>
		<PageToolsLayout {plugin} />
	</div>

	<!-- Snippets tab -->
	<div class="vm-tab-content" class:is-active={opsTab === 'snippets'}>
		<TabSnippets {plugin} active={opsTab === 'snippets'} />
	</div>

	<!-- Plugins tab -->
	<div class="vm-tab-content" class:is-active={opsTab === 'plugins'}>
		<TabPlugins {plugin} active={opsTab === 'plugins'} />
	</div>

	<!-- Ops log tab -->
	<div class="vm-tab-content" class:is-active={opsTab === 'ops_log'}>
		{#if (plugin as VaultmanPlugin & { opsLogService?: OpsLogService }).opsLogService}
			<PageToolsOpsLog
				opsLog={(plugin as VaultmanPlugin & { opsLogService: OpsLogService }).opsLogService}
			/>
		{/if}
	</div>
</div>
