import type {
	ExplorerSortDirection,
	ExplorerSortState,
	ExplorerTabId,
	ScopeSort,
	SortScopeKey,
} from '../types/typeUI';
import {
	GROUP_PRESETS_BY_TAB,
	type GroupPreset,
	type GroupPresetKind,
} from '../types/typeGroupPreset';
import {
	isSortOptionVisible,
	levelOfScope,
	parentOfScope,
	scopesForTab,
	storageScope,
	supportsLevelScopes,
} from './logicScopedSort';
import { PROP_TYPE_ORDER, TYPE_ICON_MAP } from './propTypes';
import { TAG_STRUCTURE_ORDER } from './logicExplorerHierarchy';
import { TAG_SOURCE_ORDER } from './logicTagSource';

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
	separatorAfter?: boolean;
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
		{ id: 'note', icon: 'lucide-file-cog', labelKey: 'sort.by.note' },
		// U130 (#101/#90): the anchored note as an explicit sort scope. Same
		// reveal-gated, last-slot rule as `note`: it projects the revealAnchor
		// state (current-file/pinned + path) into the sort menu so the scope
		// the reveal already applies becomes selectable per scene.
		{ id: 'anchor', icon: 'lucide-anchor', labelKey: 'sort.by.anchor' },
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
		{ id: 'note', icon: 'lucide-file-cog', labelKey: 'sort.by.note' },
		// U130 (#101/#90): same reveal-gated last-slot rule as props — the
		// anchored note selectable as an explicit sort scope per scene.
		{ id: 'anchor', icon: 'lucide-anchor', labelKey: 'sort.by.anchor' },
	],
	files: [
		{ id: 'name', icon: 'lucide-a-large-small', labelKey: 'sort.by.name' },
		{ id: 'file-count', icon: 'lucide-files', labelKey: 'stats.files' },
		{ id: 'count', icon: 'lucide-hash', labelKey: 'sort.by.props' },
		{ id: 'words', icon: 'lucide-text', labelKey: 'sort.by.words' },
		{ id: 'tags', icon: 'lucide-tags', labelKey: 'sort.by.tags' },
		{ id: 'tasks', icon: 'lucide-square-check', labelKey: 'sort.by.tasks' },
		{ id: 'ext', icon: 'lucide-file-type', labelKey: 'sort.by.type' },
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
		{
			id: 'props-only',
			icon: 'lucide-type',
			labelKey: 'sort.type.props_only',
			separatorAfter: true,
		},
		...PROP_TYPE_ORDER.map((id) => ({
			id,
			icon: TYPE_ICON_MAP[id],
			labelKey: `sort.type.${id}`,
		})),
	],
	tags: [
		{ id: 'all', icon: 'lucide-tags', labelKey: 'sort.type.all', separatorAfter: true },
		...TAG_STRUCTURE_ORDER.map((id, index) => ({
			id,
			icon: id === 'nested' ? 'lucide-git-branch' : 'lucide-tag',
			labelKey: `sort.type.${id}`,
			// The divider marks where the question changes: above it is the
			// shape of the tag, below it is where the tag is written. They are
			// separate dimensions. Shape can combine with one source, while the
			// two source options are mutually exclusive radios.
			separatorAfter: index === TAG_STRUCTURE_ORDER.length - 1,
		})),
		...TAG_SOURCE_ORDER.map((id) => ({
			id,
			icon: id === 'frontmatter' ? 'lucide-list-tree' : 'lucide-text',
			labelKey: `sort.type.${id}`,
		})),
	],
	files: [
		{ id: 'all', icon: 'lucide-files', labelKey: 'sort.type.all' },
		{
			id: 'folders-only',
			icon: 'lucide-folder',
			labelKey: 'sort.type.folders',
			separatorAfter: true,
		},
	],
};

interface ByLevelBaseItem {
	icon: string;
	labelKey: string;
	checked: boolean;
}

export interface ByLevelToggleItem extends ByLevelBaseItem {
	kind: 'toggle';
	id: 'nested' | 'parentsFirst' | 'fixedFolders' | 'filtered' | 'addPropertyFirst';
}

/**
 * Which note the reveal projection follows. Mutually exclusive, so they read as
 * radios rather than switches: picking Current File releases a pinned note, and
 * picking Scope drill starts the pick that pins one.
 */
