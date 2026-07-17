import type { TFile } from 'obsidian';

export type PopupType = 'active-filters' | 'scope' | 'search' | 'move';

export type OpsTab = 'template' | 'layout' | 'content';

export interface defOpsTab {
	id: OpsTab;
	label: string;
	icon: string;
}

export interface ContentSnippet {
	before: string;
	match: string;
	after: string;
	line: number;
	ch: number;
}

export interface ContentPreviewResult {
	totalMatches: number;
	files: Array<{
		file: TFile;
		matchCount: number;
		snippets: ContentSnippet[];
	}>;
	/** All files with at least one match, including files not rendered in the preview cap. */
	matchedFiles?: TFile[];
	moreFiles: number;
	isLoading?: boolean;
}

export interface FabDef {
	icon: string;
	label: string;
	action: () => void;
	doubleClickAction?: () => void;
	isPlaceholder?: boolean;
	locked?: boolean;
	lockBackdrop?: boolean;
	badge?: 'queue' | 'filters';
	warningCount?: number;
}

export type ExplorerTabId = 'props' | 'files' | 'tags' | 'snippets' | 'plugins';
export type ExplorerViewMode = 'tree' | 'table' | 'dnd' | 'grid' | 'cards';
export type ExplorerSortDirection = 'asc' | 'desc';
export type SortScopeKey = 'all' | 'drill' | 'properties' | 'values';

export interface ScopeSort {
	sortBy: string;
	direction: ExplorerSortDirection;
}

export interface ExplorerSortState {
	sorts: Partial<Record<SortScopeKey, ScopeSort>>;
	activeScope: SortScopeKey;
	drillNodeId?: string | null;
	/** Legacy single selection; retained when exactly one type is selected. */
	nodeTypeFilter: string | null;
	/** Multi-selection form. Missing means load nodeTypeFilter for compatibility. */
	nodeTypeFilters?: string[];
	parentsFirst?: boolean;
}
