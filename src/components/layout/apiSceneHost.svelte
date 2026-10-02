<script lang="ts">
	import NavbarPanelWidgetHost from './navbarPanelWidgetHost.svelte';
	import type { VaultmanPlugin } from '../../main';
	import type { PluginsExplorerPanel } from '../containers/explorerPlugins';
	import type { SceneConfigPort } from '../../logic/logicSceneConfigPort';
	import type { NavbarPanelWidgetState } from '../../types/typePanelWidget';
	import { translate } from '../../i18n/index';
	import { setIcon } from 'obsidian';
	import { executeObsidianCommand } from '../../utils/obsidianCommands';
	let { plugin, explorer, sceneConfigPort }: {
		plugin: VaultmanPlugin; explorer: PluginsExplorerPanel; sceneConfigPort: SceneConfigPort;
	} = $props();
	let search = $state('');
	let visible = $state(true);
	const providerState = $derived<NavbarPanelWidgetState>({
		providerId: 'sasi', activeTab: 'plugins', pluginsExplorer: explorer,
		actionPort: { async invoke(action) {
			if (action.actionId.startsWith('command:')) {
				executeObsidianCommand(plugin.app, action.actionId.slice('command:'.length));
				return true;
			}
			if (action.actionId !== 'toggle-expansion') return false;
			if (explorer.hasExpandedNodes()) explorer.collapseAll(); else explorer.expandAll();
			return true;
		} },
		icon: (element, name) => { setIcon(element, name); return { update(next) { setIcon(element, next); } }; },
		filtersSearch: search,
		filtersSearchCategory: { files: 0, props: 0, tags: 0 },
		onFiltersSearchChange: (value) => { search = value; explorer.setSearchTerm(value); },
		minimalStyle: true, activeSectionTab: 'plugins',
		tabOptions: [{ id: 'plugins', label: translate('sasi.apiscene.scene'), icon: 'lucide-code' }],
		toolbarShown: visible, onToggleToolbar: () => { visible = !visible; },
		app: plugin.app, sasiRegistry: plugin.sasiRegistry,
		onRunCommand: (id) => executeObsidianCommand(plugin.app, id),
		allowedCellIds: ['caret', 'checkbox', 'icon', 'text', 'state', 'installed', 'updated', 'ctime', 'mtime', 'format'],
		toolbarMenuLayouts: plugin.settings.toolbarMenuLayouts,
		orderCellsByActivation: plugin.settings.orderCellsByActivation,
		selectionCheckboxPosition: plugin.settings.selectionCheckboxPosition,
	});
</script>

<div class="vaultman-api-toolbar">
	<NavbarPanelWidgetHost {providerState} {sceneConfigPort} app={plugin.app} visible={visible}/>
	{#if !visible}<button onclick={() => { visible = true; }}>{translate('viewmenu.toolbar')}</button>{/if}
</div>

<style>
	.vaultman-api-toolbar :global(.vaultman-panel-widget-host) { position: relative; inset: auto; }
</style>
