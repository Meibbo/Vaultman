import type {
	ExplorerSortState,
	ExplorerTabId,
	SortScopeKey,
} from '../types/typeUI';
import { isSortOptionVisible } from './logicScopedSort';
import { PROP_TYPE_ORDER, TYPE_ICON_MAP } from './propTypes';
import { TAG_STRUCTURE_ORDER } from './logicExplorerHierarchy';

export interface SortMenuOption {
	id: string;
	icon: string;
	labelKey: string;
}

export interface NodeTypeMenuOption {
	id: string;
	icon: string;
	label?: string;
	labelKey?: string;
}

interface BuiltInNodeTypeMenuOption extends NodeTypeMenuOption {
	labelKey: string;
}

export const SORT_MENU_OPTIONS: Record<
	ExplorerTabId,
	readonly SortMenuOption[]
> = {
	props: [
		{ id: 'type', icon: 'lucide-shapes', labelKey: 'sort.by.type' },
		{ id: 'parent', icon: 'lucide-corner-left-up', labelKey: 'sort.by.parent' },
		{ id: 'count', icon: 'lucide-hash', labelKey: 'sort.by.count' },
		{ id: 'name', icon: 'lucide-a-large-small', labelKey: 'sort.by.name' },
		{
			id: 'mtime',
			icon: 'lucide-calendar-clock',
			labelKey: 'sort.by.modified',
		},
		{
			id: 'ctime',
			icon: 'lucide-calendar-plus',
			labelKey: 'sort.by.created',
		},
		{ id: 'sub', icon: 'lucide-indent', labelKey: 'sort.by.sub' },
		// Last on purpose: it only appears while a note is anchored, and a
		// leading slot would shift every other option each time reveal toggles.
		{ id: 'custom', icon: 'lucide-file-cog', labelKey: 'sort.by.custom' },
	],
	tags: [
		{ id: 'type', icon: 'lucide-shapes', labelKey: 'sort.by.type' },
		{ id: 'parent', icon: 'lucide-corner-left-up', labelKey: 'sort.by.parent' },
		{ id: 'count', icon: 'lucide-hash', labelKey: 'sort.by.count' },
		{ id: 'name', icon: 'lucide-a-large-small', labelKey: 'sort.by.name' },
		{
			id: 'mtime',
			icon: 'lucide-calendar-clock',
			labelKey: 'sort.by.modified',
		},
		{
			id: 'ctime',
			icon: 'lucide-calendar-plus',
			labelKey: 'sort.by.created',
		},
		{ id: 'sub', icon: 'lucide-indent', labelKey: 'sort.by.subtags' },
		{ id: 'custom', icon: 'lucide-file-cog', labelKey: 'sort.by.custom' },
	],
	files: [
		{ id: 'name', icon: 'lucide-a-large-small', labelKey: 'sort.by.name' },
		{ id: 'file-count', icon: 'lucide-files', labelKey: 'stats.files' },
		{ id: 'count', icon: 'lucide-hash', labelKey: 'sort.by.props' },
		{ id: 'words', icon: 'lucide-text', labelKey: 'sort.by.words' },
		{ id: 'tasks', icon: 'lucide-square-check', labelKey: 'sort.by.tasks' },
		{ id: 'ext', icon: 'lucide-file-type', labelKey: 'sort.by.ext' },
		{
			id: 'mtime',
			icon: 'lucide-calendar-clock',
			labelKey: 'sort.by.modified',
		},
		{
			id: 'ctime',
			icon: 'lucide-calendar-plus',
			labelKey: 'sort.by.created',
		},
		{ id: 'opened', icon: 'lucide-history', labelKey: 'sort.by.opened' },
		{ id: 'path', icon: 'lucide-route', labelKey: 'sort.by.path' },
	],
	snippets: [
		{ id: 'state', icon: 'lucide-toggle-right', labelKey: 'sort.by.state' },
		{ id: 'name', icon: 'lucide-a-large-small', labelKey: 'sort.by.name' },
		{
			id: 'installed',
			icon: 'lucide-calendar-plus',
			labelKey: 'sort.by.installed',
		},
		{
			id: 'updated',
			icon: 'lucide-calendar-clock',
			labelKey: 'sort.by.updated',
		},
	],
	plugins: [
		{ id: 'state', icon: 'lucide-toggle-right', labelKey: 'sort.by.state' },
		{ id: 'name', icon: 'lucide-a-large-small', labelKey: 'sort.by.name' },
		{
			id: 'installed',
			icon: 'lucide-calendar-plus',
			labelKey: 'sort.by.installed',
		},
		{
			id: 'updated',
			icon: 'lucide-calendar-clock',
			labelKey: 'sort.by.updated',
		},
	],
};

export const NODE_TYPE_MENU_OPTIONS: Record<
	'props' | 'tags' | 'files',
	readonly BuiltInNodeTypeMenuOption[]
