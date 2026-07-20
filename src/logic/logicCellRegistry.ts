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
		supports: [{ explorer: 'props', fixedRank: 30, defaultOn: false }],
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
		viewMenuCells(explorer, viewMode) {
			return registry
				.cellsForExplorer(explorer, viewMode)
				.filter(
					(definition) =>
						definition.role !== 'topology' &&
						definition.role !== 'label-projection',
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
): ExplorerCellDef[] {
	return REGISTRY.viewMenuCells(explorer, viewMode);
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
