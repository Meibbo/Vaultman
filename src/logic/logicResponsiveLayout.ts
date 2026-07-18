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
