export interface ExplorerDensityProfile {
	treeRowHeight: number;
	tableRowHeight: number;
	gridRowHeight: number;
	gridMinCardWidth: number;
}

export const NARROW_FILES_TOOLBAR_WIDTH = 220;

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
}: {
	activeSectionTab: string;
	frameWidth: number;
	manual: boolean;
	minimalStyle: boolean;
}): boolean {
	if (!minimalStyle || activeSectionTab !== 'files') return false;
	return (
		manual ||
		(frameWidth > 0 && frameWidth < NARROW_FILES_TOOLBAR_WIDTH)
	);
}