export interface ByLevelRevealItem extends ByLevelBaseItem {
	kind: 'reveal';
	id: 'reveal-current-file' | 'reveal-drill';
}

export interface ByLevelSeparatorItem {
	kind: 'separator';
	id: 'reveal-separator';
}

export type ByLevelMenuItem =
	| ByLevelToggleItem
	| ByLevelRevealItem
	| ByLevelSeparatorItem;

export interface ByLevelMenuModel {
	items: ByLevelMenuItem[];
}

interface SortScopeMenuOption {
	scope: SortScopeKey;
	icon: string;
	labelKey: string;
}

/**
 * U130-03: los metadatos de cada scope. La LISTA por tab ya no se escribe a
 * mano: se deriva de `SCOPES_BY_TAB`, que es lo que impide que el menu y el
 * resolutor vuelvan a desincronizarse (U121-079: un nivel de scope a medias
 * ordena mal y sin que nada en la interfaz lo diga).
 */
const SCOPE_META: Record<'all' | 'drill', { icon: string; labelKey: string }> = {
	all: { icon: 'lucide-layers', labelKey: 'sort.level.all' },
	// Spec 08 §5: renamed to "Select a parent" in the UI; the symbol
	// (`SortScopeKey = 'drill'`) and this labelKey are NOT reimplemented,
	// only the icon and the translated string change.
	drill: {
		icon: 'lucide-crosshair',
		labelKey: 'sort.level.drill',
	},
};

/** Spec 08 §3.1 item 3: the level pick is a drill that captures the row's LEVEL. */
const LEVEL_PICK_META = {
	icon: 'lucide-list-tree',
	labelKey: 'sort.level.select_level',
} as const;

/**
 * U130-03: una tab soporta el selector de scope cuando DECLARA mas de un
 * scope. Escribir aqui la lista a mano era la tercera copia de la misma
 * verdad y la que dejaba fuera a Snippets y Plugins (U130-003).
 */
export function supportsByLevel(tab: ExplorerTabId): boolean {
	return supportsLevelScopes(tab);
}

export function sortScopeOptions(
	tab: ExplorerTabId,
): readonly SortScopeMenuOption[] {
	return scopesForTab(tab).map((scope) => ({
		scope,
		...SCOPE_META[scope as 'all' | 'drill'],
	}));
}

// --- Spec 08 §3.1: the `Scope: <variable>` submenu ---------------------------

export interface ScopePickItem {
	kind: 'pick';
	id: 'all' | 'drill' | 'level';
	icon: string;
	labelKey: string;
	checked: boolean;
}

/** §3.1.5: a parent or level that has its own sort; a §4 hide/delete row. */
export interface ScopeSortRowItem {
	kind: 'scope-row';
	id: SortScopeKey;
	icon: string;
	label: string;
	/** `name ↑`-style summary of the row's own sort. */
	sortLabel: string;
	checked: boolean;
	hidden: boolean;
}

export interface ScopeSeparatorItem {
	kind: 'separator';
	id: 'scope-rows-separator';
}

export type ScopeMenuItem = ScopePickItem | ScopeSortRowItem | ScopeSeparatorItem;

export interface ScopeMenuModel {
	/** `Scope: All levels` / `Scope: <node>` / `Scope: Level N` (§3.1.bis). */
	titleKind: 'all' | 'parent' | 'level';
	/** The node label (parent) or the level number; empty for `all`. */
	titleArg: string;
	items: ScopeMenuItem[];
}

export interface ScopeMenuScene {
	/** Label of a parent node, null when the node is gone. */
	parentLabel: (id: string) => string | null;
	/** 1-based level of a parent node, null when unknown. */
	parentLevel: (id: string) => number | null;
	/** `name ↑` for a sort. */
	sortLabel: (sort: ScopeSort) => string;
	/** `Level N` for a level. */
	levelLabel: (level: number) => string;
}

