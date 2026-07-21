/**
 * BT5-018: the projection that decides what the Files node context menu shows.
 *
 * The layout is a flat ordered list because that is what the settings page
 * drags around. A submenu is an item that owns the actions whose `parent`
 * points at it, so nesting never needs a second tree to keep in sync.
 *
 * Everything is keyed by stable action id — never by translated label and
 * never by position — so a config survives a renamed label, a reordered
 * registry, and a retired action.
 */
export type FilesMenuItem =
	| { kind: 'action'; id: string; visible: boolean; parent?: string }
	| { kind: 'divider'; id: string }
	| { kind: 'submenu'; id: string; label: string };

/**
 * BT5-036: the node context menus Vaultman configures, one per explorer surface
 * that opens a panel menu. `files` keeps the intercepted-item behaviour of
 * BT5-018; the others are plain registry menus. Each has its own saved layout
 * and its own settings section.
 */
export type PanelMenuKind =
	| 'files'
	| 'props'
	| 'tags'
	| 'content'
	| 'snippets'
	| 'plugins';

export const PANEL_MENU_KINDS: readonly PanelMenuKind[] = [
	'files',
	'props',
	'tags',
	'content',
	'snippets',
	'plugins',
];

/** The menu a given node type belongs to. */
export function panelMenuKindForNodeType(nodeType: string): PanelMenuKind {
	switch (nodeType) {
		case 'prop':
		case 'value':
			return 'props';
		case 'tag':
			return 'tags';
		case 'snippet':
			return 'snippets';
		case 'plugin':
			return 'plugins';
		case 'content':
			return 'content';
		default:
			return 'files';
	}
}

export const DIVIDER_MARK = '---';

/**
 * The dev-approved default: the order of Obsidian's Core Files context menu,
 * with Vaultman's own actions folded into the section they belong to. A new
 * action absent from this list is not lost — it is appended deterministically.
 */
export const FILES_MENU_DEFAULT_ORDER: readonly string[] = [
	'file.open_tab',
	'file.open_right',
	'file.open_window',
	DIVIDER_MARK,
	'folder.new_note',
	'folder.new_folder',
	'folder.new_canvas',
	'folder.new_base',
	DIVIDER_MARK,
	'file.make_copy',
	'folder.make_copy',
	'file.move',
	'folder.move',
	'file.rename',
	'folder.rename',
	DIVIDER_MARK,
	'file.exclude',
	'folder.filter_include',
	'folder.filter_exclude',
	'filters.clear-selection',
	'queue.apply',
	DIVIDER_MARK,
	'file.delete',
	'folder.delete',
];

/**
 * BT5-018: an intercepted item (Core Files, another plugin) has no stable id,
 * only a title. We key it by a slug of that title — the same title-based
 * identity Vaultman already uses for its context-menu hide rules — prefixed so
 * it can never collide with a real action id.
 */
export function nativePanelActionId(title: string): string {
	const slug = title
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return `native:${slug}`;
}

export function isNativePanelActionId(id: string): boolean {
	return id.startsWith('native:');
}

export function dividerId(index: number): string {
	return `divider:${index}`;
}

export function submenuId(index: number): string {
	return `submenu:${index}`;
}

/** The next free id of a kind, so a new one never collides with a saved one. */
function nextGeneratedId(
	items: readonly FilesMenuItem[],
	kind: 'divider' | 'submenu',
): string {
	const prefix = `${kind}:`;
	let highest = 0;
	for (const item of items) {
		if (!item.id.startsWith(prefix)) continue;
		const parsed = Number.parseInt(item.id.slice(prefix.length), 10);
		if (Number.isFinite(parsed) && parsed > highest) highest = parsed;
	}
	return `${prefix}${highest + 1}`;
}

