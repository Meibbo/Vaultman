<script lang="ts">
	import type { VaultmanPlugin } from '../../main';
	import { PluginsExplorerPanel } from '../containers/explorerPlugins';

	let {
		plugin,
		active = false,
		searchTerm = '',
		panel = $bindable(),
	}: {
		plugin: VaultmanPlugin;
		active?: boolean;
		searchTerm?: string;
		panel?: PluginsExplorerPanel;
	} = $props();

	$effect(() => {
		if (active && panel) void panel.refresh();
	});

	$effect(() => {
		panel?.setSearchTerm(searchTerm);
	});

	function initPluginsPanel(el: HTMLElement) {
		panel = new PluginsExplorerPanel(el, plugin);
		panel.load();
		panel.setSearchTerm(searchTerm);
		return {
			destroy() {
				panel?.unload();
				panel = undefined;
			},
		};
	}
</script>

<div class="vaultman-plugins-tab-content" use:initPluginsPanel></div>

<style>
	.vaultman-plugins-tab-content {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
	}
</style>
