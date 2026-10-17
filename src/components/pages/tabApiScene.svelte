<script lang="ts">
	import { mount, unmount } from 'svelte';
	import type { VaultmanPlugin } from '../../main';
	import { PluginsExplorerPanel } from '../containers/explorerPlugins';
	import ApiSceneHost from '../layout/apiSceneHost.svelte';
	import { createApiSceneConfigPort } from '../../logic/logicApiSceneConfig';
	import { createApiSceneDataSource } from '../../logic/logicApiSceneDataSource';

	import type {
		PanelWidgetHeaderTabOption,
		PanelWidgetHeaderMenuAction,
	} from '../../types/typePanelWidget';

	let {
		plugin,
		active = false,
		searchTerm = '',
		panel = $bindable(),
		tabOptions,
		tabMenuActions,
		activeSectionTab,
		onSectionTabChange,
	}: {
		plugin: VaultmanPlugin;
		active?: boolean;
		searchTerm?: string;
		panel?: PluginsExplorerPanel;
		tabOptions?: PanelWidgetHeaderTabOption[];
		tabMenuActions?: PanelWidgetHeaderMenuAction[];
		activeSectionTab?: string;
		onSectionTabChange?: (tab: string) => void;
	} = $props();

	let toolbarHost: HTMLElement | undefined = $state();
	let disposeToolbar: (() => void) | undefined;

	$effect(() => {
		if (active && panel) void panel.refresh();
	});

	$effect(() => {
		panel?.setSearchTerm(searchTerm);
	});

	function initApiScene(el: HTMLElement) {
		const dataSource = createApiSceneDataSource(plugin);
		panel = new PluginsExplorerPanel(el, plugin, dataSource);
		panel.load();
		panel.setSearchTerm(searchTerm);

		if (toolbarHost) {
			const toolbar = mount(ApiSceneHost, {
				target: toolbarHost,
				props: {
					plugin,
					explorer: panel,
					sceneConfigPort: createApiSceneConfigPort(plugin),
					tabOptions,
					tabMenuActions,
					activeSectionTab,
					onSectionTabChange,
				},
			});
			disposeToolbar = () => unmount(toolbar);
		}

		return {
			destroy() {
				disposeToolbar?.();
				disposeToolbar = undefined;
				panel?.unload();
				panel = undefined;
			},
		};
	}
</script>

<div class="vaultman-sasi-apiscene-tab">
	<div class="vaultman-sasi-apiscene-toolbar" bind:this={toolbarHost}></div>
	<div class="vaultman-sasi-apiscene-content" use:initApiScene></div>
</div>

<style>
	.vaultman-sasi-apiscene-tab {
		display: flex;
		flex-direction: column;
		height: 100%;
		width: 100%;
		overflow: hidden;
	}
	.vaultman-sasi-apiscene-toolbar {
		flex-shrink: 0;
	}
	.vaultman-sasi-apiscene-content {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
	}
</style>