export function defaultFilesMenuLayout(
	catalogIds: readonly string[],
): FilesMenuItem[] {
	const known = new Set(catalogIds);
	const items: FilesMenuItem[] = [];
	let dividers = 0;
	for (const entry of FILES_MENU_DEFAULT_ORDER) {
		if (entry === DIVIDER_MARK) {
			dividers += 1;
			items.push({ kind: 'divider', id: dividerId(dividers) });
			continue;
		}
		if (!known.has(entry)) continue;
		items.push({ kind: 'action', id: entry, visible: true });
	}
	// Intercepted items render at the top of the real menu, so they lead the
	// default layout too, in discovery order, ahead of Vaultman's own actions.
	const nativeIds = catalogIds.filter((id) => isNativePanelActionId(id));
	items.unshift(
		...nativeIds.map(
			(id): FilesMenuItem => ({ kind: 'action', id, visible: true }),
		),
	);
	// Anything else the registry offers that the default order never named.
	for (const id of catalogIds) {
		if (FILES_MENU_DEFAULT_ORDER.includes(id) || isNativePanelActionId(id)) {
			continue;
		}
		items.push({ kind: 'action', id, visible: true });
	}
	return normalizeFilesMenuLayout(items);
}

function readSavedItem(value: unknown): FilesMenuItem | null {
	if (!value || typeof value !== 'object') return null;
	const candidate = value as Partial<FilesMenuItem> & { id?: unknown };
	if (typeof candidate.id !== 'string' || !candidate.id) return null;
	if (candidate.kind === 'divider') return { kind: 'divider', id: candidate.id };
	if (candidate.kind === 'submenu') {
		const label = (candidate as { label?: unknown }).label;
		return {
			kind: 'submenu',
			id: candidate.id,
			label: typeof label === 'string' ? label : candidate.id,
		};
	}
	if (candidate.kind !== 'action') return null;
	const parent = (candidate as { parent?: unknown }).parent;
	return {
		kind: 'action',
		id: candidate.id,
		visible: (candidate as { visible?: unknown }).visible !== false,
		...(typeof parent === 'string' && parent ? { parent } : {}),
	};
}

/**
 * Load a saved layout against the live registry: retired ids disappear
 * instead of breaking the load, and an action the registry gained since the
 * config was written is inserted at the place the default order gives it —
 * a deterministic rule, not "append to the end".
 */
export function mergeFilesMenuLayout(
	saved: unknown,
	catalogIds: readonly string[],
): FilesMenuItem[] {
	if (!Array.isArray(saved)) return defaultFilesMenuLayout(catalogIds);
	const known = new Set(catalogIds);
	const seen = new Set<string>();
	const merged: FilesMenuItem[] = [];
	for (const raw of saved) {
		const item = readSavedItem(raw);
		if (!item || seen.has(item.id)) continue;
		if (item.kind === 'action' && !known.has(item.id)) continue;
		seen.add(item.id);
		merged.push(item);
	}

	// A newly discovered intercepted item leads the menu in discovery order,
	// where the real menu renders it; a new Vaultman action lands at its
	// canonical rank. Both are inserted by id, never appended blindly.
	const missing = catalogIds.filter((id) => !seen.has(id));
	let nativeInsertAt = 0;
	for (const id of missing) {
		if (isNativePanelActionId(id)) {
			merged.splice(nativeInsertAt, 0, { kind: 'action', id, visible: true });
			nativeInsertAt += 1;
			continue;
		}
		const rank = FILES_MENU_DEFAULT_ORDER.indexOf(id);
		const insertAt =
			rank < 0
				? merged.length
				: findInsertionIndex(merged, rank, FILES_MENU_DEFAULT_ORDER);
		merged.splice(insertAt, 0, { kind: 'action', id, visible: true });
	}
	return normalizeFilesMenuLayout(merged);
}

/** The first saved position whose default rank is above the newcomer's. */
function findInsertionIndex(
	items: readonly FilesMenuItem[],
	rank: number,
	order: readonly string[],
): number {
	for (let index = 0; index < items.length; index++) {
		const item = items[index];
		if (item?.kind !== 'action') continue;
		const candidateRank = order.indexOf(item.id);
		if (candidateRank >= 0 && candidateRank > rank) return index;
	}
	return items.length;
}

/**
 * A divider only means something between two visible actions, and a submenu
 * only means something when something sits inside it.
 */
