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
	/**
	 * Character offset of the match in the file.
	 *
	 * It used to carry `line` and `ch`, computed while scanning. Deriving them
	 * meant slicing the content from zero to the match and splitting it on
	 * newlines, once per match — which is where the fps went once the snippet cap
	 * was removed. The position is only needed when a match is clicked, and the
	 * open editor already has a line index: `editor.offsetToPos(offset)`.
	 */
	offset: number;
	/**
	 * Bounds of the slice currently shown, as character offsets.
	 *
	 * Core keeps these per match and moves them one structural unit at a time
	 * through `showMoreBefore` / `showMoreAfter`, which is what its two hover
	 * chevrons do. Carrying them here is what lets one match be opened up
	 * without touching its neighbours.
	 */
	from: number;
	to: number;
	/**
	 * Whether there is anything left to reveal in each direction.
	 *
	 * Core hides both chevrons and, on hover, calls
	 * `toggle(this.start > 0)` / `toggle(this.end < this.content.length)` — so a
	 * match already showing the top of its file offers no upward chevron.
	 */
	moreBefore: boolean;
	moreAfter: boolean;
	/**
	 * Whether the default walk stopped on its hundred-character budget rather
	 * than on a line break. Core appends an ellipsis in that case.
	 */
	truncatedBefore: boolean;
	truncatedAfter: boolean;
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
	/** Files: folders-first keeps a stable name order, immune to the sort */
	fixedFolders?: boolean;
	/**
	 * Props/Tags: narrow the projection to the nodes present in the filtered
	 * file set instead of the whole vault. Files (U121-052): hide the files the
	 * active filter leaves out — while off, the tree shows the whole vault, so
	 * building a filter no longer hides what is being worked on. Off by default
	 * — "global" is simply this being off, which is why there is no separate
	 * global switch.
	 */
	filtered?: boolean;
	/**
	 * Which note the reveal projection follows. `current-file` tracks the
	 * workspace's active file; `pinned` holds `revealAnchorPath` until the user
	 * picks Current File again, so changing focus no longer changes the list.
	 */
	revealAnchor?: 'current-file' | 'pinned';
	/** The note `revealAnchor: 'pinned'` is held to. */
	revealAnchorPath?: string | null;
}
