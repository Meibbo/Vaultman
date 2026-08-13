import type { ExplorerTabId, ExplorerViewMode } from '../types/typeUI';

export type ExplorerCellRole =
	| 'identity'
	| 'value'
	| 'control'
	| 'label-projection'
	| 'topology';

export interface ExplorerCellSupport {
	explorer: ExplorerTabId;
	viewModes?: readonly ExplorerViewMode[];
	fixedRank: number;
	defaultOn: boolean;
	/** A surface may need a more specific label without duplicating the cell. */
	labelKey?: string;
	icon?: string;
}

export interface ExplorerCellDef {
	id: string;
	role: ExplorerCellRole;
	labelKey: string;
	icon: string;
	supports: readonly ExplorerCellSupport[];
	sortId?: string;
	hoverId?: string;
	/**
	 * BT5-012: cells that only make sense while another cell is off. Path is a
	 * projection of the label, so it is meaningless while Nested already spells
	 * the hierarchy out with folder rows.
	 */
	requiresCellsOff?: readonly string[];
}

export type FileHoverInfoId = string;

export interface FileHoverEntry {
	id: FileHoverInfoId;
	labelKey: string;
	icon: string;
	defaultOn: boolean;
	rank: number;
}

export interface ExplorerCellRegistry {
	cellDef(id: string): ExplorerCellDef | undefined;
	cellsForExplorer(
		explorer: ExplorerTabId,
		viewMode?: ExplorerViewMode,
	): ExplorerCellDef[];
	viewMenuCells(
		explorer: ExplorerTabId,
		viewMode?: ExplorerViewMode,
		activeCells?: Iterable<string>,
	): ExplorerCellDef[];
	defaultVisibleCells(
		explorer: ExplorerTabId,
		viewMode?: ExplorerViewMode,
	): string[];
	normalizeVisibleCellIds(
		explorer: ExplorerTabId,
		saved: unknown,
		viewMode?: ExplorerViewMode,
	): string[];
	fileHoverEntries(): FileHoverEntry[];
	mergeFileHoverOrder(saved: unknown): FileHoverInfoId[];
	normalizeFileHoverEnabled(saved: unknown): FileHoverInfoId[];
	resolveFileHoverEntries(enabled: unknown, order: unknown): FileHoverEntry[];
}

const FILE_TREE_MODES = ['tree', 'dnd'] as const;
const FILE_CARD_MODES = ['cards', 'grid'] as const;