export function scopeMenuModel(
	tab: ExplorerTabId,
	state: ExplorerSortState,
	scene: ScopeMenuScene,
): ScopeMenuModel | null {
	if (!supportsLevelScopes(tab)) return null;
	const active = storageScope(state, state.activeScope);
	const activeParent = parentOfScope(active);
	const activeLevel = levelOfScope(active);
	const titleKind =
		activeParent !== null ? 'parent' : activeLevel !== null ? 'level' : 'all';
	const titleArg =
		activeParent !== null
			? (scene.parentLabel(activeParent) ?? '')
			: activeLevel !== null
				? scene.levelLabel(activeLevel)
				: '';

	const items: ScopeMenuItem[] = [
		{
			kind: 'pick',
			id: 'all',
			...SCOPE_META.all,
			checked: active === 'all',
		},
		{
			kind: 'pick',
			id: 'drill',
			...SCOPE_META.drill,
			checked: activeParent !== null,
		},
		{
			kind: 'pick',
			id: 'level',
			...LEVEL_PICK_META,
			checked: activeLevel !== null,
		},
	];
	const rows: ScopeSortRowItem[] = [];
	const hidden = new Set(state.hiddenScopes ?? []);
	for (const key of Object.keys(state.sorts) as SortScopeKey[]) {
		const sort = state.sorts[key];
		if (!sort) continue;
		const parentId = parentOfScope(key);
		const level = levelOfScope(key);
		if (parentId !== null) {
			const label = scene.parentLabel(parentId);
			if (label === null) continue;
			const parentLevel = scene.parentLevel(parentId);
			rows.push({
				kind: 'scope-row',
				id: key,
				icon: SCOPE_META.drill.icon,
				label: parentLevel !== null ? `${parentLevel}: ${label}` : label,
				sortLabel: scene.sortLabel(sort),
				checked: key === active,
				hidden: hidden.has(key),
			});
		} else if (level !== null && level > 0) {
			rows.push({
				kind: 'scope-row',
				id: key,
				icon: LEVEL_PICK_META.icon,
				label: scene.levelLabel(level),
				sortLabel: scene.sortLabel(sort),
				checked: key === active,
				hidden: hidden.has(key),
			});
		}
	}
	if (rows.length > 0) {
		items.push({ kind: 'separator', id: 'scope-rows-separator' });
		items.push(...rows);
	}
	return { titleKind, titleArg, items };
}

export function byLevelModel(
	tab: ExplorerTabId,
	state: ExplorerSortState,
	// A flat view (table/cards) has no hierarchy, so the By-level group has
	// nothing to order. Callers pass false for those view modes and the whole
	// group disappears. Defaults true so existing callers keep the tree shape.
	treeCapable = true,
	// While a note is anchored, the drawer leads with the two modes that decide
	// *which* note, separated from everything that shapes the level below.
	revealActive = false,
): ByLevelMenuModel | null {
	if (!supportsByLevel(tab)) return null;
	if (!treeCapable) return null;

	const items: ByLevelMenuItem[] = [];

	if (revealActive && (tab === 'props' || tab === 'tags')) {
		const pinned = state.revealAnchor === 'pinned';
		items.push(
			{
				kind: 'reveal',
				id: 'reveal-current-file',
				icon: 'lucide-file-clock',
				labelKey: 'sort.reveal.current_file',
				checked: !pinned,
			},
			{
				kind: 'reveal',
				id: 'reveal-drill',
				icon: 'lucide-pin',
				labelKey: 'sort.reveal.drill',
				checked: pinned,
			},
			{ kind: 'separator', id: 'reveal-separator' },
		);
	}

	// Spec 08 §3.4: `Filtered` moved out of this block -- it now sits near
	// the end of the sort_menu, right before the `custom sorts` placeholder
	// and the `By type` submenu (see `openNativeSortMenu`), not up here with
	// the scope items.

	// The synthetic "+ Add property" row only exists while a note is
	// revealed, so its pin toggle lives next to the reveal radios rather
	// than as a global props option.
	if (tab === 'props' && revealActive) {
		items.push({
			kind: 'toggle',
			id: 'addPropertyFirst',
			icon: 'lucide-list-plus',
			labelKey: 'sort.level.add_property_first',
			checked: state.addPropertyFirst === true,
		});
	}

	// Spec 08 §3.1: the scope items moved into the `Scope: <variable>`
	// submenu (`scopeMenuModel`); this block keeps only the reveal radios
	// and the props pin toggle.
	return { items };
}

