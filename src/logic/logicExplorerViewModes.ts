import type { ExplorerViewMode } from '../types/typeUI';
import type { StatisticsDataTab } from './logicStatisticsNavigation';

export type DataExplorerSurface = StatisticsDataTab;
export type PanelViewMode = 'tree' | 'grid';

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
	grid: {
		id: 'grid',
		icon: 'lucide-layout-grid',
		labelKey: 'viewmode.mode.grid',
	},
	dnd: {
		id: 'dnd',
		icon: 'lucide-grip-vertical',
		labelKey: 'viewmode.mode.dnd',
		locked: true,
	},
	cards: {
		id: 'cards',
		icon: 'lucide-layout-panel-top',
		labelKey: 'viewmode.mode.cards',
		locked: true,
	},
};

export function viewModesForDataSurface(
	surface: DataExplorerSurface,
): ExplorerViewModeOption[] {
	if (surface === 'content') return [];
	if (surface === 'files') {
		return [
			VIEW_MODE_DEFS.tree,
			VIEW_MODE_DEFS.table,
			{ ...VIEW_MODE_DEFS.grid, locked: true },
			VIEW_MODE_DEFS.dnd,
			VIEW_MODE_DEFS.cards,
		];
	}
	return [
		VIEW_MODE_DEFS.tree,
		VIEW_MODE_DEFS.grid,
		{ ...VIEW_MODE_DEFS.table, locked: true },
		VIEW_MODE_DEFS.dnd,
		VIEW_MODE_DEFS.cards,
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
	if (!isViewModeSelectableForDataSurface(surface, mode)) return 'tree';
	if (surface === 'files' && mode === 'table') return 'grid';
	if ((surface === 'props' || surface === 'tags') && mode === 'grid')
		return 'grid';
	return 'tree';
}