export const EXPLORER_CELL_DEFS: readonly ExplorerCellDef[] = [
	{
		id: 'checkbox',
		role: 'control',
		labelKey: 'viewmode.pill.checkbox',
		icon: 'lucide-check-square',
		supports: [
			{ explorer: 'props', fixedRank: 1, defaultOn: true },
			{ explorer: 'tags', fixedRank: 1, defaultOn: true },
			{ explorer: 'snippets', fixedRank: 1, defaultOn: true },
			{ explorer: 'plugins', fixedRank: 1, defaultOn: true },
		],
	},
	{
		id: 'icon',
		role: 'identity',
		labelKey: 'viewmode.pill.icon',
		icon: 'lucide-image',
		supports: [
			{ explorer: 'props', fixedRank: 10, defaultOn: true },
			{ explorer: 'tags', fixedRank: 10, defaultOn: true },
			{ explorer: 'snippets', fixedRank: 10, defaultOn: true },
			{ explorer: 'plugins', fixedRank: 10, defaultOn: true },
			{
				explorer: 'files',
				viewModes: FILE_TREE_MODES,
				fixedRank: 10,
				defaultOn: false,
			},
			{
				explorer: 'files',
				viewModes: ['table'],
				fixedRank: 10,
				defaultOn: false,
			},
			{
				explorer: 'files',
				viewModes: FILE_CARD_MODES,
				fixedRank: 10,
				defaultOn: false,
			},
		],
	},
	{
		id: 'name',
		role: 'identity',
		labelKey: 'viewmode.pill.name',
		icon: 'lucide-file-text',
		sortId: 'name',
		hoverId: 'label',
		supports: [
			{
				explorer: 'files',
				viewModes: FILE_TREE_MODES,
				fixedRank: 20,
				defaultOn: true,
			},
			{
				explorer: 'files',
				viewModes: ['table'],
				fixedRank: 20,
				defaultOn: true,
			},
			{
				explorer: 'files',
				viewModes: FILE_CARD_MODES,
				fixedRank: 20,
				defaultOn: true,
			},
		],
	},
	{
		id: 'text',
		role: 'identity',
		labelKey: 'viewmode.pill.text',
		icon: 'lucide-text',
		sortId: 'name',
		supports: [
			{ explorer: 'props', fixedRank: 20, defaultOn: true },
			{ explorer: 'tags', fixedRank: 20, defaultOn: true },
			{ explorer: 'snippets', fixedRank: 20, defaultOn: true },
			{ explorer: 'plugins', fixedRank: 20, defaultOn: true },
		],
	},
	{
		id: 'path',
		role: 'label-projection',
		labelKey: 'viewmode.pill.path',
		icon: 'lucide-route',
		sortId: 'path',
		hoverId: 'path',
		requiresCellsOff: ['nested'],
		supports: [
			{
				explorer: 'files',
				viewModes: FILE_TREE_MODES,
				fixedRank: 25,
				defaultOn: false,
			},
			{
				explorer: 'files',
				viewModes: ['table'],
				fixedRank: 80,
				defaultOn: false,
			},
			{
				explorer: 'files',
				viewModes: FILE_CARD_MODES,
				fixedRank: 25,
				defaultOn: false,
			},
		],
	},
	{
		id: 'type',
		role: 'value',
		labelKey: 'viewmode.pill.type',
		icon: 'lucide-list-filter',
		sortId: 'type',
		supports: [
			{ explorer: 'props', fixedRank: 30, defaultOn: false },
			// A tag's type is where it is written — frontmatter, the body, or
			// both. Same cell, same rank, same sort id as the property type:
			// the question the column answers is the node's own kind.
			{
				explorer: 'tags',
				// The tag cards draw no value cells, so offering it there would
				// put a switch in the menu that changes nothing on screen.
				viewModes: ['tree', 'table'],
				fixedRank: 30,
				defaultOn: false,
				labelKey: 'viewmode.pill.tag_type',
			},
		],
	},
	{
		id: 'ext',
		role: 'value',
		labelKey: 'viewmode.pill.ext',
		icon: 'lucide-file-type',
		sortId: 'ext',
		hoverId: 'ext',
		supports: [
			{
				explorer: 'files',
				viewModes: FILE_TREE_MODES,
				fixedRank: 30,
				defaultOn: true,
			},
			{
				explorer: 'files',
				viewModes: ['table'],
				fixedRank: 50,
				defaultOn: true,
			},
			{
				explorer: 'files',
				viewModes: FILE_CARD_MODES,
				fixedRank: 30,
				defaultOn: true,
			},
		],
	},
	{
		id: 'format',
		role: 'value',
		labelKey: 'viewmode.pill.format',
		icon: 'lucide-braces',
		supports: [{ explorer: 'props', fixedRank: 35, defaultOn: false }],
	},
	{
		// U121-003: the flat counterpart of `path` in the file explorer. With
		// `nested` off the label carries its ancestry — `lugar: cocina`,
		// `parent/child` — and this cell is what puts it there. Defaults on so
		// the projection that shipped keeps its labels until asked otherwise.
		id: 'parent',
		role: 'label-projection',
		labelKey: 'viewmode.pill.parent',
		icon: 'lucide-corner-left-up',
		sortId: 'parent',
		hoverId: 'parent',
		requiresCellsOff: ['nested'],
		supports: [
			{ explorer: 'props', fixedRank: 25, defaultOn: true },
			{ explorer: 'tags', fixedRank: 25, defaultOn: true },
		],
	},
	{
		id: 'count',
		role: 'value',
		labelKey: 'viewmode.pill.count',
		icon: 'lucide-hash',
		sortId: 'count',
		hoverId: 'count',
		supports: [
			{ explorer: 'props', fixedRank: 40, defaultOn: true },
			{ explorer: 'tags', fixedRank: 40, defaultOn: true },
			{
				explorer: 'files',
				viewModes: FILE_TREE_MODES,
				fixedRank: 90,
				defaultOn: false,
				labelKey: 'viewmode.pill.prop_count',
			},
			{
				explorer: 'files',
				viewModes: ['table'],
				fixedRank: 30,
				defaultOn: false,
				labelKey: 'viewmode.pill.prop_count',
			},
			{
				explorer: 'files',
				viewModes: FILE_CARD_MODES,
				fixedRank: 40,
				defaultOn: false,
				labelKey: 'viewmode.pill.prop_count',
			},
		],
	},
	{
		id: 'file-count',
		role: 'value',
		labelKey: 'stats.files',
		icon: 'lucide-files',
		sortId: 'file-count',
		supports: [
			{ explorer: 'files', viewModes: FILE_TREE_MODES, fixedRank: 85, defaultOn: false },
		],
	},
	{
		id: 'sub',
		role: 'value',
		labelKey: 'viewmode.pill.sub',
		icon: 'lucide-indent',
		sortId: 'sub',
		supports: [
			{ explorer: 'props', viewModes: ['tree'], fixedRank: 45, defaultOn: false },
			{ explorer: 'tags', viewModes: ['tree'], fixedRank: 45, defaultOn: false },
		],
	},
	{
		id: 'mtime',
		role: 'value',
		labelKey: 'viewmode.pill.mtime',
		icon: 'lucide-calendar-clock',
		sortId: 'mtime',
		hoverId: 'mtime',
		supports: [
			{
				explorer: 'files',
				viewModes: FILE_TREE_MODES,
				fixedRank: 40,
				defaultOn: false,
			},
			{
				explorer: 'files',
				viewModes: ['table'],
				fixedRank: 60,
				defaultOn: false,
			},
			{
				explorer: 'files',
				viewModes: FILE_CARD_MODES,
				fixedRank: 60,
				defaultOn: false,
			},
		],
	},
	{
		id: 'ctime',
		role: 'value',
		labelKey: 'viewmode.pill.ctime',
		icon: 'lucide-calendar-plus',
		sortId: 'ctime',
		hoverId: 'ctime',
		supports: [
			{
				explorer: 'files',
				viewModes: FILE_TREE_MODES,
				fixedRank: 50,
				defaultOn: false,
			},
			{
				explorer: 'files',
				viewModes: ['table'],
				fixedRank: 70,
				defaultOn: false,
			},
			{
				explorer: 'files',
				viewModes: FILE_CARD_MODES,
				fixedRank: 70,
				defaultOn: false,
			},
		],
	},
	{
		id: 'opened',
		role: 'value',
		labelKey: 'viewmode.pill.opened',
		icon: 'lucide-history',
		sortId: 'opened',
		hoverId: 'opened',
		supports: [
			{
				explorer: 'files',
				viewModes: FILE_TREE_MODES,
				fixedRank: 55,
				defaultOn: false,
			},
			{
				explorer: 'files',
				viewModes: ['table'],
				fixedRank: 75,
				defaultOn: false,
			},
			{
				explorer: 'files',
				viewModes: FILE_CARD_MODES,
				fixedRank: 75,
				defaultOn: false,
			},
		],
	},
	{
		id: 'words',
		role: 'value',
		labelKey: 'viewmode.pill.words',
		icon: 'lucide-text',
		sortId: 'words',
		hoverId: 'words',
		supports: [
			{
				explorer: 'files',
				viewModes: FILE_TREE_MODES,
				fixedRank: 60,
				defaultOn: false,
			},
			{
				explorer: 'files',
				viewModes: ['table'],
				fixedRank: 40,
				defaultOn: false,
			},
			{
				explorer: 'files',
				viewModes: FILE_CARD_MODES,
				fixedRank: 50,
				defaultOn: false,
			},
		],
	},
	{
		id: 'tasks',
		role: 'value',
		labelKey: 'viewmode.pill.tasks',
		icon: 'lucide-square-check-big',
		sortId: 'tasks',
		hoverId: 'tasks',
		supports: [
			{
				explorer: 'files',
				viewModes: FILE_TREE_MODES,
				fixedRank: 70,
				defaultOn: false,
			},
		],
	},
	{
		id: 'state',
		role: 'control',
		labelKey: 'viewmode.pill.state',
		icon: 'lucide-toggle-right',
		sortId: 'state',
		supports: [
			{ explorer: 'snippets', fixedRank: 30, defaultOn: true },
			{ explorer: 'plugins', fixedRank: 30, defaultOn: true },
		],
	},
	{
		id: 'config',
		role: 'control',
		labelKey: 'viewmode.pill.config',
		icon: 'lucide-settings',
		supports: [{ explorer: 'plugins', fixedRank: 40, defaultOn: true }],
	},
	{
		id: 'installed',
		role: 'value',
		labelKey: 'viewmode.pill.installed',
		icon: 'lucide-calendar-plus',
		sortId: 'installed',
		supports: [
			{ explorer: 'snippets', fixedRank: 40, defaultOn: false },
			{ explorer: 'plugins', fixedRank: 50, defaultOn: false },
		],
	},
	{
		id: 'updated',
		role: 'value',
		labelKey: 'viewmode.pill.updated',
		icon: 'lucide-calendar-clock',
		sortId: 'updated',
		supports: [
			{ explorer: 'snippets', fixedRank: 50, defaultOn: false },
			{ explorer: 'plugins', fixedRank: 60, defaultOn: false },
		],
	},
	{
		id: 'nested',
		role: 'topology',
		labelKey: 'viewmode.pill.nested',
		icon: 'lucide-git-branch',
		supports: [
			{ explorer: 'props', fixedRank: 1000, defaultOn: true },
			{ explorer: 'tags', fixedRank: 1000, defaultOn: true },
			{
				explorer: 'files',
				viewModes: FILE_TREE_MODES,
				fixedRank: 1000,
				defaultOn: true,
			},
			{
				explorer: 'files',
				viewModes: ['table'],
				fixedRank: 1000,
				defaultOn: true,
			},
			{
				explorer: 'files',
				viewModes: FILE_CARD_MODES,
				fixedRank: 1000,
				defaultOn: true,
			},
		],
	},
];

