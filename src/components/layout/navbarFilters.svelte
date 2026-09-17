<script lang="ts">
	import { Menu, Notice, TFile } from 'obsidian';
	import { onMount, tick, untrack } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { translate } from '../../i18n/index';
	import SortPopup from './popupSort.svelte';
	import ViewModePopup from './popupView.svelte';
	import SearchControl from './searchControl.svelte';
	import BarTransaction from './barTransaction.svelte';
	import {
		SEARCH_CATEGORY_ICONS,
		searchCellFace,
		searchCellIds,
		searchCellToggleState,
		type SearchCellContext,
	} from '../../logic/logicSearchCellProjection';
	import {
		SEARCH_CREATE_TARGET_ID,
		SEARCH_CYCLE_CATEGORY_ID,
	} from '../../logic/logicSasiSearchActions';
	import { createSasiInvoker } from '../../logic/logicSasiInvoke';
	import type { SasiNode } from '../../services/serviceSasiProvider';
	import type {
		ExplorerTabId,
		ExplorerSortState,
		ExplorerViewMode,
	} from '../../types/typeUI';
	import type { SavedLayout, SavedViewConfig } from '../../types/typeSettings';
	import { showInputModal } from '../../utils/inputModal';
	import { openAddonIconPicker } from '../../modals/modalAddonIconPicker';
	import {
		nextExplorerSortDirection,
		sortDirectionGlyph,
	} from '../../logic/logicSort';
	import {
		activeScopeSort,
		levelScope,
		normalizeExplorerSortState,
		parentOfScope,
		replaceActiveScopeSort,
		sameExplorerSortState,
		storageScope,
	} from '../../logic/logicScopedSort';
	import {
		isHierarchicalViewMode,
		isViewModeSelectableForDataSurface,
		normalizeExplorerViewMode,
		panelViewModeForDataSurface,
		viewModesForDataSurface,
	} from '../../logic/logicExplorerViewModes';
	import {
		DEFAULT_INTERACTION_MODE,
		interactionModesForTab,
		normalizeInteractionMode,
		type InteractionMode,
	} from '../../logic/logicInteractionMode';
	import {
		shouldHideTabLabelForSearch,
		shouldShowMinimalSearchInput,
		toolbarUsesHorizontalScroll,
		type ToolbarOverflowStrategy,
	} from '../../logic/logicResponsiveLayout';
	import {
		nodeTypeFilterPatch,
		nodeTypeFiltersForState,
		toggleNodeTypeFilter,
	} from '../../logic/logicNodeTypeFilters';
	import { expansionActionAvailable } from '../../logic/logicTreeExpansion';
	import { shouldFaintRevealNode } from '../../logic/logicRevealFaint';
	import {
		byLevelModel,
		groupMenuModel,
		nextGroupPreset,
		NODE_TYPE_MENU_OPTIONS,
		scopeMenuModel,
		SORT_MENU_OPTIONS,
		supportsByLevel,
		visibleSortOptions,
		type NodeTypeMenuOption,
		type ScopeMenuScene,
	} from '../../logic/logicSortMenu';
	import type { GroupPresetKind } from '../../types/typeGroupPreset';
	import type { ToolbarMenuKind } from '../../logic/logicToolbarMenuCatalog';
	import {
		projectToolbarMenu,
		type ToolbarMenuNode,
	} from '../../logic/logicToolbarMenuProjection';
	import {
		noteGroupMemberIdsFromMemberships,
		parseFrontmatterNoteGroups,
		scopeToNoteGroupTarget,
		writeNoteGroups,
	} from '../../logic/logicNoteGroups';
	import {
		cellIcon,
		cellLabelKey,
		cellMenuOrder,
		cellsForExplorer,
		defaultVisibleCells,
		isIdentityCell,
		normalizeVisibleCellIds,
	} from '../../logic/logicCellRegistry';
	import {
		resolvePanelWidgetProjection,
		resolveToolbarHiddenIds,
	} from '../../logic/logicPanelWidgetProjection';
	import {
		resolveCondensedPanelWidgetOverflow,
		searchNeedsOwnRow,
	} from '../../logic/logicPanelWidgetOverflow';
	import { measureSceneSync } from '../../logic/logicScenePerformance';
	import {
		applyLayoutToPort,
		captureSavedViewConfig,
		sceneFacetsOf,
		type SceneConfigPort,
		type SceneFacets,
	} from '../../logic/logicSceneConfigPort';
	import type { SceneConfig } from '../../types/typeInstance';
	import type { GroupPreset } from '../../types/typeGroupPreset';
	import type {
		NavbarPanelWidgetState,
		PanelWidgetExpandableExplorerPort,
		PanelWidgetExplorerPort,
		PanelWidgetFilesExplorerPort,
		PanelWidgetHeaderMenuAction,
		PanelWidgetNode,
		PanelWidgetTreeExplorerPort,
	} from '../../types/typePanelWidget';

	type FiltersTab = ExplorerTabId;
	type HeaderMenuAction = PanelWidgetHeaderMenuAction;
	type NavbarRendererState = NavbarPanelWidgetState & {
		sceneConfigPort: SceneConfigPort;
		fileList?: PanelWidgetFilesExplorerPort;
		propExplorer?: PanelWidgetTreeExplorerPort;
		tagsExplorer?: PanelWidgetTreeExplorerPort | null;
		snippetsExplorer?: PanelWidgetExplorerPort;
		pluginsExplorer?: PanelWidgetExplorerPort;
	};
	type HeaderMode = 'header' | 'sort' | 'viewmode';
	type SearchControlVariant = 'inline' | 'phone' | 'row';
	type NativeMenuValue = {
		readonly title: string;
		readonly icon?: string;
		readonly checked?: boolean;
		readonly disabled?: boolean;
		readonly onClick?: () => void;
	};
	type NativeMenuNode = ToolbarMenuNode<NativeMenuValue>;

	function nativeMenuItem(
		id: string,
		value: NativeMenuValue,
		children?: readonly NativeMenuNode[],
		anchor?: { readonly id: string; readonly placement: 'before' | 'after' },
	): NativeMenuNode {
		return {
			kind: 'item',
			item: {
				id,
				value,
				...(children ? { children } : {}),
				...(anchor ? { anchor } : {}),
			},
		};
	}

	function nativeMenuDivider(id: string): NativeMenuNode {
		return { kind: 'divider', id };
	}

	function nativeMenuNever(value: never): never {
		throw new Error(`Unknown native menu node: ${String(value)}`);
	}

	function renderNativeMenuNodes(
		menu: Menu,
		nodes: readonly NativeMenuNode[],
	): void {
		for (const node of nodes) {
			switch (node.kind) {
				case 'divider':
					menu.addSeparator();
					break;
				case 'item':
					menu.addItem((item) => {
						item.setTitle(node.item.value.title);
						if (node.item.value.icon) item.setIcon(node.item.value.icon);
						if (node.item.value.checked !== undefined) {
							item.setChecked(node.item.value.checked);
						}
						if (node.item.value.disabled !== undefined) {
							item.setDisabled(node.item.value.disabled);
						}
						if (node.item.children) {
							const submenu = (
								item as typeof item & { setSubmenu: () => Menu }
							).setSubmenu();
							renderNativeMenuNodes(submenu, node.item.children);
						}
						if (node.item.value.onClick) {
							item.onClick(node.item.value.onClick);
						}
					});
					break;
				default:
					return nativeMenuNever(node);
			}
		}
	}

	function projectNativeMenu(
		kind: ToolbarMenuKind,
		nodes: readonly NativeMenuNode[],
		inlineGroups: readonly string[] = [],
	): readonly NativeMenuNode[] {
		return projectToolbarMenu(
			kind,
			toolbarMenuLayouts?.[kind],
			nodes,
			inlineGroups,
			(_id, label) => ({
				title: label,
				icon: 'lucide-chevron-right',
			}),
		);
	}
	let {
		activeTab,
		providerId = activeTab,
		actionPort,
		filtersSearch = $bindable(''),
		filtersSearchCategory = $bindable({ tags: 0, props: 0, files: 0 }),
		searchExpanded = false,
		onSearchExpandedChange,
		searchMoveToggles = null,
		sasiRegistry = undefined,
		sasiMoveHandlers = undefined,
		transactionBar = undefined,
		tagsExplorer,
		propExplorer,
		fileList,
		snippetsExplorer,
		pluginsExplorer,
		icon,
		addOpCount = 0,
		minimalStyle = true,
		showDock = false,
		tabOptions = [],
		tabMenuActions = [],
		headerActions = [],
		revealActive = false,
		activeFilePath = null,
		activeSectionTab = activeTab,
		onSectionTabChange,
		onFiltersSearchChange,
		onFiltersSearchCategoryChange,
		onViewFiltersChanged,
		onPersistInteractionMode,
		onContentSearch,
		showExplorerControls = true,
		expansionRevision = 0,
		floatingTocEnabled = false,
		onToggleFloatingToc,
		toolbarToolsMenu = false,
		toolbarOverflowStrategy = 'condensed' as ToolbarOverflowStrategy,
		frameWidth = 0,
		onToggleToolbar,
		toolbarShown = true,
		autoRevealGlobal = false,
		savedLayouts = [],
		onSaveLayout,
		onLayoutLoaded,
		app,
		showTabLabels = true,
		sortLevelInline = true,
		orderCellsByActivation = false,
		toolbarMenuLayouts,
		commandActions = [],
		createActionsPlacement = 'searchbox',
		pvpuiConfig = {},
		sceneConfigPort,
	}: NavbarRendererState = $props();

	function invokeSceneAction(
		actionId: string,
		origin: 'pointer' | 'keyboard' | 'menu',
		event?: MouseEvent,
	): void {
		void actionPort.invoke({
			actionId,
			origin,
			payload: event ? { event } : undefined,
		});
	}

	async function promptSaveLayout() {
		if (!app) return;
		const name = await showInputModal(app, translate('viewmenu.save_layout'));
		if (name) saveLayout(name);
	}

	const currentCreateIcon = $derived(
		activeTab === 'files'
			? filtersSearchCategory.files === 1
				? 'lucide-folder-plus'
				: 'lucide-file-plus'
			: activeTab === 'tags'
				? 'lucide-tag'
				: 'lucide-plus',
	);
	const canCreateSearchTarget = $derived(
		// BT5-022: with Create moved to the toolbar, the Files searchbox no longer
		// carries its own create button; Props and Tags keep theirs.
		(activeTab === 'files' && createActionsPlacement !== 'toolbar') ||
			activeTab === 'props' ||
			activeTab === 'tags',
	);

	const searchCellContext = $derived<SearchCellContext>({
		tab: activeTab,
		categoryIndex: filtersSearchCategory[activeTab] ?? 0,
		canCreate: canCreateSearchTarget,
		createIcon: currentCreateIcon,
		moveToggles: searchMoveToggles ?? null,
	});
	const trailingActionIds = $derived(searchCellIds(searchCellContext));
	const trailingToggleState = $derived(
		searchCellToggleState(searchCellContext),
	);

	/**
	 * U130-05b: la identidad viene de SASI; la CARA, de la proyeccion. El icono
	 * de categoria cicla, asi que una def estatica no puede representarlo --
	 * `resolve(id)` es lo que el host proyecta de esa accion ahora mismo.
	 *
	 * La caida al registro cubre a los ids que no son del searchbox (el toggle
	 * de la barra transaccional), que se resuelven por identidad pura.
	 */
	function resolveSearchCell(id: string): SasiNode | null {
		const face = searchCellFace(id, searchCellContext);
		if (face) return face;
		const resolved = sasiRegistry?.resolve(id);
		if (!resolved?.available || !resolved.def) return null;
		const { id: defId, labelKey, icon: defIcon, kind } = resolved.def;
		return {
			id: defId,
			labelKey,
			...(defIcon ? { icon: defIcon } : {}),
			...(kind ? { kind } : {}),
		};
	}

	/**
	 * U130-01: el invoker es POR SUPERFICIE. Congela su mapa de handlers al
	 * crearse, y los dos del searchbox viven AQUI (tocan `filtersSearchCategory`
	 * y `filtersSearch`, que son estado de este componente), mientras que los
	 * del move mode los inyecta el host desde el explorer activo. Como
	 * `$derived`, se rehace al cambiar de pestana.
	 */
	const invokeSearchCell = $derived(
		sasiRegistry
			? createSasiInvoker(sasiRegistry, {
					...(sasiMoveHandlers ?? {}),
					[SEARCH_CYCLE_CATEGORY_ID]: async () => {
						cycleSearchCategory();
					},
					[SEARCH_CREATE_TARGET_ID]: async () => {
						createSearchTarget();
					},
				})
			: null,
	);

	function runSearchCell(id: string): void {
		if (!invokeSearchCell) {
			// Un host que monta el searchbox sin pasar el registro deja celdas
			// que se pintan y no hacen nada. Callarlo es peor que el fallo: un
			// boton muerto sin explicacion se descubre tarde y no se atribuye.
			new Notice(`SASI: sin registro en esta superficie: ${id}`);
			return;
		}
		// El rechazo del invoker --id no registrado, falta handler, operation sin
		// confirmar-- es deliberado y explicito: se muestra, no se traga.
		void invokeSearchCell(id, {}).catch((error: unknown) => {
			new Notice(String(error instanceof Error ? error.message : error));
		});
	}

	const DEFAULT_SORT_STATE: Record<FiltersTab, ExplorerSortState> = {
		props: normalizeExplorerSortState('props', null),
		tags: normalizeExplorerSortState('tags', null),
		files: normalizeExplorerSortState('files', null),
		snippets: normalizeExplorerSortState('snippets', null),
		plugins: normalizeExplorerSortState('plugins', null),
	};
	let headerMode = $state<HeaderMode>('header');
	let headerExitDir = $state<'left' | 'right'>('right');
	const TABS: FiltersTab[] = ['props', 'tags', 'files', 'snippets', 'plugins'];
	let configByTab = $state<Record<FiltersTab, Required<SceneConfig>>>(
		Object.fromEntries(
			TABS.map((tab) => [tab, sceneConfigPort.read(tab)]),
		) as Record<FiltersTab, Required<SceneConfig>>,
	);
	const viewModeByTab = $derived(
		Object.fromEntries(
			TABS.map((tab) => [tab, configByTab[tab].viewMode]),
		) as Record<FiltersTab, ExplorerViewMode>,
	);
	const interactionModeByTab = $derived(
		Object.fromEntries(
			TABS.map((tab) => [tab, configByTab[tab].interactionMode]),
		) as Record<FiltersTab, InteractionMode>,
	);
	const visibleCellsByTab = $derived(
		Object.fromEntries(
			TABS.map((tab) => [tab, configByTab[tab].visibleCells]),
		) as Record<FiltersTab, string[]>,
	);
	const sortStateByTab = $derived(
		Object.fromEntries(
			TABS.map((tab) => [tab, configByTab[tab].sortState]),
		) as Record<FiltersTab, ExplorerSortState>,
	);
	function commitConfig(
		tab: FiltersTab,
		patch: Partial<Required<SceneConfig>>,
	): void {
		const next = { ...configByTab[tab], ...patch };
		configByTab = { ...configByTab, [tab]: next };
		void sceneConfigPort.propose(tab, next);
	}
	const appliedSortStateByTab: Record<FiltersTab, ExplorerSortState> = {
		props: { ...DEFAULT_SORT_STATE.props },
		tags: { ...DEFAULT_SORT_STATE.tags },
		files: { ...DEFAULT_SORT_STATE.files },
		snippets: { ...DEFAULT_SORT_STATE.snippets },
		plugins: { ...DEFAULT_SORT_STATE.plugins },
	};
	const LAYOUT_TABS: FiltersTab[] = [
		'files',
		'props',
		'tags',
		'snippets',
		'plugins',
	];
	// A short, caveman-ish summary of what each explorer holds in this layout.
	function buildLayoutSummary(): string {
		return LAYOUT_TABS.map((tab) => {
			const sort = normalizeSortState(
				tab,
				sortStateByTab[tab] ?? DEFAULT_SORT_STATE[tab],
			);
			const activeSort = activeScopeSort(tab, sort);
			const arrow = sortDirectionGlyph(activeSort.direction);
			return `${tab} ${viewModeByTab[tab]}·${activeSort.sortBy}${arrow}`;
		}).join(' · ');
	}
	/**
	 * U130-09 (dev 2026-09-15): «el layout-config deberia servir para
	 * inmortalizar un layout-state del cual forman parte los grupos». The
	 * photo per tab carries the WHOLE `SceneConfig` of the scene (copies), so
	 * saving twice under the same name replaces the entry with a photo that
	 * still carries the groups instead of dropping them (U130-09 census, row 9).
	 */
	function saveLayout(name: string) {
		const trimmed = name.trim();
		if (!trimmed) return;
		const config: Record<string, SavedViewConfig> = {};
		for (const tab of LAYOUT_TABS) {
			const sortState = normalizeSortState(
				tab,
				sortStateByTab[tab] ?? DEFAULT_SORT_STATE[tab],
			);
			config[tab] = captureSavedViewConfig({
				...configByTab[tab],
				viewMode: viewModeByTab[tab],
				visibleCells: [...(visibleCellsByTab[tab] ?? [])],
				interactionMode: interactionModeByTab[tab],
				sortState,
			});
		}
		onSaveLayout?.({ name: trimmed, summary: buildLayoutSummary(), config });
	}
	function explorerPortForTab(tab: FiltersTab): PanelWidgetExplorerPort | null {
		if (tab === 'files') return fileList ?? null;
		if (tab === 'props') return propExplorer ?? null;
		if (tab === 'tags') return tagsExplorer ?? null;
		if (tab === 'snippets') return snippetsExplorer ?? null;
		if (tab === 'plugins') return pluginsExplorer ?? null;
		return null;
	}

	/**
	 * A07b-1: puerto de expansion de los explorers de addons. Los panels
	 * implementan `hasExpandedNodes`/`expandAll`/`collapseAll`/
	 * `setExpansionChangeHandler` (B-groups2), pero el puerto base declarado
	 * en el estado aun no los incluye; la guarda runtime evita un crash si un
	 * puerto no los trae, en vez de suprimir el tipo.
	 */
	function addonExpansionPort(
		tab: 'snippets' | 'plugins',
	): PanelWidgetExpandableExplorerPort | null {
		const port: unknown =
			tab === 'snippets' ? snippetsExplorer : pluginsExplorer;
		if (
			!!port &&
			typeof port === 'object' &&
			'hasExpandedNodes' in port &&
			'setExpansionChangeHandler' in port
		) {
			return port as PanelWidgetExpandableExplorerPort;
		}
		return null;
	}

	/**
	 * U130-09: activating a layout COPIES its photo into this instance's
	 * scenes (groups included); the layout stays a photo, never a live
	 * reference. What the photo does not carry keeps its current value.
	 */
	function loadLayout(layout: SavedLayout) {
		const nextView = { ...viewModeByTab };
		const nextCells = { ...visibleCellsByTab };
		const nextSort = { ...sortStateByTab };
		const nextInteraction = { ...interactionModeByTab };
		const nextFacets: Partial<Record<FiltersTab, SceneFacets>> = {};
		const nextConfigByTab = { ...configByTab };
		for (const tab of LAYOUT_TABS) {
			const saved = layout.config[tab];
			if (!saved) continue;
			// BT5-016: legacy saved 'grid' loads as Cards.
			nextView[tab] = normalizeExplorerViewMode(saved.viewMode, tab);
			nextCells[tab] = normalizeVisibleCellIds(
				tab,
				saved.visibleCells,
				nextView[tab],
			);
			nextSort[tab] = normalizeSortState(tab, saved.sortState);
			nextInteraction[tab] = normalizeInteractionMode(
				tab,
				saved.interactionMode,
			);
			nextFacets[tab] = sceneFacetsOf(saved);
			nextConfigByTab[tab] = {
				...nextConfigByTab[tab],
				viewMode: nextView[tab],
				interactionMode: nextInteraction[tab],
				visibleCells: nextCells[tab],
				sortState: nextSort[tab],
				...nextFacets[tab],
			};
		}
		configByTab = nextConfigByTab;
		void applyLayoutToPort(sceneConfigPort, {
			viewModeByTab: nextView,
			interactionModeByTab: nextInteraction,
			visibleCellsByTab: nextCells,
			sortStateByTab: nextSort,
			sceneFacetsByTab: nextFacets,
		});
		for (const tab of LAYOUT_TABS) {
			applyTabProjection(tab, {
				viewMode: nextView[tab],
				visibleCells: nextCells[tab],
				sortState: nextSort[tab],
				interactionMode: nextInteraction[tab],
				...nextFacets[tab],
			});
		}
		onLayoutLoaded?.(layout);
	}
	/**
	 * Spec 08 §3.2.2 / U130-09: the custom groups of this scene are the keys of
	 * `configByTab[tab].groupMemberships`. No layout is consulted: the layout
	 * is a photo that `loadLayout` copied into the scene, not the owner.
	 */
	function customGroupsForMenu(
		tab: FiltersTab,
	): { id: string; label: string; hidden: boolean }[] {
		const memberships = configByTab[tab].groupMemberships;
		const hidden = new Set(configByTab[tab].hiddenGroupIds);
		return Object.keys(memberships).map((id) => ({
			id,
			label: id,
			hidden: hidden.has(id),
		}));
	}
	/** Spec 08 §4 `hide`: per instance, reversible; the group survives in the layout. */
	function setGroupHidden(tab: FiltersTab, id: string, hidden: boolean) {
		const current = configByTab[tab].hiddenGroupIds;
		const next = hidden
			? current.includes(id)
				? current
				: [...current, id]
			: current.filter((entry) => entry !== id);
		commitConfig(tab, { hiddenGroupIds: next });
		applyHiddenGroupIds(tab, next);
	}
	/**
	 * Spec 08 §4 `delete` (D6 as amended by the dev on 2026-09-15): removes the
	 * group from THIS scene of THIS instance. A layout that photographed it
	 * keeps its copy; other instances keep theirs.
	 */
	function deleteCustomGroup(tab: FiltersTab, id: string) {
		const { [id]: _removed, ...rest } = configByTab[tab].groupMemberships;
		commitConfig(tab, { groupMemberships: rest });
		applyGroupMemberships(tab, rest);
		setGroupHidden(tab, id, false);
	}
	function setGroupPresetFor(tab: FiltersTab, next: GroupPreset) {
		commitConfig(tab, { groupPreset: next });
		applyGroupPreset(tab, next);
	}
	function selectGroupPreset(tab: FiltersTab, kind: GroupPresetKind) {
		setGroupPresetFor(tab, nextGroupPreset(configByTab[tab].groupPreset, kind));
	}
	/**
	 * Spec 08 §3.2.2 `New group` / §3.3 `Create group with selected`. U130-09
	 * (dev 2026-09-15, revoking plan 08 D5): a custom group is a key of THIS
	 * scene's `groupMemberships`, so it needs no layout — the layout is what
	 * later immortalises the state the group is part of. The id is the name
	 * and is unique per scene, not per instance: `Foo` in Tags does not block
	 * `Foo` in Files. The created group is selected right away
	 * (`kind: 'custom'`), which is what makes it visible.
	 */
	async function createCustomGroup(
		tab: FiltersTab,
		urns: readonly string[] = [],
	): Promise<void> {
		if (!app) return;
		const name = (
			await showInputModal(app, translate('group.new.prompt'))
		)?.trim();
		if (!name) return;
		const noteMode =
			revealActive &&
			(tab === 'props' || tab === 'tags') &&
			configByTab[tab].groupPreset.kind === 'note';
		if (noteMode) {
			const state = sortStateByTab[tab] ?? DEFAULT_SORT_STATE[tab];
			const path =
				state.revealAnchor === 'pinned'
					? state.revealAnchorPath
					: activeFilePath;
			const file = path ? app.vault.getFileByPath(path) : null;
			if (!(file instanceof TFile)) {
				new Notice(translate('group.note.no_file'));
				return;
			}
			const target =
				scopeToNoteGroupTarget(state.activeScope, state.drillNodeId) ??
				{ kind: 'level', level: 1 };
			const scene = tab === 'props' ? 'prop' : 'tag';
			const current = parseFrontmatterNoteGroups(
				(app.metadataCache.getFileCache(file)?.frontmatter ?? {}) as Record<string, unknown>,
				scene,
				target,
			);
			if (current.groups.some((group) => group.id === name)) {
				new Notice(translate('group.note.duplicate'));
				return;
			}
			const members = noteGroupMemberIdsFromMemberships(urns, scene, target);
			const result = await writeNoteGroups({
				app,
				file,
				scene,
				target,
				groups: [
					...current.groups.map((group) => ({
						name: group.id,
						members: current.memberships[group.id] ?? [],
					})),
					{ name, members },
				],
			});
			if (!result.ok) return;
			return;
		}
		const memberships = configByTab[tab].groupMemberships;
		if (name in memberships) return;
		const next = { ...memberships, [name]: [...urns] };
		commitConfig(tab, { groupMemberships: next });
		applyGroupMemberships(tab, next);
		setGroupPresetFor(tab, { kind: 'custom', direction: 'asc' });
	}
	/** U130-09: `New group` only needs a host that can open the name prompt. */
	function canCreateGroup(): boolean {
		return Boolean(app);
	}
	let navbarEl = $state<HTMLElement | null>(null);
	let actionsEl = $state<HTMLElement | null>(null);
	let measuredOverflowIds = $state<string[]>([]);
	/**
	 * U121-029: raised by the first measurement that had a real width to work
	 * with. Until then the pre-measurement heuristic decides, so the bar never
	 * paints one frame of overflowing nodes on mount.
	 */
	let overflowMeasured = $state(false);
	/**
	 * U121-029: raised when the expanded search field cannot share the action
	 * row, so it renders as a second row under the toolbar. Measured, and
	 * deliberately independent of the overflow strategy.
	 */
	let searchOwnsRow = $state(false);
	let overflowFrame = 0;
	/**
	 * Keyed by LOCAL node id, not by the projected `provider:local` id. Node ids
	 * are namespaced per provider, so a provider switch used to invalidate every
	 * measured width at once: the bar read 0 for everything, expanded fully, then
	 * condensed again on the next frame. Widths belong to the node, not to the
	 * provider that projected it.
	 */
	const measuredNodeWidths = new SvelteMap<string, number>();
	const measuredWidthKey = (nodeId: string): string =>
		nodeId.slice(nodeId.indexOf(':') + 1);
	/**
	 * U121-029: the width the packer may spend is the width of the line, taken
	 * from the row's containing block — not `actionsEl.clientWidth`.
	 *
	 * A theme owns our actions container the moment we opt into
	 * `nav-buttons-container` (Velocity collapses it to `width: 48px; height: 0`
	 * and reveals it on `.nav-header:hover`). Measuring the container therefore
	 * fed the packer a themed 48px, it condensed down to its two-node minimum,
	 * and our own `overflow: hidden` clipped whatever the hover then revealed.
	 * The parent's content box is the honest budget: our container is `width:
	 * 100%` of it, and a theme resizing the container cannot lie about it.
	 */
	function availableToolbarWidth(actions: HTMLElement): number {
		const own = actions.clientWidth;
		const parent = actions.parentElement;
		if (!parent) return own;
		const style = window.getComputedStyle(parent);
		const inner =
			parent.clientWidth -
			(Number.parseFloat(style.paddingInlineStart) || 0) -
			(Number.parseFloat(style.paddingInlineEnd) || 0);
		return Math.max(own, inner);
	}
	let drillPickCleanup: (() => void) | null = null;
	let revealPickCleanup: (() => void) | null = null;
	let expansionRefresh = $state(0);
	const headerActionClass = $derived(
		minimalStyle ? 'clickable-icon nav-action-button' : 'vaultman-nav-fab',
	);
	const hasExpandedNodes = $derived.by(() => {
		void expansionRevision;
		void expansionRefresh;
		void filtersSearch;
		void filtersSearchCategory[activeTab];
		if (activeTab === 'files') return fileList?.hasExpandedNodes() ?? false;
		if (activeTab === 'props') return propExplorer?.hasExpandedNodes() ?? false;
		if (activeTab === 'tags') return tagsExplorer?.hasExpandedNodes() ?? false;
		// A07b-1: los explorers de addons exponen la maquinaria de expansion
		// (B-groups2), pero el puerto base aun no la declara: guarda runtime
		// en vez de estrechar el tipo (el integrador debe ensanchar
		// `NavbarPanelWidgetState` a `PanelWidgetExpandableExplorerPort`).
		if (activeTab === 'snippets')
			return addonExpansionPort('snippets')?.hasExpandedNodes() ?? false;
		if (activeTab === 'plugins')
			return addonExpansionPort('plugins')?.hasExpandedNodes() ?? false;
		return false;
	});
	const expansionActionAvailableForActiveTab = $derived(
		expansionActionAvailable(
			activeTab,
			visibleCellsByTab[activeTab] ??
				defaultVisibleCells(activeTab, viewModeByTab[activeTab]),
			// U130-t33 (L-PNODE): un grupo es un p-node plegable aunque la
			// anidacion este apagada — sin este flag el toggle queda muerto en
			// ese caso exacto, el que el dev senalo. Spec 08 §3.1.bis: la
			// agrupacion es el preset seleccionado, no el scope de orden.
			configByTab[activeTab].groupPreset.kind !== 'none',
		),
	);
	/**
	 * Toolbar reveal faint: the reveal icon is the node's whole body, so when
	 * the current file sits outside a `filtered` scene's list the icon wears
	 * faint instead of pretending a press would land. Computed here because
	 * the scene sort state is already reactive in this layer; the explorers
	 * only answer membership through `isPathListed`.
	 */
	const filesRevealFaint = $derived(
		shouldFaintRevealNode({
			filtered: sortStateByTab.files?.filtered === true,
			currentPath: activeFilePath,
			isListed:
				activeFilePath == null
					? true
					: (fileList?.isPathListed?.(activeFilePath) ?? true),
			toggleActive: false,
		}),
	);
	const headerRevealFaint = $derived(
		activeTab === 'props' || activeTab === 'tags'
			? shouldFaintRevealNode({
					filtered: sortStateByTab[activeTab]?.filtered === true,
					currentPath: activeFilePath,
					isListed:
						activeFilePath == null
							? true
							: ((activeTab === 'props'
									? propExplorer
									: tagsExplorer
								)?.isPathListed?.(activeFilePath) ?? true),
					toggleActive: revealActive ?? false,
				})
			: false,
	);
	const REVEAL_HEADER_ACTION_IDS = new Set([
		'props.reveal-this-file',
		'tags.reveal-this-file',
	]);
	const expansionLabel = $derived(
		hasExpandedNodes
			? translate('filter.collapse_all')
			: translate('filter.expand_all'),
	);
	const expansionIcon = $derived(
		hasExpandedNodes ? 'lucide-chevrons-down-up' : 'lucide-chevrons-up-down',
	);
	const currentTabsOption = $derived(
		tabOptions.find((option) => option.id === activeSectionTab) ??
			tabOptions[0] ??
			null,
	);
	const currentTabsIcon = $derived(
		currentTabsOption?.icon ?? 'lucide-panels-top-left',
	);
	const currentTabsLabel = $derived(
		currentTabsOption
			? `${translate('filter.tabs_btn')}: ${currentTabsOption.label}`
			: translate('filter.tabs_btn'),
	);
	// TODO(refactor): remove this pre-scene bridge once the sandbox header owns
	// tab labels and responsive sacrifices as one layout contract.
	const tabLabelIntended = $derived(
		minimalStyle && currentTabsOption !== null && showTabLabels !== false,
	);
	const tabLabelYieldsToSearch = $derived(
		shouldHideTabLabelForSearch({ frameWidth, minimalStyle, searchExpanded }),
	);
	const showTabsButtonLabel = $derived(
		tabLabelIntended && !tabLabelYieldsToSearch,
	);
	// U130 toolbar alt-cmenu: override per-instance del label del scene_menu
	// (nodo `tabs`), leído de la scene activa. Solo afecta al pintado; la
	// heurística de layout (tabLabelIntended/tabLabelYieldsToSearch) sigue
	// derivada del espacio real.
	const tabsButtonLabelEffective = $derived(
		configByTab[activeTab]?.sceneLabelMode === 'on'
			? true
			: configByTab[activeTab]?.sceneLabelMode === 'off'
				? false
				: showTabsButtonLabel,
	);
	const panelWidgetNodeId = (localId: string): string =>
		`${providerId}:${localId}`;
	// U130 change-icon: override per-instance del icono de un nodo (alt-cmenu
	// "Change icon"). Ausencia de clave = icono de serie.
	const panelWidgetNodeIcon = (localId: string, fallback: string): string =>
		configByTab[activeTab]?.toolbarNodeIcons?.[localId] ?? fallback;
	const panelWidgetNodes = $derived.by<PanelWidgetNode[]>(() => {
		const nodes: PanelWidgetNode[] = [];
		const append = (
			localId: string,
			label: string,
			iconName: string,
			presentation: PanelWidgetNode['presentation'] = 'button',
			condensable = true,
			available = true,
			order?: number,
		) => {
			nodes.push({
				id: panelWidgetNodeId(localId),
				nodeKind: 'action',
				cellKind: 'action',
				presentation,
				label,
				icon: panelWidgetNodeIcon(localId, iconName),
				order: order ?? nodes.length,
				available,
				condensable,
				action: { id: localId },
			});
		};

		if (minimalStyle && tabOptions.length > 0) {
			append('tabs', currentTabsLabel, currentTabsIcon, 'tabs', false);
		}
		for (const action of headerActions) {
			nodes.push({
				id: panelWidgetNodeId(`header:${action.id}`),
				nodeKind: 'action',
				cellKind: 'action',
				presentation: 'button',
				label: action.label,
				icon: panelWidgetNodeIcon(`header:${action.id}`, action.icon),
				order: action.order ?? 0,
				available: !action.disabled,
				checked: action.checked,
				action: { id: `header:${action.id}` },
				condensable: false,
			});
		}
		if (!showExplorerControls) return nodes;

		append(
			'view',
			translate('filter.viewmode_btn'),
			'lucide-layout-list',
			'menu',
		);
		append(
			'sort',
			translate('filter.sort_btn'),
			'lucide-arrow-up-down',
			'menu',
		);
		append(
			'search',
			translate('explorer.btn.search'),
			'lucide-search',
			'search',
			false,
			true,
			10,
		);
		if (activeTab === 'files') {
			append(
				'reveal-active-file',
				translate('filter.auto_reveal'),
				'lucide-gallery-vertical',
				'button',
				true,
				true,
				20,
			);
		}
		if (expansionActionAvailableForActiveTab) {
			append(
				'toggle-expansion',
				expansionLabel,
				expansionIcon,
				'toggle',
				true,
				true,
				30,
			);
		}
		if (activeTab === 'files' && createActionsPlacement === 'toolbar') {
			append(
				'create-file',
				translate('folder.ctx.new_note'),
				'lucide-file-plus',
				'button',
				true,
				true,
				40,
			);
			append(
				'create-folder',
				translate('folder.ctx.new_folder'),
				'lucide-folder-plus',
				'button',
				true,
				true,
				41,
			);
		}
		for (const command of commandActions) {
			append(
				`command:${command.id}`,
				command.label,
				command.icon ?? 'lucide-terminal',
				'button',
				true,
				command.available,
				50,
			);
		}
		return nodes.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
	});
	// U130 toolbar alt-cmenu: los nodos ocultos per-instance de la scene se
	// suman a los globales de pvpui ANTES de la proyección, así el orden, la
	// medición y el overflow condensed los ignoran igual que a los ocultos
	// por el usuario. Sin esto, un nodo oculto seguiría ocupando medida.
	const effectivePvpuiConfig = $derived({
		...pvpuiConfig,
		hiddenNodeIds: resolveToolbarHiddenIds(
			pvpuiConfig.hiddenNodeIds,
			configByTab[activeTab]?.hiddenToolbarNodes,
			providerId,
		),
	});
	const panelWidgetProjection = $derived(
		resolvePanelWidgetProjection({
			providerId,
			nodes: panelWidgetNodes,
			config: effectivePvpuiConfig,
		}),
	);
	const forcedOverflowIds = $derived.by(() => {
		if (
			!minimalStyle ||
			toolbarOverflowStrategy !== 'condensed' ||
			!toolbarToolsMenu ||
			// U121-029: once the bar has actually been measured, the measurement is
			// the answer. The count heuristic below hides at least two nodes no
			// matter how wide the frame is, so leaving it in charge made the
			// measured pipeline dead code and over-condensed a roomy toolbar.
			overflowMeasured
		) {
			return measuredOverflowIds;
		}
		const candidates = panelWidgetProjection.nodes.filter(
			(node) => node.condensable !== false,
		);
		const minimumVisible = tabLabelIntended ? 3 : 4;
		const hiddenCount = Math.min(
			candidates.length,
			Math.max(2, panelWidgetProjection.nodes.length - minimumVisible),
		);
		return candidates.slice(-hiddenCount).map((node) => node.id);
	});
	const toolbarNodeVisible = (localId: string): boolean =>
		panelWidgetProjection.nodes.some(
			(node) => node.id === panelWidgetNodeId(localId),
		) &&
		(toolbarOverflowStrategy !== 'condensed' ||
			!forcedOverflowIds.includes(panelWidgetNodeId(localId)));
	const panelWidgetNodeOrder = (localId: string): number =>
		panelWidgetProjection.nodes.findIndex(
			(node) => node.id === panelWidgetNodeId(localId),
		);
	const compactPanelWidgetTools = $derived(
		toolbarOverflowStrategy === 'condensed' && forcedOverflowIds.length > 0,
	);
	// BT5-021: in scroll mode the action bar is one horizontally scrollable line
	// with an overflow hint, instead of moving nodes into the Tools menu.
	const toolbarScroll = $derived(
		minimalStyle && toolbarUsesHorizontalScroll(toolbarOverflowStrategy),
	);
	const toolbarWrap = $derived(
		minimalStyle && toolbarOverflowStrategy === 'wrap',
	);
	const showSearchInput = $derived(
		activeSectionTab !== 'content' &&
			shouldShowMinimalSearchInput({
				frameWidth,
				minimalStyle,
				searchExpanded,
				tabLabelVisible: showTabsButtonLabel,
			}),
	);

	function measurePanelWidgetOverflow(): void {
		overflowFrame = 0;
		if (!actionsEl || !minimalStyle) {
			if (measuredOverflowIds.length > 0) measuredOverflowIds = [];
			overflowMeasured = false;
			searchOwnsRow = false;
			return;
		}

		// U121-029: an unmeasurable bar keeps what it already shows. A page
		// mid-slide, a hidden toolbar (`height: 0`), a collapsed sidebar or a
		// still-deferred mobile drawer all report 0 here, and recomputing from 0
		// condensed the whole bar into Tools for a frame — the flicker the dev
		// sees when switching provider quickly.
		const availableWidth = availableToolbarWidth(actionsEl);
		if (availableWidth <= 0) return;

		const elements = actionsEl.querySelectorAll<HTMLElement>(
			'[data-panel-widget-node-id]',
		);
		for (const element of elements) {
			const id = element.dataset.panelWidgetNodeId;
			if (!id || element.hidden) continue;
			const width = element.getBoundingClientRect().width;
			if (width > 0) measuredNodeWidths.set(measuredWidthKey(id), width);
		}

		const style = window.getComputedStyle(actionsEl);
		const gap = Number.parseFloat(style.columnGap || style.gap || '0') || 0;
		const toolsMeasure = actionsEl.querySelector<HTMLElement>(
			'[data-panel-widget-tools-measure]',
		);
		const toolsWidth = toolsMeasure?.getBoundingClientRect().width ?? 0;

		// The second-row decision runs for every overflow strategy — the action
		// row belongs to the nodes, and the field only shares it when what is left
		// is still a usable field.
		if (showSearchInput) {
			const barNodeWidths = panelWidgetProjection.nodes.map(
				(node) =>
					measuredNodeWidths.get(measuredWidthKey(node.id)) || toolsWidth,
			);
			const nextSearchOwnsRow = searchNeedsOwnRow({
				availableWidth,
				nodeWidths: barNodeWidths,
				gap,
				// Search must move before any action becomes an overflow victim.
				// The Tools button is therefore not part of this pre-pack budget.
				toolsWidth: 0,
			});
			if (nextSearchOwnsRow !== searchOwnsRow) {
				searchOwnsRow = nextSearchOwnsRow;
				window.requestAnimationFrame(focusVisibleSearchInput);
			}
		} else if (searchOwnsRow) {
			searchOwnsRow = false;
		}

		if (toolbarOverflowStrategy !== 'condensed') {
			if (measuredOverflowIds.length > 0) measuredOverflowIds = [];
			overflowMeasured = false;
			return;
		}
		const measuredNodes = panelWidgetProjection.nodes.map((node) => ({
			id: node.id,
			// Only projected action nodes are measured. The auxiliary search field
			// has no node id, so Search always contributes its button width here.
			width: measuredNodeWidths.get(measuredWidthKey(node.id)) ?? 0,
			condensable: node.condensable,
		}));
		// Every node reporting 0 means nothing has been laid out yet (a provider
		// projected on its first frame). Packing that would answer "it all fits",
		// which is the other half of the flicker.
		if (measuredNodes.every((node) => node.width <= 0)) return;
		const result = resolveCondensedPanelWidgetOverflow({
			availableWidth,
			nodes: measuredNodes,
			gap,
			toolsWidth,
		});
		overflowMeasured = true;
		const signature = result.overflowIds.join('\u0000');
		if (signature !== measuredOverflowIds.join('\u0000')) {
			measuredOverflowIds = result.overflowIds;
		}
	}

	function schedulePanelWidgetOverflowMeasure(): void {
		if (overflowFrame !== 0) return;
		overflowFrame = window.requestAnimationFrame(measurePanelWidgetOverflow);
	}

	onMount(() => {
		const resizeObserver = new ResizeObserver(
			schedulePanelWidgetOverflowMeasure,
		);
		const mutationObserver = new MutationObserver(
			schedulePanelWidgetOverflowMeasure,
		);
		if (navbarEl) resizeObserver.observe(navbarEl);
		if (actionsEl) {
			resizeObserver.observe(actionsEl);
			mutationObserver.observe(actionsEl, {
				childList: true,
				subtree: true,
			});
		}
		schedulePanelWidgetOverflowMeasure();
		return () => {
			if (overflowFrame !== 0) window.cancelAnimationFrame(overflowFrame);
			resizeObserver.disconnect();
			mutationObserver.disconnect();
		};
	});

	$effect(() => {
		void panelWidgetProjection;
		void tabsButtonLabelEffective;
		void searchExpanded;
		void showSearchInput;
		void toolbarOverflowStrategy;
		schedulePanelWidgetOverflowMeasure();
	});

	function menuEventFromElement(element: HTMLElement): MouseEvent {
		const rect = element.getBoundingClientRect();
		return new MouseEvent('click', {
			bubbles: true,
			cancelable: true,
			clientX: rect.left + rect.width / 2,
			clientY: rect.bottom,
			view: window,
		});
	}

	function openSortPopup(event?: MouseEvent) {
		if (minimalStyle && event) {
			openNativeSortMenu(event);
			return;
		}
		headerExitDir = 'right';
		headerMode = 'sort';
	}
	function openViewModePopup(event?: MouseEvent) {
		if (minimalStyle && event) {
			openNativeViewMenu(event);
			return;
		}
		headerExitDir = 'left';
		headerMode = 'viewmode';
	}
	function openScenePopup(event: MouseEvent) {
		if (!tabOptions.length) return;
		openNativeSceneMenu(event);
	}
	function closeHeaderPopup() {
		headerMode = 'header';
	}

	function cycleSearchCategory() {
		const tab = activeTab;
		const count = SEARCH_CATEGORY_ICONS[tab].length;
		const next = {
			...filtersSearchCategory,
			[tab]: ((filtersSearchCategory[tab] ?? 0) + 1) % Math.max(1, count),
		};
		if (onFiltersSearchCategoryChange) {
			onFiltersSearchCategoryChange(next);
			return;
		}
		filtersSearchCategory = next;
	}

	function setFiltersSearch(value: string) {
		if (onFiltersSearchChange) {
			onFiltersSearchChange(value);
			return;
		}
		filtersSearch = value;
	}

	function setSearchExpanded(expanded: boolean): void {
		searchExpanded = expanded;
		onSearchExpandedChange?.(expanded);
	}

	function expandSearch() {
		setSearchExpanded(true);
		window.requestAnimationFrame(() => focusVisibleSearchInput());
	}

	function toggleSearch() {
		if (!minimalStyle || !searchExpanded) {
			expandSearch();
			return;
		}
		setSearchExpanded(false);
		blurSearchInputs();
	}

	function searchInputs() {
		return Array.from(
			(navbarEl ?? document).querySelectorAll<HTMLInputElement>(
				'.vaultman-filters-search-input',
			),
		);
	}

	function focusVisibleSearchInput() {
		const input = searchInputs().find((candidate) => candidate.offsetParent);
		input?.focus();
	}

	function blurSearchInputs() {
		for (const input of searchInputs()) input.blur();
	}

	function createSearchTarget() {
		const tab = activeTab;
		if (tab === 'files') {
			void fileList?.createFromSearch(
				filtersSearchCategory.files ?? 0,
				filtersSearch,
			);
			return;
		}
		if (tab === 'props') {
			propExplorer?.createFromSearch(
				filtersSearch,
				filtersSearchCategory.props ?? 0,
			);
			return;
		}
		if (tab === 'tags') tagsExplorer?.createFromSearch(filtersSearch);
	}

	function applySortState(tab: FiltersTab, state: ExplorerSortState) {
		const normalizedState = normalizeSortState(tab, state, true);
		if (!sameSortState(state, normalizedState)) {
			commitConfig(tab, { sortState: normalizedState });
		}
		appliedSortStateByTab[tab] = normalizedState;
		if (tab === 'files') fileList?.setSortState(normalizedState);
		if (tab === 'props') {
			propExplorer?.setSortState(normalizedState);
		}
		if (tab === 'tags') {
			tagsExplorer?.setSortState(normalizedState);
		}
		if (tab === 'snippets') snippetsExplorer?.setSortState(normalizedState);
		if (tab === 'plugins') pluginsExplorer?.setSortState(normalizedState);
	}

	function applyViewMode(tab: FiltersTab, mode: ExplorerViewMode) {
		const effectiveMode = panelViewModeForDataSurface(tab, mode);
		if (tab === 'files') {
			fileList?.setViewMode(
				effectiveMode === 'table'
					? 'table'
					: effectiveMode === 'grid'
						? 'grid'
						: 'tree',
			);
		}
		if (tab === 'props') propExplorer?.setViewMode(effectiveMode);
		if (tab === 'tags') tagsExplorer?.setViewMode(effectiveMode);
		if (tab === 'snippets') snippetsExplorer?.setViewMode(effectiveMode);
		if (tab === 'plugins') pluginsExplorer?.setViewMode(effectiveMode);
	}

	function applyVisibleCells(tab: FiltersTab, cells: string[]) {
		const cellSet = new Set(cells);
		if (tab === 'files') fileList?.setVisibleCells(cellSet);
		if (tab === 'props') propExplorer?.setVisibleCells(cellSet);
		if (tab === 'tags') tagsExplorer?.setVisibleCells(cellSet);
		if (tab === 'snippets') snippetsExplorer?.setVisibleCells(cellSet);
		if (tab === 'plugins') pluginsExplorer?.setVisibleCells(cellSet);
	}

	function applyInteractionMode(tab: FiltersTab, mode: InteractionMode) {
		const normalized = normalizeInteractionMode(tab, mode);
		if (tab === 'files') fileList?.setInteractionMode(normalized);
		if (tab === 'props') {
			propExplorer?.setInteractionMode(normalized, onContentSearch);
		}
		if (tab === 'tags') {
			tagsExplorer?.setInteractionMode(normalized, onContentSearch);
		}
		if (tab === 'snippets') snippetsExplorer?.setInteractionMode?.(normalized);
		if (tab === 'plugins') pluginsExplorer?.setInteractionMode?.(normalized);
	}

	function selectInteractionMode(tab: FiltersTab, mode: InteractionMode) {
		const normalized = normalizeInteractionMode(tab, mode);
		// La config de ESTA instancia sigue yendo por el port.
		commitConfig(tab, { interactionMode: normalized });
		// El defecto del usuario es global: se publica, no se escribe aqui.
		onPersistInteractionMode?.(tab, normalized);
		applyInteractionMode(tab, normalized);
		onViewFiltersChanged?.();
	}

	function applyTabProjection(
		tab: FiltersTab,
		config: {
			viewMode: ExplorerViewMode;
			visibleCells: string[];
			sortState: ExplorerSortState;
			interactionMode?: InteractionMode;
			stickyRows?: boolean;
			compactFolders?: boolean;
			indent?: boolean;
			groupPreset?: GroupPreset;
			hiddenGroupIds?: readonly string[];
			/** U130-09: the custom groups of this scene (`SceneConfig.groupMemberships`). */
			groupMemberships?: Readonly<Record<string, readonly string[]>>;
		},
	) {
		const effectiveMode = panelViewModeForDataSurface(tab, config.viewMode);
		const widgetMode: 'tree' | 'grid' | 'table' =
			effectiveMode === 'table'
				? 'table'
				: effectiveMode === 'grid'
					? 'grid'
					: 'tree';
		const cellSet = new Set(config.visibleCells);

		if (tab === 'files' && fileList) {
			const normalizedState = normalizeSortState(tab, config.sortState, true);
			if (!sameSortState(config.sortState, normalizedState)) {
				commitConfig(tab, { sortState: normalizedState });
			}
			appliedSortStateByTab[tab] = normalizedState;
			if (fileList.configurePanelWidgetProjection) {
				fileList.configurePanelWidgetProjection({
					viewMode: widgetMode,
					visibleCells: cellSet,
					sortState: normalizedState,
					...(config.interactionMode
						? { interactionMode: config.interactionMode }
						: {}),
					...(config.stickyRows !== undefined
						? { stickyRows: config.stickyRows }
						: {}),
					...(config.compactFolders !== undefined
						? { compactFolders: config.compactFolders }
						: {}),
					...(config.indent !== undefined ? { indent: config.indent } : {}),
					...(config.groupPreset ? { groupPreset: config.groupPreset } : {}),
					...(config.hiddenGroupIds
						? { hiddenGroupIds: config.hiddenGroupIds }
						: {}),
					...(config.groupMemberships
						? { groupMemberships: config.groupMemberships }
						: {}),
				});
			} else {
				applyViewMode(tab, config.viewMode);
				applyVisibleCells(tab, config.visibleCells);
				applySortState(tab, normalizedState);
				if (config.interactionMode)
					applyInteractionMode(tab, config.interactionMode);
				if (config.stickyRows !== undefined)
					applyStickyRows(tab, config.stickyRows);
				if (config.compactFolders !== undefined)
					applyCompactFolders(tab, config.compactFolders);
				if (config.indent !== undefined) applyIndent(tab, config.indent);
				if (config.groupPreset) applyGroupPreset(tab, config.groupPreset);
				if (config.hiddenGroupIds)
					applyHiddenGroupIds(tab, config.hiddenGroupIds);
				if (config.groupMemberships)
					applyGroupMemberships(tab, config.groupMemberships);
			}
			return;
		}

		if (tab === 'props' && propExplorer) {
			if (propExplorer.configurePanelWidgetProjection) {
				propExplorer.configurePanelWidgetProjection({
					viewMode: widgetMode,
					visibleCells: cellSet,
					sortState: config.sortState,
					...(config.interactionMode
						? { interactionMode: config.interactionMode }
						: {}),
					...(config.stickyRows !== undefined
						? { stickyRows: config.stickyRows }
						: {}),
					...(config.indent !== undefined ? { indent: config.indent } : {}),
					...(config.groupPreset ? { groupPreset: config.groupPreset } : {}),
					...(config.hiddenGroupIds
						? { hiddenGroupIds: config.hiddenGroupIds }
						: {}),
					...(config.groupMemberships
						? { groupMemberships: config.groupMemberships }
						: {}),
				});
			} else {
				applyViewMode(tab, config.viewMode);
				applyVisibleCells(tab, config.visibleCells);
				applySortState(tab, config.sortState);
				if (config.interactionMode)
					applyInteractionMode(tab, config.interactionMode);
				if (config.stickyRows !== undefined)
					applyStickyRows(tab, config.stickyRows);
				if (config.indent !== undefined) applyIndent(tab, config.indent);
				if (config.groupPreset) applyGroupPreset(tab, config.groupPreset);
				if (config.hiddenGroupIds)
					applyHiddenGroupIds(tab, config.hiddenGroupIds);
				if (config.groupMemberships)
					applyGroupMemberships(tab, config.groupMemberships);
			}
			return;
		}

		if (tab === 'tags' && tagsExplorer) {
			if (tagsExplorer.configurePanelWidgetProjection) {
				tagsExplorer.configurePanelWidgetProjection({
					viewMode: widgetMode,
					visibleCells: cellSet,
					sortState: config.sortState,
					...(config.interactionMode
						? { interactionMode: config.interactionMode }
						: {}),
					...(config.stickyRows !== undefined
						? { stickyRows: config.stickyRows }
						: {}),
					...(config.indent !== undefined ? { indent: config.indent } : {}),
					...(config.groupPreset ? { groupPreset: config.groupPreset } : {}),
					...(config.hiddenGroupIds
						? { hiddenGroupIds: config.hiddenGroupIds }
						: {}),
					...(config.groupMemberships
						? { groupMemberships: config.groupMemberships }
						: {}),
				});
			} else {
				applyViewMode(tab, config.viewMode);
				applyVisibleCells(tab, config.visibleCells);
				applySortState(tab, config.sortState);
				if (config.interactionMode)
					applyInteractionMode(tab, config.interactionMode);
				if (config.stickyRows !== undefined)
					applyStickyRows(tab, config.stickyRows);
				if (config.indent !== undefined) applyIndent(tab, config.indent);
				if (config.groupPreset) applyGroupPreset(tab, config.groupPreset);
				if (config.hiddenGroupIds)
					applyHiddenGroupIds(tab, config.hiddenGroupIds);
				if (config.groupMemberships)
					applyGroupMemberships(tab, config.groupMemberships);
			}
			return;
		}

		if (tab === 'snippets' && snippetsExplorer) {
			applyViewMode(tab, config.viewMode);
			applyVisibleCells(tab, config.visibleCells);
			applySortState(tab, config.sortState);
			// A07b-2: sin interactionMode el modo `select` persistido no
			// llega al explorer en el re-montaje y la creacion de grupos
			// queda inalcanzable hasta re-conmutar a mano. Sin indent se
			// pierde la paridad de B-groups2 en el mismo camino.
			if (config.interactionMode)
				applyInteractionMode(tab, config.interactionMode);
			if (config.indent !== undefined) applyIndent(tab, config.indent);
			if (config.groupPreset) applyGroupPreset(tab, config.groupPreset);
			if (config.hiddenGroupIds)
				applyHiddenGroupIds(tab, config.hiddenGroupIds);
			if (config.groupMemberships)
				applyGroupMemberships(tab, config.groupMemberships);
			return;
		}

		if (tab === 'plugins' && pluginsExplorer) {
			applyViewMode(tab, config.viewMode);
			applyVisibleCells(tab, config.visibleCells);
			applySortState(tab, config.sortState);
			// A07b-2: igual que snippets (ver arriba).
			if (config.interactionMode)
				applyInteractionMode(tab, config.interactionMode);
			if (config.indent !== undefined) applyIndent(tab, config.indent);
			if (config.groupPreset) applyGroupPreset(tab, config.groupPreset);
			if (config.hiddenGroupIds)
				applyHiddenGroupIds(tab, config.hiddenGroupIds);
			if (config.groupMemberships)
				applyGroupMemberships(tab, config.groupMemberships);
			return;
		}
	}

	function handleSortChange(state: ExplorerSortState) {
		measureSceneSync(
			`scene.action.change-sort.${activeTab}`,
			{ operations: 1 },
			() => {
				const normalizedState = normalizeSortState(activeTab, state);
				commitConfig(activeTab, { sortState: normalizedState });
				applySortState(activeTab, normalizedState);
				onViewFiltersChanged?.();
			},
		);
	}

	function handleScopeChangeForTab(tab: FiltersTab, state: ExplorerSortState) {
		const normalizedState = normalizeSortState(tab, state);
		commitConfig(tab, { sortState: normalizedState });
		onViewFiltersChanged?.();
	}

	function handleScopeChange(state: ExplorerSortState) {
		handleScopeChangeForTab(activeTab, state);
	}

	function handleFilterChange(state: ExplorerSortState) {
		const normalizedState = normalizeSortState(activeTab, state);
		const appliedState = appliedSortStateByTab[activeTab];
		commitConfig(activeTab, { sortState: normalizedState });
		applySortState(activeTab, {
			...normalizedState,
			sorts: appliedState.sorts,
			activeScope: appliedState.activeScope,
			drillNodeId: appliedState.drillNodeId,
			parentsFirst: appliedState.parentsFirst,
		});
		onViewFiltersChanged?.();
	}

	function sameSortState(
		left: ExplorerSortState,
		right: ExplorerSortState,
	): boolean {
		return sameExplorerSortState(left, right);
	}

	function handleExternalFilesSortState(state: ExplorerSortState) {
		const normalizedState = normalizeSortState('files', state);
		if (sameSortState(appliedSortStateByTab.files, normalizedState)) return;
		appliedSortStateByTab.files = normalizedState;
		const currentByTab = untrack(() => ({
			...sortStateByTab,
			files: normalizeSortState(
				'files',
				sortStateByTab.files ?? DEFAULT_SORT_STATE.files,
			),
		}));
		if (sameSortState(currentByTab.files, normalizedState)) return;
		commitConfig('files', { sortState: normalizedState });
	}

	function handleExternalTagsSortState(state: ExplorerSortState) {
		const normalizedState = normalizeSortState('tags', state);
		if (sameSortState(appliedSortStateByTab.tags, normalizedState)) return;
		appliedSortStateByTab.tags = normalizedState;
		const currentByTab = untrack(() => ({
			...sortStateByTab,
			tags: normalizeSortState(
				'tags',
				sortStateByTab.tags ?? DEFAULT_SORT_STATE.tags,
			),
		}));
		if (sameSortState(currentByTab.tags, normalizedState)) return;
		commitConfig('tags', { sortState: normalizedState });
	}

	function handleViewModeChange(mode: ExplorerViewMode) {
		setSceneEngine(activeTab, mode);
	}

	/**
	 * U130: comando SASI — cambia el engine de una instancia de escena a una
	 * de sus opciones disponibles. Es el mismo camino que el submenu `engines`
	 * (commit por el port + aplicacion inmediata), pero con tab explicito en
	 * vez del tab activo. Devuelve false si la opcion no es seleccionable en
	 * esa superficie; true si queda aplicada o ya estaba activa.
	 */
	export function setSceneEngine(
		tab: FiltersTab,
		mode: ExplorerViewMode,
	): boolean {
		if (!isViewModeSelectableForDataSurface(tab, mode)) return false;
		if ((configByTab[tab]?.viewMode ?? 'tree') === mode) return true;
		commitConfig(tab, { viewMode: mode });
		applyViewMode(tab, mode);
		return true;
	}

	function handlePillsChange(cells: string[]) {
		measureSceneSync(
			`scene.action.toggle-cell.${activeTab}`,
			{ operations: 1 },
			() => {
				commitConfig(activeTab, { visibleCells: cells });
				applyVisibleCells(activeTab, cells);
			},
		);
	}

	function canToggleIdentity(
		cells: Set<string>,
		id: string,
		viewMode: ExplorerViewMode,
	): boolean {
		if (!isIdentityCell(activeTab, id, viewMode) || !cells.has(id)) return true;
		return cellsForExplorer(activeTab, viewMode).some(
			(candidate) =>
				candidate.id !== id &&
				candidate.role === 'identity' &&
				cells.has(candidate.id),
		);
	}

	function toggleVisibleCell(id: string) {
		const viewMode = viewModeByTab[activeTab] ?? 'tree';
		const cells = new Set(
			visibleCellsByTab[activeTab] ?? defaultVisibleCells(activeTab, viewMode),
		);
		if (cells.has(id)) {
			if (!canToggleIdentity(cells, id, viewMode)) return;
			cells.delete(id);
		} else {
			cells.add(id);
		}
		handlePillsChange(Array.from(cells));
	}

	function selectNativeViewMode(mode: ExplorerViewMode) {
		if (!isViewModeSelectableForDataSurface(activeTab, mode)) return;
		handleViewModeChange(mode);
	}

	function openNativeViewMenu(event: MouseEvent) {
		const menu = new Menu();
		const activeView = viewModeByTab[activeTab] ?? 'tree';
		const minimalNativeViewModes = minimalStyle
			? viewModesForDataSurface(activeTab).filter(
					(option) => option.id !== 'dnd',
				)
			: viewModesForDataSurface(activeTab);
		const nodes: NativeMenuNode[] = [];

		// Interaction first: the mode submenu (open/filter/add/input/select).
		const interactionIcon = (mode: InteractionMode): string =>
			mode === 'open'
				? 'lucide-folder-open'
				: mode === 'filter'
					? 'lucide-list-filter'
					: mode === 'add'
						? 'lucide-plus'
						: mode === 'input'
							? 'lucide-pencil'
							: 'lucide-mouse-pointer-2';
		const interactionChildren = interactionModesForTab(activeTab).map(
			(mode): NativeMenuNode =>
				nativeMenuItem(`view_menu.interaction.${mode}`, {
					title: translate(`viewmenu.interaction.${mode}`),
					icon: interactionIcon(mode),
					checked: interactionModeByTab[activeTab] === mode,
					onClick: () => selectInteractionMode(activeTab, mode),
				}),
		);
		nodes.push(
			nativeMenuItem(
				'view_menu.interaction',
				{
					title: `${translate('viewmenu.interaction')} ${translate(`viewmenu.interaction.${normalizeInteractionMode(activeTab, interactionModeByTab[activeTab])}`)}`,
					icon: 'lucide-mouse-pointer-click',
				},
				interactionChildren,
			),
		);

		// Saved layouts; the creation action is deliberately last.
		if (onSaveLayout) {
			const layoutChildren: NativeMenuNode[] = [];
			if (savedLayouts.length > 0) {
				for (const layout of savedLayouts) {
					layoutChildren.push(
						nativeMenuItem(
							`view_menu.layouts.saved.${layout.name}`,
							{
								title: layout.name,
								icon: 'lucide-layout-template',
								onClick: () => loadLayout(layout),
							},
							undefined,
							{
								id: 'view_menu.layouts.save',
								placement: 'before',
							},
						),
					);
				}
				layoutChildren.push(
					nativeMenuDivider('view_menu.layouts.divider.saved'),
				);
			}
			layoutChildren.push(
				nativeMenuItem('view_menu.layouts.save', {
					title: translate('viewmenu.save_layout'),
					icon: 'lucide-save',
					onClick: () => void promptSaveLayout(),
				}),
			);
			nodes.push(nativeMenuDivider('view_menu.divider.layouts'));
			nodes.push(
				nativeMenuItem(
					'view_menu.layouts',
					{
						title: translate('viewmenu.layouts'),
						icon: 'lucide-layout-template',
					},
					layoutChildren,
				),
			);
		}

		nodes.push(nativeMenuDivider('view_menu.divider.cells'));
		// D29 superseded by spec 08: 'Nested' moved to the view menu.
		// BT5-011: the menu mirrors the row — active cells in render order
		// first, then the rest at their canonical rank.
		for (const entry of cellMenuOrder(
			activeTab,
			visibleCellsByTab[activeTab] ??
				defaultVisibleCells(activeTab, activeView),
			{
				byActivation: orderCellsByActivation,
				viewMode: activeView,
			},
		)) {
			nodes.push(
				nativeMenuItem(`view_menu.cells.${entry.id}`, {
					title: translate(
						cellLabelKey(entry.definition, activeTab, activeView),
					),
					icon: cellIcon(entry.definition, activeTab, activeView),
					checked: entry.active,
					onClick: () => toggleVisibleCell(entry.id),
				}),
			);
		}

		// Orden (dev, 2026-09-15): un divider tras los cell presets, luego
		// el toggle `Toolbar`, un segundo divider y el submenu `engines`.
		// El segundo divider reserva el sitio del control de dimensiones
		// del stream proto_design.
		nodes.push(nativeMenuDivider('view_menu.divider.toolbar'));
		if (onToggleToolbar) {
			nodes.push(
				nativeMenuItem('view_menu.toolbar', {
					title: translate('viewmenu.toolbar'),
					icon: 'lucide-panel-top',
					checked: toolbarShown,
					onClick: () => onToggleToolbar?.(),
				}),
			);
			nodes.push(nativeMenuDivider('view_menu.divider.engines'));
		}
		// Submenu `engines`: the available rendering engines, then a divider,
		// then the engine-specific view options (nested, folders-first,
		// fixed-folders, sticky rows, compact folders). Those options are modes
		// of the SELECTED engine, so they live INSIDE this submenu, not at the
		// view_menu top level.
		const sortState =
			sortStateByTab[activeTab] ?? DEFAULT_SORT_STATE[activeTab];
		const nestedAct = nestedActiveFor(activeTab);
		const engineChildren: NativeMenuNode[] = minimalNativeViewModes.map(
			(option): NativeMenuNode =>
				nativeMenuItem(`view_menu.engines.${option.id}`, {
					title: translate(option.labelKey),
					icon: option.icon,
					checked: activeView === option.id,
					disabled: option.locked ?? false,
					onClick: option.locked
						? undefined
						: () => selectNativeViewMode(option.id),
				}),
		);
		// Projection rule (conserved from sort_menu, spec 08 §2):
		// `nested` is always present (it's the toggle for the engine);
		// parentsFirst and fixedFolders vanish when nested is off;
		// fixedFolders also vanishes when parentsFirst is off. The chain:
		// nested -> parentsFirst -> fixedFolders. parentsFirst /
		// fixedFolders only exist in Files (the Files-specific sort knobs).
		// stickyRows applies to any nested-capable tab (Files/Props/Tags);
		// compactFolders only exists in Files -- folders live only there.
		// `indent` is independent of the nested/grouping chain above: it is
		// a flat padding override (4px, no per-depth sangria) that applies
		// whether or not there is anything to nest or group, so it is gated
		// only by the engine being `tree`, not by `nestedAct`.
		engineChildren.push(nativeMenuDivider('view_menu.engines.divider.options'));
		engineChildren.push(
			nativeMenuItem('view_menu.engines.nested', {
				title: translate('sort.level.nested'),
				icon: 'lucide-list-tree',
				checked: nestedAct,
				onClick: () => toggleNestedFor(activeTab),
			}),
		);
		if (treeCapableFor(activeTab)) {
			engineChildren.push(
				nativeMenuItem('view_menu.engines.indent', {
					title: translate('sort.level.indent'),
					icon: 'lucide-indent',
					checked: indentEnabledFor(activeTab),
					onClick: () => toggleIndentFor(activeTab),
				}),
			);
		}
		if (nestedAct && activeTab === 'files') {
			const parentsFirst = sortState.parentsFirst ?? true;
			engineChildren.push(
				nativeMenuItem('view_menu.engines.parents_first', {
					title: translate('sort.parents_first'),
					icon: 'lucide-folder-tree',
					checked: parentsFirst,
					onClick: () =>
						handleSortChange({
							...sortState,
							parentsFirst: !parentsFirst,
						}),
				}),
			);
			if (parentsFirst) {
				engineChildren.push(
					nativeMenuItem('view_menu.engines.fixed_folders', {
						title: translate('sort.level.fixed_folders'),
						icon: 'lucide-folder-lock',
						checked: sortState.fixedFolders !== false,
						onClick: () =>
							handleSortChange({
								...sortState,
								fixedFolders: !(sortState.fixedFolders !== false),
							}),
					}),
				);
			}
		}
		if (nestedAct) {
			engineChildren.push(
				nativeMenuItem('view_menu.engines.sticky_rows', {
					title: translate('sort.level.sticky_rows'),
					icon: 'lucide-pin',
					checked: stickyRowsEnabledFor(activeTab),
					onClick: () => toggleStickyRowsFor(activeTab),
				}),
			);
		}
		if (nestedAct && activeTab === 'files') {
			// TODO(spec-08 §2): esto persiste el flag per_instance, pero la
			// compactacion real de cadenas de carpetas de un solo hijo (estilo
			// VS Code) todavia no esta implementada en el arbol.
			engineChildren.push(
				nativeMenuItem('view_menu.engines.compact_folders', {
					title: translate('sort.level.compact_folders'),
					icon: 'lucide-folder-minus',
					checked: compactFoldersEnabledFor(activeTab),
					onClick: () => toggleCompactFoldersFor(activeTab),
				}),
			);
		}
		nodes.push(
			nativeMenuItem(
				'view_menu.engines',
				{
					title: translate('viewmenu.engines'),
					icon: 'lucide-layout',
				},
				engineChildren,
			),
		);
		renderNativeMenuNodes(menu, projectNativeMenu('view_menu', nodes));
		menu.showAtMouseEvent(event);
	}

	// U130 toolbar alt-cmenus (right-click): overrides per-instance. Los
	// globales no se tocan — cada toggle escribe el config de la scene activa
	// por commitConfig, así cada scene recuerda su propio toolbar.
	function toggleToolbarNodeVisibility(localId: string): void {
		const current = configByTab[activeTab]?.hiddenToolbarNodes ?? [];
		const next = current.includes(localId)
			? current.filter((id) => id !== localId)
			: [...current, localId];
		commitConfig(activeTab, { hiddenToolbarNodes: next });
	}

	function addToolbarNodeVisibilityItem(
		menu: Menu,
		localId: string,
		label?: string,
	): void {
		menu.addItem((item) => {
			item
				.setTitle(label ?? translate('toolbar.alt.show_in_toolbar'))
				.setIcon('lucide-eye')
				.setChecked(toolbarNodeVisible(localId))
				.onClick(() => toggleToolbarNodeVisibility(localId));
		});
	}

	function openNodeAltMenu(localId: string, event: MouseEvent): void {
		const menu = new Menu();
		if (localId === 'tabs') {
			menu.addItem((item) => {
				item
					.setTitle(translate('toolbar.alt.scene_label'))
					.setIcon('lucide-tag')
					.setChecked(tabsButtonLabelEffective)
					.onClick(() =>
						commitConfig(activeTab, {
							sceneLabelMode: tabsButtonLabelEffective ? 'off' : 'on',
						}),
					);
			});
			menu.addSeparator();
		}
		if (localId === 'reveal-active-file') {
			menu.addItem((item) => {
				item
					.setTitle(translate('toolbar.alt.reveal_now'))
					.setIcon('lucide-gallery-vertical')
					.onClick(() => revealActiveExplorerFile('menu', event));
			});
			const revealMode = configByTab.files?.autoRevealMode ?? 'auto';
			const alwaysReveal =
				revealMode === 'auto' ? autoRevealGlobal : revealMode === 'on';
			menu.addItem((item) => {
				item
					.setTitle(translate('toolbar.alt.always_reveal'))
					.setIcon('lucide-pin')
					.setChecked(alwaysReveal)
					.onClick(() => {
						commitConfig('files', {
							autoRevealMode: alwaysReveal ? 'off' : 'on',
						});
						fileList?.setAutoRevealOverride?.(!alwaysReveal);
					});
			});
			menu.addSeparator();
		}
		addToolbarNodeVisibilityItem(menu, localId);
		const nodeDef = panelWidgetNodes.find(
			(node) => node.id === panelWidgetNodeId(localId),
		);
		menu.addItem((item) => {
			item
				.setTitle(translate('toolbar.alt.change_icon'))
				.setIcon('lucide-palette')
				.onClick(() => {
					if (!app) return;
					const icons = configByTab[activeTab]?.toolbarNodeIcons ?? {};
					openAddonIconPicker({
						app,
						name: nodeDef?.label ?? localId,
						hasOverride: icons[localId] !== undefined,
						onPick: (icon) => {
							commitConfig(activeTab, {
								toolbarNodeIcons: { ...icons, [localId]: icon },
							});
						},
						onReset: () => {
							const next = { ...icons };
							delete next[localId];
							commitConfig(activeTab, { toolbarNodeIcons: next });
						},
					});
				});
		});
		menu.showAtMouseEvent(event);
	}

	function openToolbarEmptyMenu(event: MouseEvent): void {
		const menu = new Menu();
		if (onToggleToolbar) {
			menu.addItem((item) => {
				item
					.setTitle(translate('viewmenu.toolbar'))
					.setIcon('lucide-panel-top')
					.setChecked(toolbarShown)
					.onClick(() => onToggleToolbar?.());
			});
			menu.addSeparator();
		}
		// Solo nodos provided: los `command:*` los gestiona el usuario donde
		// los agregó, no desde aquí.
		for (const node of panelWidgetNodes) {
			const prefix = `${providerId}:`;
			if (!node.id.startsWith(prefix)) continue;
			const localId = node.id.slice(prefix.length);
			if (localId.startsWith('command:')) continue;
			menu.addItem((item) => {
				item
					.setTitle(node.label)
					.setIcon(node.icon)
					.setChecked(toolbarNodeVisible(localId))
					.onClick(() => toggleToolbarNodeVisibility(localId));
			});
		}
		menu.showAtMouseEvent(event);
	}

	function openNativeSceneMenu(event: MouseEvent) {
		const menu = new Menu();
		const primaryTabOptions = tabOptions.filter(
			(option) => option.id !== 'snippets' && option.id !== 'plugins',
		);
		const addonTabOptions = tabOptions.filter(
			(option) => option.id === 'snippets' || option.id === 'plugins',
		);
		const nodes: NativeMenuNode[] = [];
		for (const option of primaryTabOptions) {
			nodes.push(
				nativeMenuItem(`scene_menu.tab.${option.id}`, {
					title: option.label,
					icon: option.icon,
					checked: option.id === activeSectionTab,
					onClick: () => onSectionTabChange?.(option.id),
				}),
			);
		}
		const tabActionNode = (action: HeaderMenuAction): NativeMenuNode => {
			const isCountedLauncher =
				action.id === 'filters' || action.id === 'queue';
			const countLabel =
				isCountedLauncher && action.count && action.count > 0
					? ` (${action.count})`
					: '';
			const warningLabel = isCountedLauncher && action.warning ? ' !' : '';
			return nativeMenuItem(`scene_menu.launcher.${action.id}`, {
				title: `${action.label}${countLabel}${warningLabel}`,
				icon: action.warning ? 'lucide-alert-triangle' : action.icon,
				onClick: () => action.onClick(),
			});
		};
		const statisticsAction = tabMenuActions.find((a) => a.id === 'statistics');
		const launcherActions = tabMenuActions.filter((a) => a.id !== 'statistics');
		if (!showDock && launcherActions.length > 0) {
			nodes.push(nativeMenuDivider('scene_menu.divider.launchers'));
			for (const action of launcherActions) nodes.push(tabActionNode(action));
		}
		// Floating index is its own section below Filters + Queue.
		if (onToggleFloatingToc) {
			nodes.push(nativeMenuDivider('scene_menu.divider.floating_toc'));
			nodes.push(
				nativeMenuItem('scene_menu.floating_toc', {
					title: translate('floating_toc.menu'),
					icon: 'lucide-a-arrow-down',
					checked: floatingTocEnabled,
					onClick: () => onToggleFloatingToc?.(),
				}),
			);
		}
		// Statistics and add-on explorers share the next section.
		if ((!showDock && statisticsAction) || addonTabOptions.length > 0) {
			nodes.push(nativeMenuDivider('scene_menu.divider.addons'));
		}
		if (!showDock && statisticsAction)
			nodes.push(tabActionNode(statisticsAction));
		for (const option of addonTabOptions) {
			nodes.push(
				nativeMenuItem(`scene_menu.tab.${option.id}`, {
					title: option.label,
					icon: option.icon,
					onClick: () => onSectionTabChange?.(option.id),
				}),
			);
		}
		renderNativeMenuNodes(menu, projectNativeMenu('scene_menu', nodes));
		menu.showAtMouseEvent(event);
	}

	function nextSortState(id: string): ExplorerSortState {
		const current = normalizeSortState(
			activeTab,
			sortStateByTab[activeTab] ?? DEFAULT_SORT_STATE[activeTab],
		);
		const activeSort = activeScopeSort(activeTab, current);
		const direction = nextExplorerSortDirection(
			activeSort.sortBy,
			activeSort.direction,
			id,
		);
		return replaceActiveScopeSort(activeTab, current, {
			sortBy: id,
			direction,
		});
	}

	function normalizeSortState(
		tab: FiltersTab,
		state: ExplorerSortState,
		validateDrill = false,
	): ExplorerSortState {
		const normalized = normalizeExplorerSortState(tab, state, {
			...(validateDrill && tab === 'files' && fileList
				? { isValidDrillNode: (id: string) => fileList.hasSortNode(id) }
				: {}),
			...(validateDrill && tab === 'tags' && tagsExplorer
				? {
						isValidDrillNode: (id: string) =>
							tagsExplorer.hasSortNode?.(id) ?? false,
					}
				: {}),
		});
		return {
			...normalized,
			...nodeTypeFilterPatch(nodeTypeFiltersForState(normalized)),
		};
	}

	function stopDrillPick() {
		drillPickCleanup?.();
		drillPickCleanup = null;
	}

	function beginDrillPick(tab: FiltersTab) {
		beginScopePick(tab, 'parent');
	}

	/** Spec 08 §3.1 item 3: same capture-by-click as the parent pick, but it takes the row's LEVEL. */
	function beginLevelPick(tab: FiltersTab) {
		beginScopePick(tab, 'level');
	}

	function beginScopePick(tab: FiltersTab, mode: 'parent' | 'level') {
		if (!supportsByLevel(tab)) return;
		stopDrillPick();
		const pane =
			navbarEl?.closest<HTMLElement>('.vaultman-filters-tab-pane.is-active') ??
			document.querySelector<HTMLElement>(
				'.vaultman-filters-tab-pane.is-active',
			);
		if (!pane) return;
		// D29 drill UX (twin of the floating-index pick): a dashed frame marks
		// pick mode and ONE simple click on any row selects that row's LEVEL
		// (its parent scope). Re-open Scope / choose All levels to change it.
		pane.classList.add('vaultman-sort-pick-mode');
		const suppressEvent = (event: Event) => {
			event.preventDefault();
			event.stopImmediatePropagation();
		};
		const onPick = (event: PointerEvent) => {
			const target =
				event.target instanceof Element
					? event.target.closest<HTMLElement>('[data-id]')
					: null;
			const nodeId = target?.dataset.id;
			if (!nodeId) return;
			suppressEvent(event);
			const panel = treePanelForTab(tab);
			const current = normalizeSortState(
				tab,
				untrack(() => sortStateByTab[tab] ?? DEFAULT_SORT_STATE[tab]),
			);
			if (mode === 'level') {
				const level = panel?.scopeLevelForNode?.(nodeId) ?? null;
				handleScopeChangeForTab(
					tab,
					level !== null
						? { ...current, activeScope: levelScope(level) }
						: { ...current, activeScope: 'all' },
				);
				stopDrillPick();
				return;
			}
			const parentId = panel?.scopeRootForNode(nodeId) ?? null;
			handleScopeChangeForTab(
				tab,
				parentId
					? { ...current, activeScope: 'drill', drillNodeId: parentId }
					: { ...current, activeScope: 'all', drillNodeId: null },
			);
			stopDrillPick();
		};
		const timeout = window.setTimeout(stopDrillPick, 8000);
		pane.addEventListener('pointerdown', onPick, true);
		pane.addEventListener('click', suppressEvent, true);
		drillPickCleanup = () => {
			window.clearTimeout(timeout);
			pane.classList.remove('vaultman-sort-pick-mode');
			pane.removeEventListener('pointerdown', onPick, true);
			// Let the click that completed the pick stay suppressed.
			window.setTimeout(
				() => pane.removeEventListener('click', suppressEvent, true),
				400,
			);
		};
		new Notice(
			translate(
				mode === 'level'
					? 'sort.level.pick_level_hint'
					: 'sort.level.pick_hint',
			),
		);
	}

	function treePanelForTab(tab: FiltersTab) {
		if (tab === 'files') return fileList ?? null;
		if (tab === 'tags') return tagsExplorer ?? null;
		if (tab === 'props') return propExplorer ?? null;
		return null;
	}

	/** Spec 08 §3.1: what the scope submenu needs from the scene to name its rows. */
	function scopeSceneFor(tab: FiltersTab): ScopeMenuScene {
		const panel = treePanelForTab(tab);
		return {
			parentLabel: (id) => panel?.sortNodeLabel?.(id) ?? null,
			parentLevel: (id) => panel?.scopeLevelForNode?.(id) ?? null,
			sortLabel: (sort) =>
				`${translate(sortOptionLabelKey(tab, sort.sortBy))} ${sortDirectionGlyph(sort.direction)}`,
			levelLabel: (level) => translate('sort.scope.level_n', { n: level }),
		};
	}

	function sortOptionLabelKey(tab: FiltersTab, sortBy: string): string {
		return (
			SORT_MENU_OPTIONS[tab].find((option) => option.id === sortBy)?.labelKey ??
			sortBy
		);
	}

	/** §3.1.bis: the submenu is titled after what is active. */
	function scopeMenuTitle(model: {
		titleKind: 'all' | 'parent' | 'level';
		titleArg: string;
	}): string {
		const scope =
			model.titleKind === 'all'
				? translate('sort.level.all')
				: model.titleKind === 'level'
					? model.titleArg
					: shortLabel(model.titleArg);
		return translate('sort.scope.title', { scope });
	}

	function shortLabel(label: string): string {
		const chars = [...label];
		return chars.slice(0, 6).join('') + (chars.length > 6 ? '…' : '');
	}

	function activateScopeRow(tab: FiltersTab, key: string) {
		const current = normalizeSortState(
			tab,
			sortStateByTab[tab] ?? DEFAULT_SORT_STATE[tab],
		);
		const parentId = parentOfScope(key);
		stopDrillPick();
		handleScopeChangeForTab(
			tab,
			parentId
				? { ...current, activeScope: 'drill', drillNodeId: parentId }
				: { ...current, activeScope: key as ExplorerSortState['activeScope'] },
		);
	}

	/** Spec 08 §4 on a scope row: `hide` keeps the sort but stops resolving it. */
	function setScopeHidden(tab: FiltersTab, key: string, hidden: boolean) {
		const current = normalizeSortState(
			tab,
			sortStateByTab[tab] ?? DEFAULT_SORT_STATE[tab],
		);
		const scopeKey = key as ExplorerSortState['activeScope'];
		const hiddenScopes = (current.hiddenScopes ?? []).filter(
			(entry) => entry !== scopeKey,
		);
		if (hidden) hiddenScopes.push(scopeKey);
		handleScopeChangeForTab(tab, {
			...current,
			hiddenScopes,
			...(hidden && storageScope(current, current.activeScope) === scopeKey
				? { activeScope: 'all', drillNodeId: null }
				: {}),
		});
	}

	function deleteScope(tab: FiltersTab, key: string) {
		const current = normalizeSortState(
			tab,
			sortStateByTab[tab] ?? DEFAULT_SORT_STATE[tab],
		);
		const scopeKey = key as ExplorerSortState['activeScope'];
		const { [scopeKey]: _removed, ...sorts } = current.sorts;
		handleScopeChangeForTab(tab, {
			...current,
			sorts,
			hiddenScopes: (current.hiddenScopes ?? []).filter(
				(entry) => entry !== scopeKey,
			),
			...(storageScope(current, current.activeScope) === scopeKey
				? { activeScope: 'all', drillNodeId: null }
				: {}),
		});
	}

	function stopRevealPick() {
		revealPickCleanup?.();
		revealPickCleanup = null;
	}

	/**
	 * Holds the reveal projection to one note and returns to the scene the pick
	 * started from. The anchor outlives the workspace's own current file — only
	 * `Current file` in the same drawer releases it.
	 */
	function anchorRevealNote(originTab: FiltersTab, path: string) {
		const current = normalizeSortState(
			originTab,
			untrack(() => sortStateByTab[originTab] ?? DEFAULT_SORT_STATE[originTab]),
		);
		const anchored: ExplorerSortState = {
			...current,
			revealAnchor: 'pinned',
			revealAnchorPath: path,
		};
		stopRevealPick();
		handleScopeChangeForTab(originTab, anchored);
		// Scope changes reach the explorer with the next tab pass, and this flow
		// makes exactly one — but the anchor is the whole point of the gesture,
		// so it is pushed here rather than left to the round trip.
		applySortState(originTab, anchored);
		onSectionTabChange?.(originTab);
	}

	async function activeTabPane(): Promise<HTMLElement | null> {
		// The file scene may be mounting for the first time, so the pane is
		// given a second frame before the pick gives up on it.
		for (let attempt = 0; attempt < 2; attempt += 1) {
			await tick();
			const pane = document.querySelector<HTMLElement>(
				'.vaultman-filters-tab-pane.is-active',
			);
			if (pane) return pane;
			await new Promise((resolve) => window.setTimeout(resolve, 50));
		}
		return null;
	}

	/**
	 * Twin of the drill pick, over the file scene: the surface jumps to Files,
	 * takes one note and comes back. Opening a note in the main leaf counts as
	 * the same choice, so the pick can also be finished from the editor.
	 */
	async function beginRevealPick(originTab: FiltersTab) {
		if (originTab !== 'props' && originTab !== 'tags') return;
		stopRevealPick();
		onSectionTabChange?.('files');
		const pane = await activeTabPane();
		if (!pane) return;
		pane.classList.add('vaultman-sort-pick-mode');
		const suppressEvent = (event: Event) => {
			event.preventDefault();
			event.stopImmediatePropagation();
		};
		const onPick = (event: PointerEvent) => {
			const target =
				event.target instanceof Element
					? event.target.closest<HTMLElement>('[data-id]')
					: null;
			const nodeId = target?.dataset.id;
			if (!nodeId) return;
			suppressEvent(event);
			// A folder row carries a level, not a note, and the anchor is a note.
			// Rejecting it keeps pick mode armed instead of anchoring nothing.
			if (nodeId.startsWith('folder:')) {
				new Notice(translate('sort.reveal.pick_needs_note'));
				return;
			}
			anchorRevealNote(originTab, nodeId);
		};
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') return;
			suppressEvent(event);
			stopRevealPick();
			onSectionTabChange?.(originTab);
		};
		const workspace = app?.workspace;
		const fileOpenRef = workspace?.on('file-open', (file) => {
			if (file) anchorRevealNote(originTab, file.path);
		});
		// Longer than the drill pick's: this one can be finished in the editor,
		// which is a slower gesture than clicking the row under the menu.
		const timeout = window.setTimeout(stopRevealPick, 20000);
		pane.addEventListener('pointerdown', onPick, true);
		pane.addEventListener('click', suppressEvent, true);
		document.addEventListener('keydown', onKeyDown, true);
		revealPickCleanup = () => {
			window.clearTimeout(timeout);
			pane.classList.remove('vaultman-sort-pick-mode');
			pane.removeEventListener('pointerdown', onPick, true);
			document.removeEventListener('keydown', onKeyDown, true);
			if (fileOpenRef) workspace?.offref(fileOpenRef);
			// Let the click that completed the pick stay suppressed.
			window.setTimeout(
				() => pane.removeEventListener('click', suppressEvent, true),
				400,
			);
		};
		new Notice(translate('sort.reveal.pick_hint'));
	}

	function treeCapableFor(tab: FiltersTab): boolean {
		return isHierarchicalViewMode(viewModeByTab[tab] ?? 'tree');
	}

	function nestedActiveFor(tab: FiltersTab): boolean {
		// Nesting only means anything in a tree-family view; table and cards are
		// flat, so their sort menu treats nested as off (no folder options, path
		// sort available).
		if (!treeCapableFor(tab)) return false;
		return (
			visibleCellsByTab[tab] ?? defaultVisibleCells(tab, viewModeByTab[tab])
		).includes('nested');
	}

	function toggleNestedFor(tab: FiltersTab) {
		const cells =
			visibleCellsByTab[tab] ?? defaultVisibleCells(tab, viewModeByTab[tab]);
		const next = cells.includes('nested')
			? cells.filter((cell) => cell !== 'nested')
			: [...cells, 'nested'];
		measureSceneSync(
			`scene.action.toggle-nested.${tab}`,
			{ operations: 1 },
			() => {
				commitConfig(tab, { visibleCells: next });
				applyVisibleCells(tab, next);
				onViewFiltersChanged?.();
			},
		);
	}

	function stickyRowsEnabledFor(tab: FiltersTab): boolean {
		return configByTab[tab].stickyRows;
	}

	function applyStickyRows(tab: FiltersTab, enabled: boolean) {
		if (tab === 'files') fileList?.setStickyRowsEnabled?.(enabled);
		if (tab === 'props') propExplorer?.setStickyRowsEnabled?.(enabled);
		if (tab === 'tags') tagsExplorer?.setStickyRowsEnabled?.(enabled);
	}

	function indentEnabledFor(tab: FiltersTab): boolean {
		return configByTab[tab].indent;
	}

	function applyIndent(tab: FiltersTab, enabled: boolean) {
		if (tab === 'files') fileList?.setIndentEnabled?.(enabled);
		if (tab === 'props') propExplorer?.setIndentEnabled?.(enabled);
		if (tab === 'tags') tagsExplorer?.setIndentEnabled?.(enabled);
		if (tab === 'snippets') snippetsExplorer?.setIndentEnabled?.(enabled);
		if (tab === 'plugins') pluginsExplorer?.setIndentEnabled?.(enabled);
	}

	function applyHiddenGroupIds(tab: FiltersTab, ids: readonly string[]) {
		explorerPortForTab(tab)?.setHiddenGroupIds?.(ids);
	}

	/** U130-09: the scene's custom groups reach the explorer like `hiddenGroupIds` do. */
	function applyGroupMemberships(
		tab: FiltersTab,
		memberships: Readonly<Record<string, readonly string[]>>,
	) {
		explorerPortForTab(tab)?.setGroupMemberships?.(memberships);
	}

	/** Spec 08 §3.2: the preset selection is per instance and reaches every scene. */
	function applyGroupPreset(tab: FiltersTab, preset: GroupPreset) {
		if (tab === 'files') fileList?.setGroupPreset?.(preset);
		if (tab === 'props') propExplorer?.setGroupPreset?.(preset);
		if (tab === 'tags') tagsExplorer?.setGroupPreset?.(preset);
		if (tab === 'snippets') snippetsExplorer?.setGroupPreset?.(preset);
		if (tab === 'plugins') pluginsExplorer?.setGroupPreset?.(preset);
	}

	function toggleIndentFor(tab: FiltersTab) {
		const next = !indentEnabledFor(tab);
		commitConfig(tab, { indent: next });
		applyIndent(tab, next);
	}

	function toggleStickyRowsFor(tab: FiltersTab) {
		const next = !stickyRowsEnabledFor(tab);
		commitConfig(tab, { stickyRows: next });
		applyStickyRows(tab, next);
	}

	function compactFoldersEnabledFor(tab: FiltersTab): boolean {
		return configByTab[tab].compactFolders;
	}

	// TODO(spec-08 §2): solo persiste el flag per_instance -- la compactacion
	// real de cadenas de carpetas de un solo hijo (estilo VS Code) todavia no
	// esta implementada en el arbol.
	function applyCompactFolders(tab: FiltersTab, enabled: boolean) {
		if (tab === 'files') fileList?.setCompactFoldersEnabled?.(enabled);
	}

	function toggleCompactFoldersFor(tab: FiltersTab) {
		const next = !compactFoldersEnabledFor(tab);
		commitConfig(tab, { compactFolders: next });
		applyCompactFolders(tab, next);
	}

	function nodeTypeOptionsForActiveTab(): readonly NodeTypeMenuOption[] {
		if (activeTab === 'files') {
			return [
				...NODE_TYPE_MENU_OPTIONS.files,
				...(fileList?.getFileTypeOptions() ?? []),
			];
		}
		if (activeTab === 'props' || activeTab === 'tags') {
			return NODE_TYPE_MENU_OPTIONS[activeTab];
		}
		return [];
	}

	function nodeTypeOptionTitle(option: NodeTypeMenuOption): string {
		return option.label ?? translate(option.labelKey ?? '');
	}

	function openNativeSortMenu(event: MouseEvent) {
		const menu = new Menu();
		const nodes: NativeMenuNode[] = [];
		const current = normalizeSortState(
			activeTab,
			sortStateByTab[activeTab] ?? DEFAULT_SORT_STATE[activeTab],
		);
		const activeSort = activeScopeSort(activeTab, current);

		// Spec 08 §3.1-3.2: `Scope: <variable>` first, the groups submenu
		// second, then the sort presets.
		const scopeModel = scopeMenuModel(
			activeTab,
			current,
			scopeSceneFor(activeTab),
		);
		if (scopeModel) {
			const scopeChildren: NativeMenuNode[] = [];
			for (const entry of scopeModel.items) {
				if (entry.kind === 'separator') {
					scopeChildren.push(nativeMenuDivider('sort_menu.scope.divider.rows'));
					continue;
				}
				if (entry.kind === 'pick') {
					scopeChildren.push(
						nativeMenuItem(`sort_menu.scope.${entry.id}`, {
							title: translate(entry.labelKey),
							icon: entry.icon,
							checked: entry.checked,
							onClick: () => {
								if (entry.id === 'drill') beginDrillPick(activeTab);
								else if (entry.id === 'level') beginLevelPick(activeTab);
								else {
									stopDrillPick();
									handleScopeChangeForTab(activeTab, {
										...current,
										activeScope: 'all',
										drillNodeId: null,
									});
								}
							},
						}),
					);
					continue;
				}
				const rowChildren: NativeMenuNode[] = [
					nativeMenuItem(`sort_menu.scope.rows.${entry.id}.confirm`, {
						title: translate('group.row.confirm'),
						disabled: true,
					}),
					nativeMenuItem(`sort_menu.scope.rows.${entry.id}.select`, {
						title: entry.label,
						icon: entry.icon,
						checked: entry.checked,
						onClick: () => activateScopeRow(activeTab, entry.id),
					}),
					nativeMenuItem(`sort_menu.scope.rows.${entry.id}.hide`, {
						title: translate(
							entry.hidden ? 'group.row.unhide' : 'group.row.hide',
						),
						icon: entry.hidden ? 'lucide-eye' : 'lucide-eye-off',
						onClick: () => setScopeHidden(activeTab, entry.id, !entry.hidden),
					}),
					nativeMenuItem(`sort_menu.scope.rows.${entry.id}.delete`, {
						title: translate('group.row.delete'),
						icon: 'lucide-trash-2',
						onClick: () => deleteScope(activeTab, entry.id),
					}),
					nativeMenuItem(`sort_menu.scope.rows.${entry.id}.cancel`, {
						title: translate('group.row.cancel'),
						icon: 'lucide-x',
					}),
				];
				scopeChildren.push(
					nativeMenuItem(
						`sort_menu.scope.rows.${entry.id}`,
						{
							title: `${entry.label} · ${entry.sortLabel}`,
							icon: entry.hidden ? 'lucide-eye-off' : entry.icon,
							checked: entry.checked,
						},
						rowChildren,
					),
				);
			}
			nodes.push(
				nativeMenuItem(
					'sort_menu.scope',
					{
						title: scopeMenuTitle(scopeModel),
						icon: 'lucide-layers',
					},
					scopeChildren,
				),
			);
		}

		const groupModel = groupMenuModel(
			activeTab,
			configByTab[activeTab].groupPreset,
			customGroupsForMenu(activeTab),
			canCreateGroup(),
			revealActive,
		);
		const groupChildren: NativeMenuNode[] = [];
		for (const entry of groupModel.items) {
			if (entry.kind === 'separator') {
				groupChildren.push(
					nativeMenuDivider('sort_menu.groups.divider.custom'),
				);
				continue;
			}
			if (entry.kind === 'preset') {
				groupChildren.push(
					nativeMenuItem(`sort_menu.groups.${entry.id}`, {
						title: `${translate(entry.labelKey)}${entry.direction ? ` ${sortDirectionGlyph(entry.direction)}` : ''}`,
						icon: entry.icon,
						checked: entry.checked,
						onClick: () => selectGroupPreset(activeTab, entry.id),
					}),
				);
				continue;
			}
			if (entry.kind === 'new-group') {
				groupChildren.push(
					nativeMenuItem('sort_menu.groups.new', {
						title: translate(
							entry.disabled ? 'group.new.needs_layout' : entry.labelKey,
						),
						icon: entry.icon,
						disabled: entry.disabled,
						onClick: () => void createCustomGroup(activeTab),
					}),
				);
				continue;
			}
			groupChildren.push(
				nativeMenuItem(
					`sort_menu.groups.custom.${entry.id}`,
					{
						title: entry.label,
						icon: entry.icon,
					},
					[
						nativeMenuItem(`sort_menu.groups.custom.${entry.id}.confirm`, {
							title: translate('group.row.confirm'),
							disabled: true,
						}),
						nativeMenuItem(`sort_menu.groups.custom.${entry.id}.hide`, {
							title: translate(
								entry.hidden ? 'group.row.unhide' : 'group.row.hide',
							),
							icon: entry.hidden ? 'lucide-eye' : 'lucide-eye-off',
							onClick: () => setGroupHidden(activeTab, entry.id, !entry.hidden),
						}),
						nativeMenuItem(`sort_menu.groups.custom.${entry.id}.delete`, {
							title: translate('group.row.delete'),
							icon: 'lucide-trash-2',
							onClick: () => deleteCustomGroup(activeTab, entry.id),
						}),
						nativeMenuItem(`sort_menu.groups.custom.${entry.id}.cancel`, {
							title: translate('group.row.cancel'),
							icon: 'lucide-x',
						}),
					],
				),
			);
		}
		nodes.push(
			nativeMenuItem(
				'sort_menu.groups',
				{
					title: translate('group.menu.title'),
					icon: 'lucide-group',
				},
				groupChildren,
			),
		);
		nodes.push(nativeMenuDivider('sort_menu.divider.presets'));

		const nestedActive = nestedActiveFor(activeTab);
		// The native menu shows the same options as the popup, so it needs the
		// same reveal signal — without it `note` was filtered out here even
		// while a note was anchored, which is why the option never appeared.
		for (const option of visibleSortOptions(
			activeTab,
			current,
			nestedActive,
			revealActive,
		)) {
			const isActive = activeSort.sortBy === option.id;
			nodes.push(
				nativeMenuItem(`sort_menu.sort.${activeTab}.${option.id}`, {
					title: `${translate(option.labelKey)}${
						isActive ? ` ${sortDirectionGlyph(activeSort.direction)}` : ''
					}`,
					icon: option.icon,
					checked: isActive,
					onClick: () => handleSortChange(nextSortState(option.id)),
				}),
			);
		}

		if (supportsByLevel(activeTab)) {
			nodes.push(nativeMenuDivider('sort_menu.divider.by_level'));
			const byLevelModelValue = byLevelModel(
				activeTab,
				current,
				treeCapableFor(activeTab),
				revealActive,
			);
			const byLevelChildren: NativeMenuNode[] = [];
			for (const option of byLevelModelValue?.items ?? []) {
				if (option.kind === 'separator') {
					byLevelChildren.push(
						nativeMenuDivider(`sort_menu.by_level.divider.${option.id}`),
					);
					continue;
				}
				byLevelChildren.push(
					nativeMenuItem(
						`sort_menu.by_level.${option.id === 'reveal-current-file' ? 'reveal_current_file' : option.id === 'reveal-drill' ? 'reveal_drill' : option.id === 'addPropertyFirst' ? 'add_property_first' : option.id}`,
						{
							title: translate(option.labelKey),
							icon: option.icon,
							checked: option.checked,
							onClick: () => {
								if (option.kind === 'reveal') {
									if (option.id === 'reveal-drill') {
										void beginRevealPick(activeTab);
										return;
									}
									handleScopeChange({
										...current,
										revealAnchor: 'current-file',
										revealAnchorPath: null,
									});
									return;
								}
								if (
									option.kind === 'toggle' &&
									option.id === 'addPropertyFirst'
								) {
									handleSortChange({
										...current,
										addPropertyFirst: !option.checked,
									});
								}
							},
						},
					),
				);
			}
			const byLevelNode = nativeMenuItem(
				'sort_menu.by_level',
				{
					title: translate('sort.level.title'),
					icon: 'lucide-list-tree',
				},
				byLevelChildren,
			);
			nodes.push(byLevelNode);
		}

		// Spec 08 §3.4, items 10-11: `Filtered` sits on its own, right before
		// the (not yet built) `custom sorts` submenu and `By type`.
		if (
			activeTab === 'props' ||
			activeTab === 'tags' ||
			activeTab === 'files'
		) {
			nodes.push(nativeMenuDivider('sort_menu.divider.filtered'));
			nodes.push(
				nativeMenuItem('sort_menu.filtered', {
					title: translate('sort.level.filtered'),
					icon: 'lucide-filter',
					checked: current.filtered === true,
					onClick: () =>
						handleFilterChange({
							...current,
							filtered: !(current.filtered === true),
						}),
				}),
			);
		}
		// TODO(spec-08 §3.4 item 12): a `custom sorts` submenu belongs right
		// here. Not this initiative's scope -- left as a pointer for whoever
		// builds it next.

		const nodeTypeOptions = nodeTypeOptionsForActiveTab();
		if (nodeTypeOptions.length > 0) {
			nodes.push(nativeMenuDivider('sort_menu.divider.by_type'));
			const selectedNodeTypes = nodeTypeFiltersForState(current);
			const nodeTypeChildren: NativeMenuNode[] = [];
			for (const option of nodeTypeOptions) {
				const isAll = option.id === 'all';
				const isActive = isAll
					? selectedNodeTypes.length === 0
					: selectedNodeTypes.includes(option.id);
				nodeTypeChildren.push(
					nativeMenuItem(`sort_menu.by_type.${activeTab}.${option.id}`, {
						title: nodeTypeOptionTitle(option),
						icon: option.icon,
						checked: isActive,
						onClick: () =>
							handleFilterChange({
								...current,
								...nodeTypeFilterPatch(
									toggleNodeTypeFilter(selectedNodeTypes, option.id),
								),
							}),
					}),
				);
				if (option.separatorAfter) {
					nodeTypeChildren.push(
						nativeMenuDivider(
							`sort_menu.by_type.${activeTab}.${option.id}.divider`,
						),
					);
				}
			}
			nodes.push(
				nativeMenuItem(
					'sort_menu.by_type',
					{
						title: `${translate('explorer.sort.type')}${
							selectedNodeTypes.length > 0
								? ` (${selectedNodeTypes.length})`
								: ''
						}`,
						icon: 'lucide-list-filter',
					},
					nodeTypeChildren,
				),
			);
		}

		renderNativeMenuNodes(
			menu,
			projectNativeMenu(
				'sort_menu',
				nodes,
				sortLevelInline && supportsByLevel(activeTab) ? ['by-level'] : [],
			),
		);
		menu.showAtMouseEvent(event);
	}

	function toggleExplorerExpansion(
		origin: 'pointer' | 'keyboard' | 'menu' = 'pointer',
		event?: MouseEvent,
	) {
		invokeSceneAction('toggle-expansion', origin, event);
		expansionRefresh += 1;
		window.requestAnimationFrame(() => {
			expansionRefresh += 1;
		});
	}

	function revealActiveExplorerFile(
		origin: 'pointer' | 'keyboard' | 'menu' = 'pointer',
		event?: MouseEvent,
	) {
		invokeSceneAction('reveal-active-file', origin, event);
	}

	/**
	 * U121-029: the Tools menu is generated from the projection, in projection
	 * order, for exactly the nodes the overflow packer moved out of the bar.
	 *
	 * It used to be a hand-written list of known local ids (`view`, `sort`,
	 * `search`, `reveal-active-file`, `toggle-expansion`, `create-file`,
	 * `create-folder`, `header:*`, `command:*`), each with its own availability
	 * condition. Any projected node outside that list — or one whose menu entry
	 * carried a narrower guard than the node itself — was hidden from the bar
	 * with nowhere to go, so it vanished until the frame grew again. That is why
	 * Text lost `reveal` and `collapse` at min-width while Files kept them: the
	 * `toggle-expansion` entry was additionally gated on
	 * `expansionActionAvailableForActiveTab` and the create entries on
	 * `activeTab === 'files'`.
	 *
	 * Every node already carries the label, icon and action reference the menu
	 * needs, so a generic pass cannot fall out of step with the projection.
	 */
	function openToolsMenu(event: MouseEvent) {
		const menu = new Menu();
		for (const node of panelWidgetProjection.nodes) {
			if (!forcedOverflowIds.includes(node.id)) continue;
			const localId = node.action?.id ?? measuredWidthKey(node.id);
			menu.addItem((item) => {
				item
					.setTitle(node.label)
					.setIcon(node.icon ?? 'lucide-terminal')
					.setDisabled(node.available === false)
					.onClick(() => {
						// The two menu presentations open their native menus; the
						// search node expands the input; everything else is an action
						// reference resolved by the Scene port.
						if (localId === 'view') openNativeViewMenu(event);
						else if (localId === 'sort') openNativeSortMenu(event);
						else if (localId === 'search') expandSearch();
						else invokeSceneAction(localId, 'menu', event);
					});
			});
		}
		menu.showAtMouseEvent(event);
	}

	function refreshExpansionState() {
		expansionRefresh += 1;
	}

	$effect(() => {
		fileList?.setExpansionChangeHandler(refreshExpansionState);
		propExplorer?.setExpansionChangeHandler(refreshExpansionState);
		tagsExplorer?.setExpansionChangeHandler(refreshExpansionState);
		// A07b-1: sin esto el icono expandir/colapsar no se refresca en
		// addons (misma unidad funcional que `hasExpandedNodes` de arriba).
		addonExpansionPort('snippets')?.setExpansionChangeHandler(
			refreshExpansionState,
		);
		addonExpansionPort('plugins')?.setExpansionChangeHandler(
			refreshExpansionState,
		);
		const frame = window.requestAnimationFrame(refreshExpansionState);

		return () => {
			window.cancelAnimationFrame(frame);
			fileList?.setExpansionChangeHandler(undefined);
			propExplorer?.setExpansionChangeHandler(undefined);
			tagsExplorer?.setExpansionChangeHandler(undefined);
			addonExpansionPort('snippets')?.setExpansionChangeHandler(undefined);
			addonExpansionPort('plugins')?.setExpansionChangeHandler(undefined);
		};
	});

	$effect(() => {
		const currentFileList = fileList;
		const currentTagsExplorer = tagsExplorer;
		currentFileList?.setSortStateChangeHandler(handleExternalFilesSortState);
		currentTagsExplorer?.setSortStateChangeHandler?.(
			handleExternalTagsSortState,
		);
		return () => {
			currentFileList?.setSortStateChangeHandler(undefined);
			currentTagsExplorer?.setSortStateChangeHandler?.(undefined);
		};
	});

	$effect(() => {
		return () => {
			stopDrillPick();
			stopRevealPick();
		};
	});

	// U121-109: `configByTab` se siembra UNA vez, al construir el componente, y
	// en ese momento el puerto todavia apunta a la identidad recien acunada. Al
	// llegar el ancla real hay que releer: el `$effect` que aplica la scene
	// depende de `configByTab`, asi que re-sembrarlo basta para que se re-aplique.
	$effect(() =>
		sceneConfigPort.onInstanceChange(() => {
			configByTab = Object.fromEntries(
				TABS.map((tab) => [tab, sceneConfigPort.read(tab)]),
			) as Record<FiltersTab, Required<SceneConfig>>;
		}),
	);

	// U130 toolbar alt-cmenu: empuja el override per-instance del "always
	// reveal" al panel de Files. Lee config y ref: se re-ejecuta cuando cambia
	// cualquiera de los dos (p. ej. al montar files tarde). `auto` devuelve al
	// setting global pasando undefined.
	$effect(() => {
		const mode = configByTab.files?.autoRevealMode ?? 'auto';
		fileList?.setAutoRevealOverride?.(
			mode === 'auto' ? undefined : mode === 'on',
		);
	});

	$effect(() => {
		const tab = activeTab;
		const viewMode = viewModeByTab[tab] ?? 'tree';
		const cells = visibleCellsByTab[tab] ?? defaultVisibleCells(tab, viewMode);
		const interactionMode = interactionModeByTab[tab];
		const sortState = untrack(
			() => sortStateByTab[tab] ?? DEFAULT_SORT_STATE[tab],
		);
		const stickyRows = configByTab[tab].stickyRows;
		const compactFolders = configByTab[tab].compactFolders;
		const indent = configByTab[tab].indent;
		const groupPreset = configByTab[tab].groupPreset;
		const hiddenGroupIds = configByTab[tab].hiddenGroupIds;
		const groupMemberships = configByTab[tab].groupMemberships;
		applyTabProjection(tab, {
			viewMode,
			visibleCells: cells,
			sortState,
			interactionMode,
			stickyRows,
			compactFolders,
			indent,
			groupPreset,
			hiddenGroupIds,
			groupMemberships,
		});
		if (tab === 'files' && fileList) {
			fileList.setInteractionModeChangeHandler?.((mode) => {
				if (interactionModeByTab['files'] !== mode) {
					commitConfig('files', { interactionMode: mode });
				}
			});
		}
		// Spec 08 §3.3: the cmenu's `Create group with selected` lands here,
		// where the scene's groups and the per-instance preset live (U130-09).
		explorerPortForTab(tab)?.setCreateGroupHandler?.(
			(urns) => void createCustomGroup(tab, urns),
		);
		if (tab === 'props' && propExplorer) {
			propExplorer.setInteractionModeChangeHandler?.((mode) => {
				if (interactionModeByTab['props'] !== mode) {
					commitConfig('props', { interactionMode: mode });
				}
			});
		}
	});
