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

export type NativeStateMod =
	| 'is-active'
	| 'is-selected'
	| 'is-focused'
	| 'is-being-dragged'
	| 'is-being-dragged-over'
	| 'has-active-menu'
	| 'is-clickable'
	| 'is-collapsed'
	| 'mod-collapsible'
	| 'is-being-renamed'
	| 'is-cut';

export interface NativeClassVocabulary {
	rowRoot: string | null;
	primaryLabel: string | null;
	innerWrapper: string | null;
	childrenContainer: string | null;
	collapseIcon: string | null;
	cellWrapper: string | null;
	coverImage: string | null;
	headerCell: string | null;
	/** Column resize handle inside a header cell (SDF-011 Bases parity; table only). */
	headerResizer: string | null;
	rowStateMods: readonly NativeStateMod[];
}

export interface NativeDomEmission {
	panel: NativeClassVocabulary;
	inEditor: NativeClassVocabulary;
}

export interface ExplorerViewFeatureContract {
	viewMode: ExplorerPlatformViewMode;
	features: ExplorerViewFeatureFlags;
	scale: ExplorerViewScaleContract;
	nativeDomEmission: NativeDomEmission;
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

const NULL_VOCAB: NativeClassVocabulary = {
	rowRoot: null,
	primaryLabel: null,
	innerWrapper: null,
	childrenContainer: null,
	collapseIcon: null,
	cellWrapper: null,
	coverImage: null,
	headerCell: null,
	headerResizer: null,
	rowStateMods: [],
};

const CONTRACTS: Record<ExplorerPlatformViewMode, ExplorerViewFeatureContract> = {
	tree: {
		viewMode: 'tree',
		features: SHARED_FEATURES,
		scale: { releaseGateNodes: 10_000, mustPassNodes: 50_000, proofNodes: 100_000 },
		nativeDomEmission: {
			panel: {
				rowRoot: 'tree-item',
				primaryLabel: 'tree-item-inner',
				innerWrapper: 'tree-item-self',
				childrenContainer: 'tree-item-children',
				collapseIcon: 'collapse-icon',
				cellWrapper: null,
				coverImage: null,
				headerCell: null,
				headerResizer: null,
				rowStateMods: [
					'is-active',
					'is-selected',
					'is-focused',
					'has-active-menu',
					'is-being-dragged',
					'is-being-dragged-over',
					'mod-collapsible',
					'is-collapsed',
				],
			},
			inEditor: {
				rowRoot: 'tree-item',
				primaryLabel: 'tree-item-inner',
				innerWrapper: 'tree-item-self',
				childrenContainer: 'tree-item-children',
				collapseIcon: 'collapse-icon',
				cellWrapper: null,
				coverImage: null,
				headerCell: null,
				headerResizer: null,
				rowStateMods: ['is-active', 'is-selected', 'is-focused'],
			},
		},
	},
	list: {
		viewMode: 'list',
		features: SHARED_FEATURES,
		scale: { releaseGateNodes: 10_000, mustPassNodes: 50_000, proofNodes: 100_000 },
		nativeDomEmission: { panel: NULL_VOCAB, inEditor: NULL_VOCAB },
	},
	table: {
		viewMode: 'table',
		features: SHARED_FEATURES,
		scale: { releaseGateNodes: 10_000, characterizationNodes: 50_000 },
		adapterNotes:
			'Consumes platform projection facts; 50K is characterized before full migration. Adopts Bases table vocabulary in native preset.',
		nativeDomEmission: {
			panel: {
				rowRoot: 'bases-tr',
				primaryLabel: 'bases-table-cell',
				innerWrapper: null,
				childrenContainer: null,
				collapseIcon: null,
				cellWrapper: 'bases-td',
				coverImage: null,
				headerCell: 'bases-table-header',
				headerResizer: 'bases-table-header-resizer',
				rowStateMods: [
					'is-active',
					'is-selected',
					'is-focused',
					'has-active-menu',
					'is-being-dragged',
					'is-being-dragged-over',
				],
			},
			inEditor: {
				rowRoot: 'bases-tr',
				primaryLabel: 'bases-table-cell',
				innerWrapper: null,
				childrenContainer: null,
				collapseIcon: null,
				cellWrapper: 'bases-td',
				coverImage: null,
				headerCell: 'bases-table-header',
				headerResizer: 'bases-table-header-resizer',
				rowStateMods: ['is-active', 'is-selected', 'is-focused'],
			},
		},
	},
	grid: {
		viewMode: 'grid',
		features: SHARED_FEATURES,
		scale: { releaseGateNodes: 10_000, characterizationNodes: 50_000 },
		adapterNotes:
			'Consumes platform projection facts; 50K is characterized before full migration. No Bases analog for grid; emits vm-* classes exclusively.',
		nativeDomEmission: { panel: NULL_VOCAB, inEditor: NULL_VOCAB },
	},
	cards: {
		viewMode: 'cards',
		features: SHARED_FEATURES,
		scale: { releaseGateNodes: 10_000, characterizationNodes: 50_000 },
		adapterNotes:
			'Consumes platform projection facts; 50K is characterized before full migration. Adopts Bases cards (gallery) vocabulary in native preset, including bases-cards-cover for the media slot.',
		nativeDomEmission: {
			panel: {
				rowRoot: 'bases-cards-item',
				primaryLabel: 'bases-cards-property mod-title',
				innerWrapper: null,
				childrenContainer: null,
				collapseIcon: null,
				cellWrapper: 'bases-cards-property',
				coverImage: 'bases-cards-cover',
				headerCell: null,
				headerResizer: null,
				rowStateMods: [
					'is-active',
					'is-selected',
					'is-focused',
					'has-active-menu',
					'is-being-dragged',
					'is-being-dragged-over',
				],
			},
			inEditor: {
				rowRoot: 'bases-cards-item',
				primaryLabel: 'bases-cards-property mod-title',
				innerWrapper: null,
				childrenContainer: null,
				collapseIcon: null,
				cellWrapper: 'bases-cards-property',
				coverImage: 'bases-cards-cover',
				headerCell: null,
				headerResizer: null,
				rowStateMods: ['is-active', 'is-selected', 'is-focused'],
			},
		},
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