const FILE_HOVER_ENTRY_OVERRIDES: readonly FileHoverEntry[] = [
	{
		id: 'label',
		labelKey: 'settings.files_hover_info.label',
		icon: 'lucide-tag',
		defaultOn: false,
		rank: 0,
	},
	{
		id: 'path',
		labelKey: 'settings.files_hover_info.path',
		icon: 'lucide-route',
		defaultOn: false,
		rank: 25,
	},
	{
		id: 'mtime',
		labelKey: 'settings.files_hover_info.modified',
		icon: 'lucide-calendar-clock',
		defaultOn: true,
		rank: 40,
	},
	{
		id: 'ctime',
		labelKey: 'settings.files_hover_info.created',
		icon: 'lucide-calendar-plus',
		defaultOn: true,
		rank: 50,
	},
	{
		id: 'opened',
		labelKey: 'settings.files_hover_info.opened',
		icon: 'lucide-history',
		defaultOn: false,
		rank: 55,
	},
	{
		id: 'words',
		labelKey: 'settings.files_hover_info.words',
		icon: 'lucide-text',
		defaultOn: true,
		rank: 60,
	},
	{
		id: 'characters',
		labelKey: 'settings.files_hover_info.characters',
		icon: 'lucide-braces',
		defaultOn: false,
		rank: 65,
	},
	{
		id: 'tasks',
		labelKey: 'settings.files_hover_info.tasks',
		icon: 'lucide-square-check-big',
		defaultOn: false,
		rank: 70,
	},
];