</script>

{#snippet searchControl(variant: SearchControlVariant)}
	<SearchControl
		{variant}
		value={filtersSearch}
		placeholder={translate('filter.search_placeholder')}
		styleOrder={variant === 'inline'
			? panelWidgetNodeOrder('search')
			: undefined}
		clearLabel={translate('filter.search_clear')}
		{trailingActionIds}
		toggleState={trailingToggleState}
		resolve={resolveSearchCell}
		{translate}
		onInvoke={runSearchCell}
		onValueChange={setFiltersSearch}
		{icon}
	/>
{/snippet}

{#snippet transactionBarSlot()}
	{#if transactionBar}
		<BarTransaction
			state={transactionBar}
			resolve={resolveSearchCell}
			{translate}
			{icon}
			onToggleMoveKind={transactionBar.onToggleMoveKind ?? (() => {})}
		/>
	{/if}
{/snippet}

<div
	class="vaultman-navbar-filters vaultman-glass vaultman-glass--top"
	bind:this={navbarEl}
>
	{#if transactionBar?.placement === 'above-search'}
		{@render transactionBarSlot()}
	{/if}
	{#if minimalStyle && showSearchInput}
		<div class="vaultman-filters-phone-search-row">
			{@render searchControl('phone')}
		</div>
	{/if}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="vaultman-filters-header-wrap"
		oncontextmenu={(e: MouseEvent) => {
			const target = e.target as HTMLElement | null;
			if (target?.closest?.('[data-panel-widget-node-id]')) return;
			e.preventDefault();
			openToolbarEmptyMenu(e);
		}}
	>
		{#if headerMode === 'header'}
			<div
				class="vaultman-filters-header"
				class:vaultman-filters-header--minimal={minimalStyle}
				class:nav-header={minimalStyle}
			>
				<div
					class="vaultman-filters-actions"
					class:nav-buttons-container={minimalStyle}
					class:vaultman-filters-actions--scroll={toolbarScroll}
					class:vaultman-filters-actions--wrap={toolbarWrap}
					bind:this={actionsEl}
				>
					{#if minimalStyle && tabOptions.length > 0 && toolbarNodeVisible('tabs')}
						<div
							class={headerActionClass}
							class:vaultman-header-action-with-label={tabsButtonLabelEffective}
							data-panel-widget-node-id={panelWidgetNodeId('tabs')}
							style:order={panelWidgetNodeOrder('tabs')}
							role="button"
							tabindex="0"
							aria-label={currentTabsLabel}
							title={minimalStyle ? undefined : currentTabsLabel}
							onclick={(event: MouseEvent) => openScenePopup(event)}
							oncontextmenu={(e: MouseEvent) => {
								e.preventDefault();
								e.stopPropagation();
								openNodeAltMenu('tabs', e);
							}}
							onkeydown={(e: KeyboardEvent) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									openScenePopup(
										menuEventFromElement(e.currentTarget as HTMLElement),
									);
								}
							}}
						>
							<span
								class="vaultman-header-action-icon"
								aria-hidden="true"
								use:icon={currentTabsIcon}
							></span>
							{#if tabsButtonLabelEffective && currentTabsOption}
								<span class="vaultman-header-action-label">
									{currentTabsOption.label}
								</span>
							{/if}
						</div>
					{/if}
					{#each headerActions as action (action.id)}
						{#if toolbarNodeVisible(`header:${action.id}`)}
							<div
								class={headerActionClass}
								class:is-disabled={action.disabled}
								class:is-active={action.checked}
								class:vaultman-reveal-out-of-list={headerRevealFaint &&
									REVEAL_HEADER_ACTION_IDS.has(action.id)}
								data-panel-widget-node-id={panelWidgetNodeId(
									`header:${action.id}`,
								)}
								style:order={panelWidgetNodeOrder(`header:${action.id}`)}
								role="button"
								tabindex={action.disabled ? -1 : 0}
								aria-label={action.label}
								aria-pressed={action.checked}
								aria-disabled={action.disabled ? 'true' : undefined}
								title={minimalStyle ? undefined : action.label}
								onclick={(event: MouseEvent) => {
									if (action.disabled) return;
									invokeSceneAction(`header:${action.id}`, 'pointer', event);
								}}
								oncontextmenu={(e: MouseEvent) => {
									e.preventDefault();
									e.stopPropagation();
									openNodeAltMenu(`header:${action.id}`, e);
								}}
								onkeydown={(e: KeyboardEvent) => {
									if (action.disabled) return;
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										invokeSceneAction(
											`header:${action.id}`,
											'keyboard',
											menuEventFromElement(e.currentTarget as HTMLElement),
										);
									}
								}}
								use:icon={action.icon}
							></div>
						{/if}
					{/each}
					{#if showExplorerControls}
						{#if toolbarNodeVisible('view')}
							<div
								class={headerActionClass}
								data-panel-widget-node-id={panelWidgetNodeId('view')}
								style:order={panelWidgetNodeOrder('view')}
								role="button"
								tabindex="0"
								aria-label={translate('filter.viewmode_btn')}
								title={minimalStyle
									? undefined
									: translate('filter.viewmode_btn')}
								onclick={(event: MouseEvent) => openViewModePopup(event)}
								oncontextmenu={(e: MouseEvent) => {
									e.preventDefault();
									e.stopPropagation();
									openNodeAltMenu('view', e);
								}}
								onkeydown={(e: KeyboardEvent) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										openViewModePopup(
											minimalStyle
												? menuEventFromElement(e.currentTarget as HTMLElement)
												: undefined,
										);
									}
								}}
								use:icon={'lucide-layout-list'}
							></div>
						{/if}
						{#if toolbarNodeVisible('sort')}
							<div
								class={headerActionClass}
								data-panel-widget-node-id={panelWidgetNodeId('sort')}
								style:order={panelWidgetNodeOrder('sort')}
								role="button"
								tabindex="0"
								aria-label={translate('filter.sort_btn')}
								title={minimalStyle ? undefined : translate('filter.sort_btn')}
								onclick={(event: MouseEvent) => openSortPopup(event)}
								oncontextmenu={(e: MouseEvent) => {
									e.preventDefault();
									e.stopPropagation();
									openNodeAltMenu('sort', e);
								}}
								onkeydown={(e: KeyboardEvent) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										openSortPopup(
											minimalStyle
												? menuEventFromElement(e.currentTarget as HTMLElement)
												: undefined,
										);
									}
								}}
								use:icon={'lucide-arrow-up-down'}
							></div>
						{/if}
						{#if minimalStyle && toolbarNodeVisible('search')}
							<div
								class={headerActionClass}
								class:is-active={searchExpanded}
								data-vaultman-search-toggle="true"
								data-panel-widget-node-id={panelWidgetNodeId('search')}
								style:order={panelWidgetNodeOrder('search')}
								role="button"
								tabindex="0"
								aria-label={translate('explorer.btn.search')}
								aria-pressed={searchExpanded}
								title={minimalStyle
									? undefined
									: translate('explorer.btn.search')}
								onclick={toggleSearch}
								oncontextmenu={(e: MouseEvent) => {
									e.preventDefault();
									e.stopPropagation();
									openNodeAltMenu('search', e);
								}}
								onkeydown={(e: KeyboardEvent) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										toggleSearch();
									}
								}}
								use:icon={'lucide-search'}
							></div>
						{/if}
						{#if showSearchInput && !searchOwnsRow}
							{@render searchControl('inline')}
						{:else if !minimalStyle}
							<div
								class={headerActionClass}
								role="button"
								tabindex="0"
								aria-label={translate('explorer.btn.search')}
								title={minimalStyle
									? undefined
									: translate('explorer.btn.search')}
								onclick={expandSearch}
								onkeydown={(e: KeyboardEvent) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										expandSearch();
									}
								}}
								use:icon={'lucide-search'}
							></div>
						{/if}
						{#if activeTab === 'files' && toolbarNodeVisible('reveal-active-file')}
							<div
								class={headerActionClass}
								class:vaultman-reveal-out-of-list={filesRevealFaint}
								data-panel-widget-node-id={panelWidgetNodeId(
									'reveal-active-file',
								)}
								style:order={panelWidgetNodeOrder('reveal-active-file')}
								role="button"
								tabindex="0"
								aria-label={translate('filter.auto_reveal')}
								title={minimalStyle
									? undefined
									: translate('filter.auto_reveal')}
								onclick={(event) => revealActiveExplorerFile('pointer', event)}
								oncontextmenu={(e: MouseEvent) => {
									e.preventDefault();
									e.stopPropagation();
									openNodeAltMenu('reveal-active-file', e);
								}}
								onkeydown={(e: KeyboardEvent) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										revealActiveExplorerFile(
											'keyboard',
											menuEventFromElement(e.currentTarget as HTMLElement),
										);
									}
								}}
								use:icon={'lucide-gallery-vertical'}
							></div>
						{/if}
						{#if expansionActionAvailableForActiveTab && toolbarNodeVisible('toggle-expansion')}
							<div
								class={headerActionClass}
								data-panel-widget-node-id={panelWidgetNodeId(
									'toggle-expansion',
								)}
								style:order={panelWidgetNodeOrder('toggle-expansion')}
								role="button"
								tabindex="0"
								aria-label={expansionLabel}
								title={minimalStyle ? undefined : expansionLabel}
								onclick={(event) => toggleExplorerExpansion('pointer', event)}
								oncontextmenu={(e: MouseEvent) => {
									e.preventDefault();
									e.stopPropagation();
									openNodeAltMenu('toggle-expansion', e);
								}}
								onkeydown={(e: KeyboardEvent) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										toggleExplorerExpansion(
											'keyboard',
											menuEventFromElement(e.currentTarget as HTMLElement),
										);
									}
								}}
								use:icon={expansionIcon}
							></div>
						{/if}
						{#if activeTab === 'files' && createActionsPlacement === 'toolbar'}
							<!-- BT5-022: built-in Create File/Folder as toolbar nodes. -->
							{#if toolbarNodeVisible('create-file')}
								<div
									class={headerActionClass}
									data-panel-widget-node-id={panelWidgetNodeId('create-file')}
									style:order={panelWidgetNodeOrder('create-file')}
									role="button"
									tabindex="0"
									aria-label={translate('folder.ctx.new_note')}
									title={minimalStyle
										? undefined
										: translate('folder.ctx.new_note')}
									onclick={(event) =>
										invokeSceneAction('create-file', 'pointer', event)}
									oncontextmenu={(e: MouseEvent) => {
										e.preventDefault();
										e.stopPropagation();
										openNodeAltMenu('create-file', e);
									}}
									onkeydown={(e: KeyboardEvent) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											invokeSceneAction(
												'create-file',
												'keyboard',
												menuEventFromElement(e.currentTarget as HTMLElement),
											);
										}
									}}
									use:icon={'lucide-file-plus'}
								></div>
							{/if}
							{#if toolbarNodeVisible('create-folder')}
								<div
									class={headerActionClass}
									data-panel-widget-node-id={panelWidgetNodeId('create-folder')}
									style:order={panelWidgetNodeOrder('create-folder')}
									role="button"
									tabindex="0"
									aria-label={translate('folder.ctx.new_folder')}
									title={minimalStyle
										? undefined
										: translate('folder.ctx.new_folder')}
									onclick={(event) =>
										invokeSceneAction('create-folder', 'pointer', event)}
									oncontextmenu={(e: MouseEvent) => {
										e.preventDefault();
										e.stopPropagation();
										openNodeAltMenu('create-folder', e);
									}}
									onkeydown={(e: KeyboardEvent) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											invokeSceneAction(
												'create-folder',
												'keyboard',
												menuEventFromElement(e.currentTarget as HTMLElement),
											);
										}
									}}
									use:icon={'lucide-folder-plus'}
								></div>
							{/if}
						{/if}
						{#each commandActions as command (command.id)}
							{#if toolbarNodeVisible(`command:${command.id}`)}
								<!-- BT5-024: Obsidian commands projected as toolbar nodes. -->
								<div
									class={headerActionClass}
									class:is-disabled={!command.available}
									data-panel-widget-node-id={panelWidgetNodeId(
										`command:${command.id}`,
									)}
									style:order={panelWidgetNodeOrder(`command:${command.id}`)}
									role="button"
									tabindex="0"
									aria-label={command.label}
									title={command.available
										? command.label
										: translate('command.unavailable').replace(
												'{id}',
												command.id,
											)}
									onclick={() => {
										if (command.available) {
											invokeSceneAction(`command:${command.id}`, 'pointer');
										}
									}}
									oncontextmenu={(e: MouseEvent) => {
										e.preventDefault();
										e.stopPropagation();
										openNodeAltMenu(`command:${command.id}`, e);
									}}
									onkeydown={(e: KeyboardEvent) => {
										if (
											command.available &&
											(e.key === 'Enter' || e.key === ' ')
										) {
											e.preventDefault();
											invokeSceneAction(`command:${command.id}`, 'keyboard');
										}
									}}
									use:icon={command.icon ?? 'lucide-terminal'}
								></div>
							{/if}
						{/each}
						<span
							class="vaultman-panel-widget-tools-measure"
							data-panel-widget-tools-measure
							aria-hidden="true"
							use:icon={'lucide-tool-case'}
						></span>
						{#if compactPanelWidgetTools}
							<div
								class={headerActionClass}
								style:order={panelWidgetProjection.nodes.length}
								role="button"
								tabindex="0"
								aria-label={translate('filter.tools')}
								onclick={(event: MouseEvent) => openToolsMenu(event)}
								onkeydown={(e: KeyboardEvent) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										openToolsMenu(
											menuEventFromElement(e.currentTarget as HTMLElement),
										);
									}
								}}
								use:icon={'lucide-tool-case'}
							></div>
						{/if}
					{/if}
				</div>
				<!-- U121-029: the expanded search field as a second row under the
				     toolbar, whenever the action row cannot spare a usable width for
				     it. A sibling of the action row rather than a wrapped flex item,
				     so the packer's single-line assumption stays true and the Tools
				     button can never be the thing that wraps. -->
				{#if minimalStyle && showSearchInput && searchOwnsRow}
					<div class="vaultman-filters-search-row">
						{@render searchControl('row')}
					</div>
				{/if}
				{#if transactionBar?.placement === 'below-search'}
					{@render transactionBarSlot()}
				{/if}
			</div>
		{:else if headerMode === 'sort'}
			<div
				class="vaultman-filters-popup-slot"
				class:popup-enter-from-left={headerExitDir === 'right'}
				class:popup-enter-from-right={headerExitDir === 'left'}
			>
				<SortPopup
					{activeTab}
					onClose={closeHeaderPopup}
					onSortChange={handleSortChange}
					onFilterChange={handleFilterChange}
					onScopeChange={handleScopeChange}
					onRequestDrillPick={() => beginDrillPick(activeTab)}
					onRequestLevelPick={() => beginLevelPick(activeTab)}
					onActivateScope={(key) => activateScopeRow(activeTab, key)}
					onHideScope={(key, hidden) => setScopeHidden(activeTab, key, hidden)}
					onDeleteScope={(key) => deleteScope(activeTab, key)}
					scopeScene={scopeSceneFor(activeTab)}
					initialSortState={sortStateByTab[activeTab]}
					nestedActive={nestedActiveFor(activeTab)}
					{revealActive}
					onRequestRevealPick={() => void beginRevealPick(activeTab)}
					treeCapable={treeCapableFor(activeTab)}
					groupPreset={configByTab[activeTab].groupPreset}
					customGroups={customGroupsForMenu(activeTab)}
					canCreateGroup={canCreateGroup()}
					onGroupPresetChange={(kind) => selectGroupPreset(activeTab, kind)}
					onNewGroup={() => void createCustomGroup(activeTab)}
					onHideGroup={(id, hidden) => setGroupHidden(activeTab, id, hidden)}
					onDeleteGroup={(id) => deleteCustomGroup(activeTab, id)}
					{icon}
				/>
			</div>
		{:else if headerMode === 'viewmode'}
			<div
				class="vaultman-filters-popup-slot"
				class:popup-enter-from-left={headerExitDir === 'right'}
				class:popup-enter-from-right={headerExitDir === 'left'}
			>
				<ViewModePopup
					{activeTab}
					selectionMode={interactionModeByTab[activeTab] === 'select'}
					onClose={closeHeaderPopup}
					onViewModeChange={handleViewModeChange}
					onPillsChange={handlePillsChange}
					onAddModeChange={(active) => {
						if (!interactionModesForTab(activeTab).includes('add')) return;
						selectInteractionMode(
							activeTab,
							active ? 'add' : DEFAULT_INTERACTION_MODE[activeTab],
						);
					}}
					initialViewMode={viewModeByTab[activeTab]}
					initialPills={visibleCellsByTab[activeTab]}
					{addOpCount}
					{icon}
				/>
			</div>
		{/if}
	</div>
</div>
