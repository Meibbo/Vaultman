<script lang="ts">
	import { setIcon } from 'obsidian';
	import type { VaultmanPlugin } from '../../main';
	import ViewList from '../views/viewList.svelte';
	import { ViewService } from '../../services/serviceViews.svelte';
	import {
		createLogicGroup,
		moveFilterNodeWithinParent,
		type GroupDropPosition,
	} from '../../services/serviceGroups';
	import {
		activeFilterDetail,
		activeFilterLabel,
		canReorderActiveFilterEntries,
	} from '../../services/serviceActiveFilterPresentation';
	import type { ActiveFilterEntry, NodeBase } from '../../types/typeContracts';
	import type { ExplorerRenderModel, ViewAction, ViewRow } from '../../types/typeViews';
	import { translate } from '../../index/i18n/lang';

	let {
		plugin,
		onImportBases,
	}: {
		plugin: VaultmanPlugin;
		onClose?: () => void;
		onImportBases?: () => void;
	} = $props();

	const fallbackViewService = new ViewService();
	let model: ExplorerRenderModel<NodeBase> = $state(emptyModel());
	let importExportOpen = $state(false);

	const fileCount = $derived(plugin.filterService.filteredFiles.length);
	const hasItems = $derived(model.rows.length > 0);

	$effect(() => {
		syncItems();
		return plugin.activeFiltersIndex.subscribe(syncItems);
	});

	function icon(el: HTMLElement, name: string) {
		setIcon(el, name);
		return { update: (n: string) => setIcon(el, n) };
	}

	function removeFilter(entry: ActiveFilterEntry) {
		if (entry.kind === 'group') {
			removeFilterGroup(entry);
			return;
		}
		if (entry.source === 'search') {
			const kind = entry.rule.filterType === 'file_name' ? 'name' : 'folder';
			plugin.filterService.clearSearchFilter?.(kind);
			return;
		}
		if (entry.parent?.id === 'selected-files' && entry.rule.filterType === 'file_path') {
			if (removeSelectedFile(entry.rule.values[0])) return;
		}
		if (entry.rule.id && 'deleteFilterRule' in plugin.filterService) {
			(plugin.filterService as { deleteFilterRule(id: string): void }).deleteFilterRule(
				entry.rule.id,
			);
			return;
		}
		plugin.filterService.removeNode(entry.rule);
	}

	function removeFilterGroup(entry: Extract<ActiveFilterEntry, { kind: 'group' }>) {
		if (entry.group.id === 'selected-files' || entry.group.kind === 'selected_files') {
			plugin.filterService.setSelectedFileFilter([]);
			return;
		}
		plugin.filterService.removeNode(entry.group, entry.parent);
	}

	function removeSelectedFile(path: string | undefined): boolean {
		if (!path) return false;
		const remaining = plugin.filterService.selectedFiles.filter(
			(file) => normalizePath(file.path) !== normalizePath(path),
		);
		plugin.filterService.setSelectedFileFilter([...remaining]);
		return true;
	}

	function clearFilters() {
		plugin.filterService.clearFilters();
		plugin.filterService.clearSearchFilter?.();
		importExportOpen = false;
	}

	function addLogicGroup() {
		plugin.filterService.addNode(createLogicGroup());
		importExportOpen = false;
	}

	function toggleImportExport() {
		importExportOpen = !importExportOpen;
	}

	function importBases() {
		importExportOpen = false;
		onImportBases?.();
	}

	function syncItems() {
		model = (plugin.viewService ?? fallbackViewService).getModel({
			explorerId: 'active-filters',
			mode: 'list',
			nodes: [...plugin.activeFiltersIndex.nodes],
			getLabel: (node) => activeFilterLabel(node as ActiveFilterEntry),
			getDetail: (node) => activeFilterDetail(node as ActiveFilterEntry),
			getActions: () => [
				{ id: 'remove', label: translate('filters.remove'), icon: 'lucide-x', tone: 'danger' },
			],
			getDecorationContext: () => ({ kind: 'filter' }),
			capabilities: { canDrag: true, canDrop: true },
		}) as unknown as ExplorerRenderModel<NodeBase>;
	}

	function handleAction(action: ViewAction<NodeBase>, row: ViewRow<NodeBase>) {
		if (action.id === 'remove') removeFilter(row.node as ActiveFilterEntry);
	}

	function handleReorder(request: {
		sourceId: string;
		targetId: string;
		position: GroupDropPosition;
	}) {
		const source = plugin.activeFiltersIndex.byId(request.sourceId);
		const target = plugin.activeFiltersIndex.byId(request.targetId);
		if (!source || !target) return;
		if (
			!canReorderActiveFilterEntries({
				source,
				target,
				root: plugin.filterService.activeFilter,
			})
		)
			return;

		const sourceParent = source.parent ?? plugin.filterService.activeFilter;
		if (
			moveFilterNodeWithinParent(
				sourceParent,
				request.sourceId,
				request.targetId,
				request.position,
			)
		) {
			plugin.filterService.setFilter({ ...plugin.filterService.activeFilter });
		}
	}

	function emptyModel(): ExplorerRenderModel<NodeBase> {
		return {
			explorerId: 'active-filters',
			mode: 'list',
			rows: [],
			columns: [],
			groups: [],
			selection: { ids: new Set() },
			focus: { id: null },
			sort: { id: 'manual', direction: 'asc' },
			search: { query: '' },
			virtualization: { rowHeight: 32, overscan: 5 },
			capabilities: {},
		};
	}

	function normalizePath(path: string): string {
		return path.replaceAll('\\', '/').replace(/^\/+/, '').replace(/\/+$/, '').toLowerCase();
	}