const FILE_HOVER_ALIASES: Readonly<Record<string, FileHoverInfoId>> = {
	modified: 'mtime',
	created: 'ctime',
};

function supportFor(
	definition: ExplorerCellDef,
	explorer: ExplorerTabId,
	viewMode?: ExplorerViewMode,
): ExplorerCellSupport | undefined {
	const candidates = definition.supports.filter(
		(support) => support.explorer === explorer,
	);
	if (candidates.length === 0) return undefined;
	if (viewMode) {
		return (
			candidates.find((support) => support.viewModes?.includes(viewMode)) ??
			candidates.find((support) => !support.viewModes)
		);
	}
	return (
		candidates.find((support) => support.viewModes?.includes('tree')) ??
		candidates.find((support) => !support.viewModes) ??
		candidates[0]
	);
}

function strings(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value.filter((item): item is string => typeof item === 'string');
}

/**
 * A cell can feed the hover tooltip only when it carries a textual value.
 * The predicate narrows `hoverId`, so callers read it without a cast.
 */
function isHoverCompatible(
	definition: ExplorerCellDef,
): definition is ExplorerCellDef & { hoverId: string } {
	// Icons have no textual value, while topology and controls mutate the UI
	// rather than describe a file. Identity cells such as Name remain eligible
	// when they explicitly project a hover id (Name projects to Label).
	return (
		Boolean(definition.hoverId) &&
		definition.id !== 'icon' &&
		definition.role !== 'topology' &&
		definition.role !== 'control'
	);
}