export function normalizeFilesMenuLayout(
	items: readonly FilesMenuItem[],
): FilesMenuItem[] {
	const populatedSubmenus = new Set(
		items
			.filter(
				(item): item is Extract<FilesMenuItem, { kind: 'action' }> =>
					item.kind === 'action' && item.visible && Boolean(item.parent),
			)
			.map((item) => item.parent as string),
	);
	const kept = items.filter(
		(item) => item.kind !== 'submenu' || populatedSubmenus.has(item.id),
	);

	const result: FilesMenuItem[] = [];
	for (const item of kept) {
		if (item.kind === 'divider') {
			// No leading divider, and never two in a row.
			if (result.length === 0) continue;
			if (result[result.length - 1]?.kind === 'divider') continue;
			result.push(item);
			continue;
		}
		result.push(item);
	}
	while (result.length > 0 && result[result.length - 1]?.kind === 'divider') {
		result.pop();
	}
	return result;
}

export function addFilesMenuDivider(
	items: readonly FilesMenuItem[],
): FilesMenuItem[] {
	return [...items, { kind: 'divider', id: nextGeneratedId(items, 'divider') }];
}

export function addFilesMenuSubmenu(
	items: readonly FilesMenuItem[],
	label: string,
): FilesMenuItem[] {
	return [
		...items,
		{ kind: 'submenu', id: nextGeneratedId(items, 'submenu'), label },
	];
}

export function removeFilesMenuItem(
	items: readonly FilesMenuItem[],
	id: string,
): FilesMenuItem[] {
	return items
		.filter((item) => item.id !== id)
		.map((item) =>
			item.kind === 'action' && item.parent === id
				? { kind: 'action', id: item.id, visible: item.visible }
				: item,
		);
}

export function setFilesMenuVisibility(
	items: readonly FilesMenuItem[],
	id: string,
	visible: boolean,
): FilesMenuItem[] {
	return items.map((item) =>
		item.kind === 'action' && item.id === id ? { ...item, visible } : item,
	);
}

export function setFilesMenuParent(
	items: readonly FilesMenuItem[],
	id: string,
	parent: string | null,
): FilesMenuItem[] {
	return items.map((item) => {
		if (item.kind !== 'action' || item.id !== id) return item;
		if (!parent) return { kind: 'action', id: item.id, visible: item.visible };
		return { ...item, parent };
	});
}

/** Drag-and-drop: move `movedId` to where `targetId` currently sits. */
export function reorderFilesMenuItems(
	items: readonly FilesMenuItem[],
	movedId: string,
	targetId: string,
): FilesMenuItem[] {
	if (movedId === targetId) return [...items];
	const moved = items.find((item) => item.id === movedId);
	if (!moved) return [...items];
	const without = items.filter((item) => item.id !== movedId);
	const targetIndex = without.findIndex((item) => item.id === targetId);
	if (targetIndex < 0) return [...items];
	without.splice(targetIndex, 0, moved);
	return without;
}

export interface FilesMenuRenderStep {
	kind: 'action' | 'divider';
	id: string;
	/** Label of the submenu this action belongs to, when it has one. */
	submenu?: string;
}

/**
 * What the context menu should actually emit, in order. Hidden actions and
 * anything the registry no longer offers are already gone, and dividers are
 * normalized against what survived.
 */
export function projectFilesMenu(
	items: readonly FilesMenuItem[],
	availableIds: readonly string[],
): FilesMenuRenderStep[] {
	const available = new Set(availableIds);
	const submenuLabels = new Map(
		items
			.filter(
				(item): item is Extract<FilesMenuItem, { kind: 'submenu' }> =>
					item.kind === 'submenu',
			)
			.map((item) => [item.id, item.label]),
	);
	const visible = items.filter(
		(
			item,
		): item is Extract<FilesMenuItem, { kind: 'divider' | 'action' }> =>
			item.kind === 'divider' ||
			(item.kind === 'action' && item.visible && available.has(item.id)),
	);

	const steps: FilesMenuRenderStep[] = [];
	for (const item of visible) {
		if (item.kind === 'divider') {
			if (steps.length === 0) continue;
			if (steps[steps.length - 1]?.kind === 'divider') continue;
			steps.push({ kind: 'divider', id: item.id });
			continue;
		}
		const submenu = item.parent ? submenuLabels.get(item.parent) : undefined;
		steps.push({
			kind: 'action',
			id: item.id,
			...(submenu ? { submenu } : {}),
		});
	}
	while (steps.length > 0 && steps[steps.length - 1]?.kind === 'divider') {
		steps.pop();
	}
	return steps;
}