</script>

<div class="vm-explorer-popup-shell">
	<div class="vm-popup-squircles" aria-label={translate('filters.active')}>
		<button
			class="vm-squircle is-accent"
			disabled
			aria-label={translate('filters.popup.templates')}
			use:icon={'lucide-book-marked'}
		></button>
		<div class="vm-import-export-wrap">
			<button
				class="vm-squircle"
				aria-label="Import/export"
				aria-expanded={importExportOpen}
				onclick={toggleImportExport}
				use:icon={'lucide-arrow-down-up'}
			></button>
			{#if importExportOpen}
				<div class="vm-import-export-flyout" role="menu" aria-label="Import/export">
					<button
						type="button"
						class="vm-import-export-flyout-action"
						role="menuitem"
						aria-label="Import Bases filters"
						onclick={importBases}
					>
						<span use:icon={'lucide-download'}></span>
						<span>Import</span>
					</button>
					<button
						type="button"
						class="vm-import-export-flyout-action"
						role="menuitem"
						aria-label="Export filters"
						disabled
					>
						<span use:icon={'lucide-upload'}></span>
						<span>Export</span>
					</button>
				</div>
			{/if}
		</div>
		<button
			class="vm-squircle"
			onclick={addLogicGroup}
			aria-label="Add logic group"
			use:icon={'lucide-list-plus'}
		></button>
		<button
			class="vm-squircle"
			onclick={clearFilters}
			disabled={!hasItems}
			aria-label={translate('filters.popup.clear_all')}
			use:icon={'lucide-eraser'}
		></button>
	</div>

	<div class="vm-explorer-popup">
		<header class="vm-explorer-popup-header">
			<span class="vm-subtitle">
				{model.rows.length}
				{translate('filters.active')} · {fileCount}
				{translate('files.count.short')}
			</span>
		</header>

		{#if !hasItems}
			<div class="vm-explorer-popup-empty">{translate('filters.active.empty')}</div>
		{:else}
			<ViewList {model} {icon} onAction={handleAction} onReorder={handleReorder} />
		{/if}
	</div>
</div>