/**
 * BT5-012: a cell is unavailable while any cell it excludes is switched on.
 * The stored selection is never edited — only the projection hides it — so
 * turning the blocking cell back off restores the previous choice intact.
 */
export function cellAvailable(
	definition: ExplorerCellDef,
	activeCells: ReadonlySet<string>,
): boolean {
	return !definition.requiresCellsOff?.some((id) => activeCells.has(id));
}

export function createExplorerCellRegistry(
	definitions: readonly ExplorerCellDef[],
): ExplorerCellRegistry {
	const byId = new Map<string, ExplorerCellDef>();
	for (const definition of definitions) {
		if (byId.has(definition.id)) {
			throw new Error(`Duplicate explorer cell id: ${definition.id}`);
		}
		byId.set(definition.id, definition);
	}

	const hoverById = new Map<string, FileHoverEntry>(
		FILE_HOVER_ENTRY_OVERRIDES.map((entry) => [entry.id, entry]),
	);
	for (const definition of definitions) {
		if (!isHoverCompatible(definition) || !supportFor(definition, 'files')) {
			continue;
		}
		if (hoverById.has(definition.hoverId)) continue;
		const support = supportFor(definition, 'files');
		if (!support) continue;
		hoverById.set(definition.hoverId, {
			id: definition.hoverId,
			labelKey: support.labelKey ?? definition.labelKey,
			icon: support.icon ?? definition.icon,
			defaultOn: false,
			rank: support.fixedRank,
		});
	}
	const hoverEntries = [...hoverById.values()].sort(
		(left, right) => left.rank - right.rank || left.id.localeCompare(right.id),
	);
	const hoverRank = new Map(
		hoverEntries.map((entry) => [entry.id, entry.rank]),
	);

	const normalizeHoverIds = (value: unknown): FileHoverInfoId[] => {
		const valid = new Set(hoverEntries.map((entry) => entry.id));
		const seen = new Set<string>();
		const normalized: string[] = [];
		for (const rawId of strings(value)) {
			const id = FILE_HOVER_ALIASES[rawId] ?? rawId;
			if (!valid.has(id) || seen.has(id)) continue;
			seen.add(id);
			normalized.push(id);
		}
		return normalized;
	};

	const registry: ExplorerCellRegistry = {
		cellDef(id) {
			return byId.get(id);
		},
		cellsForExplorer(explorer, viewMode) {
			return definitions
				.map((definition, index) => ({
					definition,
					index,
					support: supportFor(definition, explorer, viewMode),
				}))
				.filter(
					(entry): entry is typeof entry & { support: ExplorerCellSupport } =>
						Boolean(entry.support),
				)
				.sort(
					(left, right) =>
						left.support.fixedRank - right.support.fixedRank ||
						left.index - right.index,
				)
				.map(({ definition }) => definition);
		},
		viewMenuCells(explorer, viewMode, activeCells) {
			// Without a context the caller cannot tell whether a projection is
			// applicable, so projections stay out — the pre-BT5-012 behaviour.
			const active = activeCells ? new Set(activeCells) : undefined;
			return registry
				.cellsForExplorer(explorer, viewMode)
				.filter(
					(definition) =>
						definition.role !== 'topology' &&
						(active
							? cellAvailable(definition, active)
							: definition.role !== 'label-projection'),
				);
		},
		defaultVisibleCells(explorer, viewMode) {
			return registry
				.cellsForExplorer(explorer, viewMode)
				.filter(
					(definition) =>
						supportFor(definition, explorer, viewMode)?.defaultOn === true,
				)
				.map((definition) => definition.id);
		},
		normalizeVisibleCellIds(explorer, saved, viewMode) {
			const valid = new Set(
				registry
					.cellsForExplorer(explorer, viewMode)
					.map((definition) => definition.id),
			);
			const seen = new Set<string>();
			return strings(saved).filter((id) => {
				if (!valid.has(id) || seen.has(id)) return false;
				seen.add(id);
				return true;
			});
		},
		fileHoverEntries() {
			return [...hoverEntries];
		},
		mergeFileHoverOrder(saved) {
			const merged = normalizeHoverIds(saved);
			const included = new Set(merged);
			for (const entry of hoverEntries) {
				if (included.has(entry.id)) continue;
				const insertionIndex = merged.findIndex(
					(id) => (hoverRank.get(id) ?? Number.MAX_SAFE_INTEGER) > entry.rank,
				);
				if (insertionIndex < 0) merged.push(entry.id);
				else merged.splice(insertionIndex, 0, entry.id);
				included.add(entry.id);
			}
			return merged;
		},
		normalizeFileHoverEnabled(saved) {
			if (!Array.isArray(saved)) {
				return hoverEntries
					.filter((entry) => entry.defaultOn)
					.map((entry) => entry.id);
			}
			return normalizeHoverIds(saved);
		},
		resolveFileHoverEntries(enabled, order) {
			const enabledIds = new Set(registry.normalizeFileHoverEnabled(enabled));
			const entries = new Map(hoverEntries.map((entry) => [entry.id, entry]));
			return registry
				.mergeFileHoverOrder(order)
				.filter((id) => enabledIds.has(id))
				.map((id) => entries.get(id))
				.filter((entry): entry is FileHoverEntry => Boolean(entry));
		},
	};

	return registry;
}

