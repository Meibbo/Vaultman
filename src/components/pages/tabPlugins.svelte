<script lang="ts">
	import type { VaultmanPlugin } from '../../main';
	import { PluginsExplorerPanel } from '../containers/explorerPlugins';

	let {
		plugin,
		active = false,
	}: {
		plugin: VaultmanPlugin;
		active?: boolean;
	} = $props();

	let panel: PluginsExplorerPanel | undefined;

	$effect(() => {
		if (active && panel) void panel.refresh();
	});

	function initPluginsPanel(el: HTMLElement) {
		panel = new PluginsExplorerPanel(el, plugin);
		panel.load();
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
