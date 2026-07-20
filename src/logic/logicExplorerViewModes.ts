import type { ExplorerViewMode } from '../types/typeUI';
import type { StatisticsDataTab } from './logicStatisticsNavigation';

export type DataExplorerSurface = StatisticsDataTab | 'snippets' | 'plugins';
export type PanelViewMode = 'tree' | 'grid' | 'table';

export interface ExplorerViewModeOption {
	id: ExplorerViewMode;
	icon: string;
	labelKey: string;
	locked?: boolean;
}

const VIEW_MODE_DEFS: Record<ExplorerViewMode, ExplorerViewModeOption> = {
	tree: {
		id: 'tree',
		icon: 'lucide-list-tree',
		labelKey: 'viewmode.mode.tree',
	},
	table: {
		id: 'table',
		icon: 'lucide-table-2',
		labelKey: 'viewmode.mode.table',
	},
	// BT5-016: the user-facing card engine is Cards; 'grid' survives only as a
	// legacy persisted value normalized below.
	grid: {
		id: 'grid',
		icon: 'lucide-layout-grid',
		labelKey: 'viewmode.mode.cards',
	},
	dnd: {
		id: 'dnd',
		icon: 'lucide-grip-vertical',
		labelKey: 'viewmode.mode.dnd',
		locked: true,
	},
	cards: {
		id: 'cards',
		icon: 'lucide-layout-grid',
		labelKey: 'viewmode.mode.cards',
	},
};

/**
 * Map persisted/legacy values onto the current user-facing mode ids
 * (BT5-016: saved `grid` loads as Cards). Unknown values fall back to tree;
 * passing a surface additionally clamps to what that surface offers.
 */
export function normalizeExplorerViewMode(
	value: unknown,
	surface?: DataExplorerSurface,
): ExplorerViewMode {
	const mapped: ExplorerViewMode =
		value === 'grid' || value === 'cards'
			? 'cards'
			: value === 'table' || value === 'dnd' || value === 'tree'
				? value
				: 'tree';
	if (surface !== undefined) {
		return isViewModeSelectableForDataSurface(surface, mapped)
			? mapped
			: 'tree';
	}
	return mapped === 'dnd' ? 'tree' : mapped;
}

export function viewModesForDataSurface(
	surface: DataExplorerSurface,
): ExplorerViewModeOption[] {
	if (surface === 'content') return [];
	if (surface === 'snippets' || surface === 'plugins') {
		return [VIEW_MODE_DEFS.tree];
	}
	if (surface === 'files') {
		return [
			VIEW_MODE_DEFS.tree,
			VIEW_MODE_DEFS.table,
			VIEW_MODE_DEFS.cards,
			VIEW_MODE_DEFS.dnd,
		];
	}
	return [
		VIEW_MODE_DEFS.tree,
		VIEW_MODE_DEFS.cards,
		VIEW_MODE_DEFS.table,
		VIEW_MODE_DEFS.dnd,
	];
}

export function selectableViewModesForDataSurface(
	surface: DataExplorerSurface,
): ExplorerViewMode[] {
	return viewModesForDataSurface(surface)
		.filter((mode) => !mode.locked)
		.map((mode) => mode.id);
}

export function isViewModeSelectableForDataSurface(
	surface: DataExplorerSurface,
	mode: ExplorerViewMode,
): boolean {
	return selectableViewModesForDataSurface(surface).includes(mode);
}

export function panelViewModeForDataSurface(
	surface: DataExplorerSurface,
	mode: ExplorerViewMode,
): PanelViewMode {
	// Legacy persisted 'grid' behaves as Cards (BT5-016).
	const normalized = normalizeExplorerViewMode(mode, surface);
	if (surface === 'files' && normalized === 'table') return 'table';
	if (surface === 'files' && normalized === 'cards') return 'grid';
	if ((surface === 'props' || surface === 'tags') && normalized === 'cards')
		return 'grid';
	if ((surface === 'props' || surface === 'tags') && normalized === 'table')
		return 'table';
	return 'tree';
}