> = {
	props: [
		{ id: 'all', icon: 'lucide-list-filter', labelKey: 'sort.type.all' },
		{ id: 'props-only', icon: 'lucide-type', labelKey: 'sort.type.props_only' },
		...PROP_TYPE_ORDER.map((id) => ({
			id,
			icon: TYPE_ICON_MAP[id],
			labelKey: `sort.type.${id}`,
		})),
	],
	tags: [
		{ id: 'all', icon: 'lucide-tags', labelKey: 'sort.type.all' },
		...TAG_STRUCTURE_ORDER.map((id) => ({
			id,
			icon: id === 'nested' ? 'lucide-git-branch' : 'lucide-tag',
			labelKey: `sort.type.${id}`,
		})),
	],
	files: [
		{ id: 'all', icon: 'lucide-files', labelKey: 'sort.type.all' },
		{ id: 'folders-only', icon: 'lucide-folder', labelKey: 'sort.type.folders' },
	],
};

interface ByLevelBaseItem {
	icon: string;
	labelKey: string;
	checked: boolean;
}

export interface ByLevelToggleItem extends ByLevelBaseItem {
	kind: 'toggle';
	id: 'nested' | 'parentsFirst' | 'fixedFolders';
}

export interface ByLevelScopeItem extends ByLevelBaseItem {
	kind: 'scope';
	id: SortScopeKey;
	scope: SortScopeKey;
}

export interface ByLevelSeparatorItem {
	kind: 'separator';
	id: 'scope-separator';
}

export type ByLevelMenuItem =
	| ByLevelToggleItem
	| ByLevelScopeItem
	| ByLevelSeparatorItem;

export interface ByLevelMenuModel {
	items: ByLevelMenuItem[];
}

interface SortScopeMenuOption {
	scope: SortScopeKey;
	icon: string;
	labelKey: string;
}

const PROPS_SCOPE_OPTIONS: readonly SortScopeMenuOption[] = [
	{
		scope: 'properties',
		icon: 'lucide-list-tree',
		labelKey: 'sort.level.properties',
	},
	{
		scope: 'values',
		icon: 'lucide-list-collapse',
		labelKey: 'sort.level.values',
	},
];

const HIERARCHICAL_SCOPE_OPTIONS: readonly SortScopeMenuOption[] = [
	{
		scope: 'drill',
		icon: 'lucide-mouse-pointer-click',
		labelKey: 'sort.level.drill',
	},
	{
		scope: 'all',
		icon: 'lucide-layers',
		labelKey: 'sort.level.all',
	},
];

export function supportsByLevel(tab: ExplorerTabId): boolean {
	return tab === 'files' || tab === 'props' || tab === 'tags';
}

export function sortScopeOptions(
	tab: ExplorerTabId,
): readonly SortScopeMenuOption[] {
	if (tab === 'props') return PROPS_SCOPE_OPTIONS;
	if (tab === 'files' || tab === 'tags') {
		return HIERARCHICAL_SCOPE_OPTIONS;
	}
	return [];
}

export function byLevelModel(
	tab: ExplorerTabId,
	state: ExplorerSortState,
	nestedActive: boolean,
	// A flat view (table/cards) has no hierarchy, so the By-level group has
	// nothing to order. Callers pass false for those view modes and the whole
	// group disappears. Defaults true so existing callers keep the tree shape.
	treeCapable = true,
): ByLevelMenuModel | null {
	if (!supportsByLevel(tab)) return null;
	if (!treeCapable) return null;

	const items: ByLevelMenuItem[] = [
		{
			kind: 'toggle',
			id: 'nested',
			icon: 'lucide-list-tree',
			labelKey: 'sort.level.nested',
			checked: nestedActive,
		},
	];

	// With nesting off the view is a single flat level, so folders-first,
	// fixed-folders and the level scopes have nothing to act on: only the
	// Nested toggle (to turn hierarchy back on) stays.
	if (!nestedActive) return { items };

	if (tab === 'files') {
		const parentsFirst = state.parentsFirst ?? true;
		items.push({
			kind: 'toggle',
			id: 'parentsFirst',
			icon: 'lucide-folder-tree',
			labelKey: 'sort.parents_first',
			checked: parentsFirst,
		});
		if (parentsFirst) {
			items.push({
				kind: 'toggle',
				id: 'fixedFolders',
				icon: 'lucide-folder-lock',
				labelKey: 'sort.level.fixed_folders',
				checked: state.fixedFolders !== false,
			});
		}
	}

	items.push({ kind: 'separator', id: 'scope-separator' });
	for (const option of sortScopeOptions(tab)) {
		items.push({
			kind: 'scope',
			id: option.scope,
			scope: option.scope,
			icon: option.icon,
			labelKey: option.labelKey,
			checked: state.activeScope === option.scope,
		});
	}

	return { items };
}

export function visibleSortOptions(
	tab: ExplorerTabId,
	state: ExplorerSortState,
	nestedActive: boolean,
	// `custom` sorts by the anchored note's own order, so it has nothing to read
	// while no note is anchored. Defaults false so existing callers keep it out.
	revealActive = false,
): readonly SortMenuOption[] {
	return SORT_MENU_OPTIONS[tab].filter(
		(option) =>
			!(
				tab === 'files' &&
				option.id === 'file-count' &&
				state.fixedFolders !== false
			) &&
			isSortOptionVisible(option.id, {
				tab,
				nestedActive,
				activeScope: state.activeScope,
				revealActive,
			}),
	);
}
