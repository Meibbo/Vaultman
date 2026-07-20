import type {
	ExplorerSortState,
	ExplorerTabId,
	SortScopeKey,
} from '../types/typeUI';
import { isSortOptionVisible } from './logicScopedSort';

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
	],
	tags: [
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
	],
	files: [
		{ id: 'name', icon: 'lucide-a-large-small', labelKey: 'sort.by.name' },
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
		{ id: 'path', icon: 'lucide-route', labelKey: 'sort.by.path' },
	],
	snippets: [
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
	'props' | 'tags',
	readonly BuiltInNodeTypeMenuOption[]
> = {
	props: [
		{ id: 'tags', icon: 'lucide-tags', labelKey: 'sort.type.tags' },
		{ id: 'list', icon: 'lucide-list', labelKey: 'sort.type.list' },
		{ id: 'text', icon: 'lucide-text', labelKey: 'sort.type.text' },
		{ id: 'number', icon: 'lucide-binary', labelKey: 'sort.type.number' },
		{ id: 'date', icon: 'lucide-calendar', labelKey: 'sort.type.date' },
		{
			id: 'checkbox',
			icon: 'lucide-check-square',
			labelKey: 'sort.type.checkbox',
		},
		{ id: 'aliases', icon: 'lucide-forward', labelKey: 'sort.type.aliases' },
		{
			id: 'cssclasses',
			icon: 'lucide-palette',
			labelKey: 'sort.type.cssclasses',
		},
		{
			id: 'unknown',
			icon: 'lucide-file-question',
			labelKey: 'sort.type.unknown',
		},
	],
	tags: [
		{ id: 'all', icon: 'lucide-tags', labelKey: 'sort.type.all' },
		{ id: 'nested', icon: 'lucide-git-branch', labelKey: 'sort.type.nested' },
		{ id: 'simple', icon: 'lucide-tag', labelKey: 'sort.type.simple' },
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
): ByLevelMenuModel | null {
	if (!supportsByLevel(tab)) return null;

	const items: ByLevelMenuItem[] = [
		{
			kind: 'toggle',
			id: 'nested',
			icon: 'lucide-list-tree',
			labelKey: 'sort.level.nested',
			checked: nestedActive,
		},
	];

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
): readonly SortMenuOption[] {
	return SORT_MENU_OPTIONS[tab].filter((option) =>
		isSortOptionVisible(option.id, {
			tab,
			nestedActive,
			activeScope: state.activeScope,
		}),
	);
}
