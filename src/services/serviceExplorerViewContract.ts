import type { ExplorerViewMode } from '../types/typeViews';

export const EXPLORER_PLATFORM_VIEW_MODES = ['tree', 'list', 'table', 'grid', 'cards'] as const;

export type ExplorerPlatformViewMode = (typeof EXPLORER_PLATFORM_VIEW_MODES)[number];

export interface ExplorerViewFeatureFlags {
	selection: boolean;
	keyboardFocus: boolean;
	contextMenu: boolean;
	scrollReveal: boolean;
	badges: boolean;
	nodeElementToggles: boolean;
	acceptsMediaDescriptors: boolean;
}

export interface ExplorerViewScaleContract {
	releaseGateNodes: number;
	mustPassNodes?: number;
	characterizationNodes?: number;
	proofNodes?: number;
}

export interface ExplorerViewFeatureContract {
	viewMode: ExplorerPlatformViewMode;
	features: ExplorerViewFeatureFlags;
	scale: ExplorerViewScaleContract;
	adapterNotes?: string;
}

const SHARED_FEATURES: ExplorerViewFeatureFlags = {
	selection: true,
	keyboardFocus: true,
	contextMenu: true,
	scrollReveal: true,
	badges: true,
	nodeElementToggles: true,
	acceptsMediaDescriptors: true,
};

const CONTRACTS: Record<ExplorerPlatformViewMode, ExplorerViewFeatureContract> = {
	tree: {
		viewMode: 'tree',
		features: SHARED_FEATURES,
		scale: { releaseGateNodes: 10_000, mustPassNodes: 50_000, proofNodes: 100_000 },
	},
	list: {
		viewMode: 'list',
		features: SHARED_FEATURES,
		scale: { releaseGateNodes: 10_000, mustPassNodes: 50_000, proofNodes: 100_000 },
	},
	table: {
		viewMode: 'table',
		features: SHARED_FEATURES,
		scale: { releaseGateNodes: 10_000, characterizationNodes: 50_000 },
		adapterNotes: 'Consumes platform projection facts; 50K is characterized before full migration.',
	},
	grid: {
		viewMode: 'grid',
		features: SHARED_FEATURES,
		scale: { releaseGateNodes: 10_000, characterizationNodes: 50_000 },
		adapterNotes: 'Consumes platform projection facts; 50K is characterized before full migration.',
	},
	cards: {
		viewMode: 'cards',
		features: SHARED_FEATURES,
		scale: { releaseGateNodes: 10_000, characterizationNodes: 50_000 },
		adapterNotes: 'Consumes platform projection facts; 50K is characterized before full migration.',
	},
};

export function explorerViewContract(
	viewMode: ExplorerPlatformViewMode,
): ExplorerViewFeatureContract {
	return CONTRACTS[viewMode];
}

export function isExplorerPlatformViewMode(
	viewMode: ExplorerViewMode,
): viewMode is ExplorerPlatformViewMode {
	return (EXPLORER_PLATFORM_VIEW_MODES as readonly string[]).includes(viewMode);
}
