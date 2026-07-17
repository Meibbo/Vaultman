<script lang="ts">
	import type { VaultmanPlugin } from '../../main';
	import { SnippetsExplorerPanel } from '../containers/explorerSnippets';

	let {
		plugin,
		active = false,
	}: {
		plugin: VaultmanPlugin;
		active?: boolean;
	} = $props();

	let panel: SnippetsExplorerPanel | undefined;

	$effect(() => {
		if (active && panel) void panel.refresh();
	});

	function initSnippetsPanel(el: HTMLElement) {
		panel = new SnippetsExplorerPanel(el, plugin);
		panel.load();
		return {
			destroy() {
				panel?.unload();
				panel = undefined;
			},
		};
	}
</script>

<div class="vaultman-snippets-tab-content" use:initSnippetsPanel></div>

<style>
	.vaultman-snippets-tab-content {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
	}
</style>
