export interface ExplorerDensityProfile {
	treeRowHeight: number;
	tableRowHeight: number;
	gridRowHeight: number;
	gridMinCardWidth: number;
}

export const NARROW_FILES_TOOLBAR_WIDTH = 220;
export const NARROW_LABELED_SEARCH_WIDTH = 200;
export const LABELED_TOOLBAR_EXTRA_WIDTH = 80;

const DESKTOP_EXPLORER_DENSITY: ExplorerDensityProfile = {
	treeRowHeight: 28,
	tableRowHeight: 30,
	gridRowHeight: 92,
	gridMinCardWidth: 112,
};

const MOBILE_EXPLORER_DENSITY: ExplorerDensityProfile = {
	treeRowHeight: 37,
	tableRowHeight: 37,
	gridRowHeight: 112,
	gridMinCardWidth: 136,
};

export function explorerDensityProfile(
	isMobile: boolean,
): ExplorerDensityProfile {
	return isMobile ? MOBILE_EXPLORER_DENSITY : DESKTOP_EXPLORER_DENSITY;
}

/** Cells that render inside the files card metadata row (BT5-016). */
export const GRID_META_CELL_IDS = [
	'ext',
	'count',
	'words',
	'mtime',
	'ctime',
] as const;

/** Vertical extent the card metadata row occupies (meta min-height + gap). */
export const GRID_META_ROW_EXTENT = 20;

export function hasGridMetaCells(visibleCells: ReadonlySet<string>): boolean {
	return GRID_META_CELL_IDS.some((cell) => visibleCells.has(cell));
}

/**
 * Worst-case sample content per active meta cell, used to measure the real
 * (wrapped) card height for the current cell configuration (BT5-016 repair).
 * Samples are deliberately as wide as realistic values get so the measured
 * row slot is never shorter than an actual card.
 */
const GRID_META_SAMPLE_BY_CELL: Record<string, string> = {
	ext: 'markdown',
	count: '999',
	words: '99999',
	mtime: new Date(2026, 11, 29).toLocaleDateString(),
	ctime: new Date(2026, 11, 29).toLocaleDateString(),
};

export function gridMetaSampleValues(
	visibleCells: ReadonlySet<string>,
): string[] {
	return GRID_META_CELL_IDS.filter((cell) => visibleCells.has(cell)).map(
		(cell) => GRID_META_SAMPLE_BY_CELL[cell],
	);
}

/**
 * BT5-016: a card without active meta cells collapses to its content height
 * instead of reserving the empty metadata box, and the virtual row height
 * shrinks by the same extent so cards never overlap.
 */
export function gridRowHeightFor(
	profile: ExplorerDensityProfile,
	hasMetaCells: boolean,
): number {
	return hasMetaCells
		? profile.gridRowHeight
		: profile.gridRowHeight - GRID_META_ROW_EXTENT;
}

export function usesMobileExplorerDensity(
	platformIsMobile: boolean,
	bodyClasses: Pick<DOMTokenList, 'contains'>,
): boolean {
	return (
		platformIsMobile ||
		bodyClasses.contains('is-mobile') ||
		bodyClasses.contains('is-phone')
	);
}

export function shouldCondenseFilesToolbar({
	activeSectionTab,
	frameWidth,
	manual,
	minimalStyle,
	tabLabelVisible = false,
}: {
	activeSectionTab: string;
	frameWidth: number;
	manual: boolean;
	minimalStyle: boolean;
	tabLabelVisible?: boolean;
}): boolean {
	if (!minimalStyle || activeSectionTab !== 'files') return false;
	const threshold =
		NARROW_FILES_TOOLBAR_WIDTH +
		(tabLabelVisible ? LABELED_TOOLBAR_EXTRA_WIDTH : 0);
	return manual || (frameWidth > 0 && frameWidth < threshold);
}

export function shouldShowMinimalSearchInput({
	minimalStyle,
	searchExpanded,
}: {
	frameWidth: number;
	minimalStyle: boolean;
	searchExpanded: boolean;
	tabLabelVisible: boolean;
}): boolean {
	if (!minimalStyle) return true;
	return searchExpanded;
}

/** While the expanded search and the tab label cannot both fit, the label
 * yields — hiding the search instead left it unreachable (BT4-001). */
export function shouldHideTabLabelForSearch({
	frameWidth,
	minimalStyle,
	searchExpanded,
}: {
	frameWidth: number;
	minimalStyle: boolean;
	searchExpanded: boolean;
}): boolean {
	if (!minimalStyle || !searchExpanded) return false;
	return frameWidth > 0 && frameWidth < NARROW_LABELED_SEARCH_WIDTH;
}
