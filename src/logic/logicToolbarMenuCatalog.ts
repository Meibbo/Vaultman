import type { ExplorerTabId, ExplorerViewMode } from '../types/typeUI';
import { EXPLORER_CELL_DEFS, type ExplorerCellDef } from './logicCellRegistry';
import { viewModesForDataSurface } from './logicExplorerViewModes';
import { interactionModesForTab, type InteractionMode } from './logicInteractionMode';
import {
	GROUP_PRESET_META,
	NODE_TYPE_MENU_OPTIONS,
	SORT_MENU_OPTIONS,
	sortScopeOptions,
} from './logicSortMenu';
import { GROUP_PRESETS_BY_TAB } from '../types/typeGroupPreset';

export const TOOLBAR_MENU_KINDS = [
	'scene_menu',
	'view_menu',
	'sort_menu',
] as const;

export type ToolbarMenuKind = (typeof TOOLBAR_MENU_KINDS)[number];
export type ToolbarMenuRequirement =
	| 'view_menu.engines.nested'
	| 'view_menu.engines.parents_first';

export type ToolbarMenuAvailability = {
	readonly tabs: readonly ExplorerTabId[];
	readonly viewModes?: readonly ExplorerViewMode[];
	readonly requiresSavedLayout?: boolean;
	readonly requiresRevealAnchor?: boolean;
	readonly runtimeChildren?: 'custom-groups' | 'node-types' | 'saved-layouts' | 'scope-rows';
	readonly unavailableInMinimalStyle?: boolean;
	readonly requiresCellsOff?: readonly string[];
};

export type ToolbarMenuActionDefinition = {
	readonly id: string;
	readonly labelKey: string;
	readonly icon: string;
	readonly section: string;
	readonly submenu?: string;
	readonly requires: readonly ToolbarMenuRequirement[];
	readonly availability: ToolbarMenuAvailability;
};

const EXPLORER_TABS = [
	'files',
	'props',
	'tags',
	'snippets',
	'plugins',
] as const satisfies readonly ExplorerTabId[];
const HIERARCHICAL_TABS = ['files', 'props', 'tags'] as const satisfies readonly ExplorerTabId[];
const NO_REQUIREMENTS: readonly ToolbarMenuRequirement[] = [];
const ALL_TABS_AVAILABILITY: ToolbarMenuAvailability = { tabs: EXPLORER_TABS };
const HIERARCHICAL_AVAILABILITY: ToolbarMenuAvailability = {
	tabs: HIERARCHICAL_TABS,
};