export function visibleSortOptions(
	tab: ExplorerTabId,
	state: ExplorerSortState,
	nestedActive: boolean,
	// `note` sorts by the anchored note's own order, so it has nothing to read
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

// --- Spec 08 §3.2: the groups submenu ---------------------------------------

export const GROUP_PRESET_META: Record<
	GroupPresetKind,
	{ icon: string; labelKey: string }
> = {
	none: { icon: 'lucide-ban', labelKey: 'group.preset.none' },
	letter: { icon: 'lucide-a-large-small', labelKey: 'group.preset.letter' },
	name: { icon: 'lucide-text', labelKey: 'group.preset.name' },
	type: { icon: 'lucide-file-type', labelKey: 'group.preset.type' },
	words: { icon: 'lucide-whole-word', labelKey: 'group.preset.words' },
	tasks: { icon: 'lucide-list-checks', labelKey: 'group.preset.tasks' },
	props: { icon: 'lucide-list', labelKey: 'group.preset.props' },
	modified: { icon: 'lucide-calendar-clock', labelKey: 'group.preset.modified' },
	opened: { icon: 'lucide-eye', labelKey: 'group.preset.opened' },
	created: { icon: 'lucide-calendar-plus', labelKey: 'group.preset.created' },
	custom: { icon: 'lucide-boxes', labelKey: 'group.preset.custom' },
};

export interface GroupMenuPresetItem {
	kind: 'preset';
	id: GroupPresetKind;
	icon: string;
	labelKey: string;
	checked: boolean;
	/** Only a checked, non-`none` preset shows its direction. */
	direction: ExplorerSortDirection | null;
}

export interface GroupMenuNewGroupItem {
	kind: 'new-group';
	id: 'new-group';
	icon: string;
	labelKey: string;
	/**
	 * U130-09 (dev 2026-09-15): a custom group lives in the scene, so no layout
	 * is needed. Only a host that cannot open the name prompt disables the row.
	 */
	disabled: boolean;
}

export interface GroupMenuCustomGroupItem {
	kind: 'custom-group';
	id: string;
	icon: string;
	label: string;
	/** Spec 08 §4: hidden in this instance (not deleted). */
	hidden: boolean;
}

export interface GroupMenuSeparatorItem {
	kind: 'separator';
	id: 'group-separator';
}

export type GroupMenuItem =
	| GroupMenuPresetItem
	| GroupMenuNewGroupItem
	| GroupMenuCustomGroupItem
	| GroupMenuSeparatorItem;

export interface GroupMenuModel {
	items: GroupMenuItem[];
}

/**
 * The groups submenu, in the spec's order: `none` first and checked by
 * default, the presets of the tab (`custom` among them: it is what projects
 * the custom groups), a divider, `New group`, then the custom groups as
 * rows of the §4 hide/delete pattern — they are not selectors.
 */
export function groupMenuModel(
	tab: ExplorerTabId,
	preset: GroupPreset,
	customGroups: readonly { id: string; label: string; hidden?: boolean }[],
	canCreateGroup: boolean,
): GroupMenuModel {
	const items: GroupMenuItem[] = [];
	for (const kind of GROUP_PRESETS_BY_TAB[tab]) {
		const checked = preset.kind === kind;
		items.push({
			kind: 'preset',
			id: kind,
			...GROUP_PRESET_META[kind],
			checked,
			direction: checked && kind !== 'none' ? preset.direction : null,
		});
	}
	items.push({ kind: 'separator', id: 'group-separator' });
	items.push({
		kind: 'new-group',
		id: 'new-group',
		icon: 'lucide-folder-plus',
		labelKey: 'group.new',
		disabled: !canCreateGroup,
	});
	for (const group of customGroups) {
		items.push({
			kind: 'custom-group',
			id: group.id,
			icon: group.hidden ? 'lucide-eye-off' : 'lucide-box',
			label: group.label,
			hidden: group.hidden === true,
		});
	}
	return { items };
}

/**
 * Presets are also asc/desc toggles (§3.2): picking the checked one flips its
 * direction; picking another selects it ascending; `none` has no direction.
 */
export function nextGroupPreset(
	current: GroupPreset,
	kind: GroupPresetKind,
): GroupPreset {
	if (kind === 'none') return { kind: 'none', direction: 'asc' };
	if (current.kind === kind) {
		return { kind, direction: current.direction === 'asc' ? 'desc' : 'asc' };
	}
	return { kind, direction: 'asc' };
}