const REGISTRY = createExplorerCellRegistry(EXPLORER_CELL_DEFS);

export const DEFAULT_FILES_HOVER_INFO: FileHoverInfoId[] =
	REGISTRY.fileHoverEntries()
		.filter((entry) => entry.defaultOn)
		.map((entry) => entry.id);

export function cellDef(id: string): ExplorerCellDef | undefined {
	return REGISTRY.cellDef(id);
}

export function cellLabelKey(
	definition: ExplorerCellDef,
	explorer: ExplorerTabId,
	viewMode?: ExplorerViewMode,
): string {
	return (
		supportFor(definition, explorer, viewMode)?.labelKey ?? definition.labelKey
	);
}

export function cellIcon(
	definition: ExplorerCellDef,
	explorer: ExplorerTabId,
	viewMode?: ExplorerViewMode,
): string {
	return supportFor(definition, explorer, viewMode)?.icon ?? definition.icon;
}

export function cellsForExplorer(
	explorer: ExplorerTabId,
	viewMode?: ExplorerViewMode,
): ExplorerCellDef[] {
	return REGISTRY.cellsForExplorer(explorer, viewMode);
}

export function viewMenuCells(
	explorer: ExplorerTabId,
	viewMode?: ExplorerViewMode,
	activeCells?: Iterable<string>,
): ExplorerCellDef[] {
	return REGISTRY.viewMenuCells(explorer, viewMode, activeCells);
}

/**
 * BT5-011: how a surface should lay its cells out.
 *
 * The persisted `visibleCells` array IS the activation history — cells are
 * appended as they are switched on — so both modes read the same storage and
 * flipping the setting never loses it.
 */
export interface CellOrderOptions {
	byActivation: boolean;
	viewMode?: ExplorerViewMode;
}

/** Ids that this surface can actually show, in the requested order. */
export function resolveCellRenderOrder(
	explorer: ExplorerTabId,
	visibleCells: readonly string[],
	options: CellOrderOptions,
): string[] {
	const available = REGISTRY.cellsForExplorer(explorer, options.viewMode);
	const rankById = new Map(
		available.map((definition) => [
			definition.id,
			supportFor(definition, explorer, options.viewMode)?.fixedRank ??
				Number.MAX_SAFE_INTEGER,
		]),
	);
	// Unavailable ids are dropped from the projection only; the stored array
	// keeps them, so a cell hidden by context leaves no gap and loses no place.
	const stored = REGISTRY.normalizeVisibleCellIds(
		explorer,
		visibleCells,
		options.viewMode,
	);
	// BT5-012: an excluded projection leaves the row but keeps its stored place.
	const storedSet = new Set(stored);
	const active = stored.filter((id) => {
		const definition = REGISTRY.cellDef(id);
		return !definition || cellAvailable(definition, storedSet);
	});
	if (options.byActivation) return active;
	return [...active].sort(
		(left, right) => (rankById.get(left) ?? 0) - (rankById.get(right) ?? 0),
	);
}

export interface CellMenuEntry {
	id: string;
	definition: ExplorerCellDef;
	active: boolean;
}