function uniqueByKey<T>(
	entries: readonly T[],
	keyFor: (entry: T) => string,
): readonly T[] {
	const seen = new Set<string>();
	return entries.filter((entry) => {
		const key = keyFor(entry);
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

function availabilityForCell(definition: ExplorerCellDef): ToolbarMenuAvailability {
	const supports = EXPLORER_CELL_DEFS
		.filter((candidate) => candidate.id === definition.id)
		.flatMap((candidate) => candidate.supports);
	const viewModes = uniqueByKey(
		supports.flatMap((support) => support.viewModes ?? []),
		(mode) => mode,
	);
	return {
		tabs: uniqueByKey(supports, (support) => support.explorer).map(
			(support) => support.explorer,
		),
		...(supports.every((support) => support.viewModes !== undefined) &&
		viewModes.length > 0
			? { viewModes }
			: {}),
		...(definition.requiresCellsOff
			? { requiresCellsOff: definition.requiresCellsOff }
			: {}),
	};
}

const SCENE_MENU_ACTIONS: readonly ToolbarMenuActionDefinition[] = [
	{ id: 'scene_menu.tab.files', labelKey: 'filter.tab.files', icon: 'lucide-folder', section: 'tabs', requires: NO_REQUIREMENTS, availability: ALL_TABS_AVAILABILITY },
	{ id: 'scene_menu.tab.props', labelKey: 'filter.tab.props', icon: 'lucide-archive', section: 'tabs', requires: NO_REQUIREMENTS, availability: ALL_TABS_AVAILABILITY },
	{ id: 'scene_menu.tab.tags', labelKey: 'filter.tab.tags', icon: 'lucide-tag', section: 'tabs', requires: NO_REQUIREMENTS, availability: ALL_TABS_AVAILABILITY },
	{ id: 'scene_menu.tab.content', labelKey: 'filter.tab.content', icon: 'lucide-file-search', section: 'tabs', requires: NO_REQUIREMENTS, availability: ALL_TABS_AVAILABILITY },
	{ id: 'scene_menu.tab.snippets', labelKey: 'filter.tab.snippets', icon: 'lucide-file-code', section: 'tabs', requires: NO_REQUIREMENTS, availability: ALL_TABS_AVAILABILITY },
	{ id: 'scene_menu.tab.plugins', labelKey: 'filter.tab.plugins', icon: 'lucide-plug', section: 'tabs', requires: NO_REQUIREMENTS, availability: ALL_TABS_AVAILABILITY },
	{ id: 'scene_menu.launcher.filters', labelKey: 'filters.active', icon: 'lucide-filter', section: 'launchers', requires: NO_REQUIREMENTS, availability: ALL_TABS_AVAILABILITY },
	{ id: 'scene_menu.launcher.queue', labelKey: 'ops.tab.queue', icon: 'lucide-list-checks', section: 'launchers', requires: NO_REQUIREMENTS, availability: ALL_TABS_AVAILABILITY },
	{ id: 'scene_menu.launcher.statistics', labelKey: 'nav.statistics', icon: 'lucide-chart-column', section: 'statistics', requires: NO_REQUIREMENTS, availability: ALL_TABS_AVAILABILITY },
	{ id: 'scene_menu.floating_toc', labelKey: 'floating_toc.menu', icon: 'lucide-a-arrow-down', section: 'floating-toc', requires: NO_REQUIREMENTS, availability: ALL_TABS_AVAILABILITY },
];

const INTERACTION_ICONS: Readonly<Record<InteractionMode, string>> = {
	open: 'lucide-folder-open',
	filter: 'lucide-list-filter',
	add: 'lucide-plus',
	input: 'lucide-pencil',
	select: 'lucide-mouse-pointer-2',
};

const VIEW_MENU_ACTIONS: readonly ToolbarMenuActionDefinition[] = [
	{ id: 'view_menu.interaction', labelKey: 'viewmenu.interaction', icon: 'lucide-mouse-pointer-click', section: 'interaction', submenu: 'interaction', requires: NO_REQUIREMENTS, availability: ALL_TABS_AVAILABILITY },
	...uniqueByKey(EXPLORER_TABS.flatMap((tab) => interactionModesForTab(tab)), (mode) => mode).map((mode) => ({ id: `view_menu.interaction.${mode}`, labelKey: `viewmenu.interaction.${mode}`, icon: INTERACTION_ICONS[mode], section: 'interaction', submenu: 'interaction', requires: NO_REQUIREMENTS, availability: { tabs: EXPLORER_TABS.filter((tab) => interactionModesForTab(tab).includes(mode)) } })),
	{ id: 'view_menu.layouts', labelKey: 'viewmenu.layouts', icon: 'lucide-layout-template', section: 'layouts', submenu: 'layouts', requires: NO_REQUIREMENTS, availability: { ...ALL_TABS_AVAILABILITY, runtimeChildren: 'saved-layouts' } },
	{ id: 'view_menu.layouts.save', labelKey: 'viewmenu.save_layout', icon: 'lucide-save', section: 'layouts', submenu: 'layouts', requires: NO_REQUIREMENTS, availability: { ...ALL_TABS_AVAILABILITY, requiresSavedLayout: true } },
	...uniqueByKey(EXPLORER_CELL_DEFS.filter((definition) => definition.role !== 'topology'), (definition) => definition.id).map((definition) => ({ id: `view_menu.cells.${definition.id}`, labelKey: definition.labelKey, icon: definition.icon, section: 'cells', requires: NO_REQUIREMENTS, availability: availabilityForCell(definition) })),
	{ id: 'view_menu.toolbar', labelKey: 'viewmenu.toolbar', icon: 'lucide-panel-top', section: 'toolbar', requires: NO_REQUIREMENTS, availability: ALL_TABS_AVAILABILITY },
	{ id: 'view_menu.engines', labelKey: 'viewmenu.engines', icon: 'lucide-layout', section: 'engines', submenu: 'engines', requires: NO_REQUIREMENTS, availability: ALL_TABS_AVAILABILITY },
	...uniqueByKey(EXPLORER_TABS.flatMap((tab) => viewModesForDataSurface(tab)), (option) => option.id).map((option) => ({ id: `view_menu.engines.${option.id}`, labelKey: option.labelKey, icon: option.icon, section: 'engines', submenu: 'engines', requires: NO_REQUIREMENTS, availability: { tabs: EXPLORER_TABS.filter((tab) => viewModesForDataSurface(tab).some((candidate) => candidate.id === option.id)), ...(option.id === 'dnd' ? { unavailableInMinimalStyle: true } : {}) } })),
	{ id: 'view_menu.engines.nested', labelKey: 'sort.level.nested', icon: 'lucide-list-tree', section: 'engines', submenu: 'engines', requires: NO_REQUIREMENTS, availability: ALL_TABS_AVAILABILITY },
	{ id: 'view_menu.engines.indent', labelKey: 'sort.level.indent', icon: 'lucide-indent', section: 'engines', submenu: 'engines', requires: NO_REQUIREMENTS, availability: { tabs: HIERARCHICAL_TABS, viewModes: ['tree', 'dnd'] } },
	{ id: 'view_menu.engines.parents_first', labelKey: 'sort.parents_first', icon: 'lucide-folder-tree', section: 'engines', submenu: 'engines', requires: ['view_menu.engines.nested'], availability: { tabs: ['files'] } },
	{ id: 'view_menu.engines.fixed_folders', labelKey: 'sort.level.fixed_folders', icon: 'lucide-folder-lock', section: 'engines', submenu: 'engines', requires: ['view_menu.engines.nested', 'view_menu.engines.parents_first'], availability: { tabs: ['files'] } },
	{ id: 'view_menu.engines.sticky_rows', labelKey: 'sort.level.sticky_rows', icon: 'lucide-pin', section: 'engines', submenu: 'engines', requires: ['view_menu.engines.nested'], availability: HIERARCHICAL_AVAILABILITY },
	{ id: 'view_menu.engines.compact_folders', labelKey: 'sort.level.compact_folders', icon: 'lucide-folder-minus', section: 'engines', submenu: 'engines', requires: ['view_menu.engines.nested'], availability: { tabs: ['files'] } },
];

const GROUP_PRESETS = uniqueByKey(
	EXPLORER_TABS.flatMap((tab) => GROUP_PRESETS_BY_TAB[tab]),
	(preset) => preset,
);
const SCOPE_OPTIONS = uniqueByKey(
	HIERARCHICAL_TABS.flatMap((tab) => sortScopeOptions(tab)),
	(option) => option.scope,
);
const NODE_TYPE_TABS = ['files', 'props', 'tags'] as const;

const SORT_MENU_ACTIONS: readonly ToolbarMenuActionDefinition[] = [
	{ id: 'sort_menu.scope', labelKey: 'sort.scope.title', icon: 'lucide-layers', section: 'scope', submenu: 'scope', requires: NO_REQUIREMENTS, availability: HIERARCHICAL_AVAILABILITY },
	...SCOPE_OPTIONS.map((option) => ({ id: `sort_menu.scope.${option.scope}`, labelKey: option.labelKey, icon: option.icon, section: 'scope', submenu: 'scope', requires: NO_REQUIREMENTS, availability: HIERARCHICAL_AVAILABILITY })),
	{ id: 'sort_menu.scope.level', labelKey: 'sort.level.select_level', icon: 'lucide-list-tree', section: 'scope', submenu: 'scope', requires: NO_REQUIREMENTS, availability: HIERARCHICAL_AVAILABILITY },
	{ id: 'sort_menu.groups', labelKey: 'group.menu.title', icon: 'lucide-group', section: 'groups', submenu: 'groups', requires: NO_REQUIREMENTS, availability: { ...ALL_TABS_AVAILABILITY, runtimeChildren: 'custom-groups' } },
	...GROUP_PRESETS.map((preset) => ({ id: `sort_menu.groups.${preset}`, labelKey: GROUP_PRESET_META[preset].labelKey, icon: GROUP_PRESET_META[preset].icon, section: 'groups', submenu: 'groups', requires: NO_REQUIREMENTS, availability: { tabs: EXPLORER_TABS.filter((tab) => GROUP_PRESETS_BY_TAB[tab].includes(preset)) } })),
	{ id: 'sort_menu.groups.new', labelKey: 'group.new', icon: 'lucide-folder-plus', section: 'groups', submenu: 'groups', requires: NO_REQUIREMENTS, availability: { ...ALL_TABS_AVAILABILITY, requiresSavedLayout: true } },
	...EXPLORER_TABS.flatMap((tab) => SORT_MENU_OPTIONS[tab].map((option) => ({ id: `sort_menu.sort.${tab}.${option.id}`, labelKey: option.labelKey, icon: option.icon, section: 'sort', requires: NO_REQUIREMENTS, availability: { tabs: [tab] } }))),
	{ id: 'sort_menu.by_level', labelKey: 'sort.level.title', icon: 'lucide-list-tree', section: 'by-level', submenu: 'by-level', requires: NO_REQUIREMENTS, availability: HIERARCHICAL_AVAILABILITY },
	{ id: 'sort_menu.by_level.reveal_current_file', labelKey: 'sort.reveal.current_file', icon: 'lucide-file-clock', section: 'by-level', submenu: 'by-level', requires: NO_REQUIREMENTS, availability: { tabs: ['props', 'tags'], requiresRevealAnchor: true } },
	{ id: 'sort_menu.by_level.reveal_drill', labelKey: 'sort.reveal.drill', icon: 'lucide-pin', section: 'by-level', submenu: 'by-level', requires: NO_REQUIREMENTS, availability: { tabs: ['props', 'tags'], requiresRevealAnchor: true } },
	{ id: 'sort_menu.by_level.add_property_first', labelKey: 'sort.level.add_property_first', icon: 'lucide-list-plus', section: 'by-level', submenu: 'by-level', requires: NO_REQUIREMENTS, availability: { tabs: ['props'], requiresRevealAnchor: true } },
	{ id: 'sort_menu.filtered', labelKey: 'sort.level.filtered', icon: 'lucide-filter', section: 'filtered', requires: NO_REQUIREMENTS, availability: HIERARCHICAL_AVAILABILITY },
	{ id: 'sort_menu.by_type', labelKey: 'explorer.sort.type', icon: 'lucide-list-filter', section: 'by-type', submenu: 'by-type', requires: NO_REQUIREMENTS, availability: { tabs: NODE_TYPE_TABS, runtimeChildren: 'node-types' } },
	...NODE_TYPE_TABS.flatMap((tab) => NODE_TYPE_MENU_OPTIONS[tab].map((option) => ({ id: `sort_menu.by_type.${tab}.${option.id}`, labelKey: option.labelKey, icon: option.icon, section: 'by-type', submenu: 'by-type', requires: NO_REQUIREMENTS, availability: { tabs: [tab] } }))),
];

export const TOOLBAR_MENU_CATALOGS: Readonly<
	Record<ToolbarMenuKind, readonly ToolbarMenuActionDefinition[]>
> = {
	scene_menu: SCENE_MENU_ACTIONS,
	view_menu: VIEW_MENU_ACTIONS,
	sort_menu: SORT_MENU_ACTIONS,
};

export const TOOLBAR_MENU_CANONICAL_ORDER: Readonly<
	Record<ToolbarMenuKind, readonly string[]>
> = {
	scene_menu: SCENE_MENU_ACTIONS.map((action) => action.id),
	view_menu: VIEW_MENU_ACTIONS.map((action) => action.id),
	sort_menu: SORT_MENU_ACTIONS.map((action) => action.id),
};

export function toolbarMenuCatalog(
	kind: ToolbarMenuKind,
): readonly ToolbarMenuActionDefinition[] {
	return TOOLBAR_MENU_CATALOGS[kind];
}

export function toolbarMenuActionIds(kind: ToolbarMenuKind): readonly string[] {
	return TOOLBAR_MENU_CANONICAL_ORDER[kind];
}

export function toolbarMenuActionsWithSatisfiedRequirements(
	kind: ToolbarMenuKind,
	satisfiedRequirements: readonly ToolbarMenuRequirement[],
): readonly ToolbarMenuActionDefinition[] {
	const satisfied = new Set(satisfiedRequirements);
	return toolbarMenuCatalog(kind).filter((action) =>
		action.requires.every((requirement) => satisfied.has(requirement)),
	);
}