/**
 * Menu projection: active cells first in render order, then the rest at their
 * canonical rank, so the menu reads like the row it configures.
 */
export function cellMenuOrder(
	explorer: ExplorerTabId,
	visibleCells: readonly string[],
	options: CellOrderOptions,
): CellMenuEntry[] {
	const menuCells = REGISTRY.viewMenuCells(
		explorer,
		options.viewMode,
		REGISTRY.normalizeVisibleCellIds(explorer, visibleCells, options.viewMode),
	);
	const byId = new Map(
		menuCells.map((definition) => [definition.id, definition]),
	);
	const rendered = resolveCellRenderOrder(
		explorer,
		visibleCells,
		options,
	).filter((id) => byId.has(id));
	const activeIds = new Set(rendered);

	const entries: CellMenuEntry[] = rendered.map((id) => ({
		id,
		definition: byId.get(id)!,
		active: true,
	}));
	for (const definition of menuCells) {
		if (activeIds.has(definition.id)) continue;
		entries.push({ id: definition.id, definition, active: false });
	}
	return options.byActivation
		? entries
		: menuCells.map((definition) => ({
				id: definition.id,
				definition,
				active: activeIds.has(definition.id),
			}));
}

/**
 * Sort options follow the position of the cell they read, so the two menus
 * agree. A sort with no cell keeps its declared order instead of drifting.
 */
export function sortMenuOrder<TOption extends { id: string }>(
	explorer: ExplorerTabId,
	options: readonly TOption[],
	visibleCells: readonly string[],
	orderOptions: CellOrderOptions,
): TOption[] {
	const rendered = resolveCellRenderOrder(explorer, visibleCells, orderOptions);
	const positionBySortId = new Map<string, number>();
	rendered.forEach((cellId, index) => {
		const sortId = REGISTRY.cellDef(cellId)?.sortId;
		if (sortId && !positionBySortId.has(sortId)) {
			positionBySortId.set(sortId, index);
		}
	});
	// Cell-less sorts sit after every cell-backed one, in declaration order.
	const tailBase = rendered.length;
	return [...options].sort((left, right) => {
		const leftPos =
			positionBySortId.get(left.id) ?? tailBase + options.indexOf(left);
		const rightPos =
			positionBySortId.get(right.id) ?? tailBase + options.indexOf(right);
		return leftPos - rightPos;
	});
}

export function defaultVisibleCells(
	explorer: ExplorerTabId,
	viewMode?: ExplorerViewMode,
): string[] {
	return REGISTRY.defaultVisibleCells(explorer, viewMode);
}

export function normalizeVisibleCellIds(
	explorer: ExplorerTabId,
	saved: unknown,
	viewMode?: ExplorerViewMode,
): string[] {
	return REGISTRY.normalizeVisibleCellIds(explorer, saved, viewMode);
}

export function isIdentityCell(
	explorer: ExplorerTabId,
	id: string,
	viewMode?: ExplorerViewMode,
): boolean {
	const definition = REGISTRY.cellDef(id);
	return (
		definition?.role === 'identity' &&
		Boolean(supportFor(definition, explorer, viewMode))
	);
}

export function fileHoverEntries(): FileHoverEntry[] {
	return REGISTRY.fileHoverEntries();
}

export function mergeFileHoverOrder(saved: unknown): FileHoverInfoId[] {
	return REGISTRY.mergeFileHoverOrder(saved);
}

export function normalizeFileHoverEnabled(saved: unknown): FileHoverInfoId[] {
	return REGISTRY.normalizeFileHoverEnabled(saved);
}

export function resolveFileHoverEntries(
	enabled: unknown,
	order: unknown,
): FileHoverEntry[] {
	return REGISTRY.resolveFileHoverEntries(enabled, order);
}

export function reorderFileHoverEntries(
	order: readonly FileHoverInfoId[],
	movedId: FileHoverInfoId,
	targetId: FileHoverInfoId,
): FileHoverInfoId[] {
	const current = REGISTRY.mergeFileHoverOrder(order);
	if (movedId === targetId || !current.includes(movedId)) return current;
	const withoutMoved = current.filter((id) => id !== movedId);
	const targetIndex = withoutMoved.indexOf(targetId);
	if (targetIndex < 0) return current;
	withoutMoved.splice(targetIndex, 0, movedId);
	return withoutMoved;
}
