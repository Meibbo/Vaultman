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
	isPlaceholder?: boolean;
	locked?: boolean;
	lockBackdrop?: boolean;
	badge?: 'queue' | 'filters';
	warningCount?: number;
}

export type ExplorerTabId = 'props' | 'files' | 'tags' | 'snippets' | 'plugins';
export type ExplorerViewMode = 'tree' | 'table' | 'dnd' | 'grid' | 'cards';
export type ExplorerSortDirection = 'asc' | 'desc';
/**
 * Spec 08 §3.1.bis: scopes are LEVELS, not names. `all` = every level;
 * `drill` = the parent picked with "Select a parent" (`drillNodeId`), whose
 * sort is stored under `parent:<id>`; `level:N` = every parent of level N
 * (1 = root siblings; the old `properties`/`values` were levels 1 and 2 and
 * `groups` level 0); `parent:<id>` = one parent's own sort.
 */
export type SortScopeKey =
	| 'all'
	| 'drill'
	| `level:${number}`
	| `parent:${string}`;

/**
 * A persisted target in a scene's scope space. `drill` is deliberately not
 * part of this type: it was the old, cursor-shaped spelling for a picked
 * parent and is accepted only by the sort-state migration layer.
 */
export type ScopeTarget = 'all' | `level:${number}` | `parent:${string}`;

/** The independent configuration carried by one scope target. */
export interface ScopeSet {
	/** Sort applied to direct siblings covered by this target. */
	sort?: ScopeSort;
	/** Grouping preset projected at the sibling lists covered by this target. */
	groupPreset?: import('./typeGroupPreset').GroupPreset;
	/** Per-cell overrides; omitted cells inherit from the scene base. */
	cellToggles?: Partial<Record<string, boolean>>;
	/** By-type filter overrides for this target. */
	nodeTypeFilters?: string[];
	/** Whether this target is included in the active filter policy. */
	filterPolicy?: 'included';
	/** Hidden targets remain persisted but are ignored by resolution. */
	hidden?: boolean;
}

/** Per-scene scope space. `cursor` selects the set being edited only. */
export interface ScopeState {
	sets: Partial<Record<ScopeTarget, ScopeSet>>;
	cursor: ScopeTarget;
	/** Persisted migration marker for the 1-based p-node level numbering. */
	levelBase?: 1;
}

export interface ScopeSort {
	sortBy: string;
	direction: ExplorerSortDirection;
}

export interface ExplorerSortState {
	sorts: Partial<Record<SortScopeKey, ScopeSort>>;
	/**
	 * U130-GGC cumulative target configuration. It is persisted inside the
	 * scene-owned sort state so legacy SceneConfig/layout ports keep carrying
	 * one atomic scope snapshot while the old flat fields migrate in place.
	 */
	scopeState?: ScopeState;
	activeScope: SortScopeKey;
	drillNodeId?: string | null;
	/** Spec 08 §4 `hide` on a scope row: kept in `sorts`, ignored when resolving. */
	hiddenScopes?: SortScopeKey[];
	/** Legacy single selection; retained when exactly one type is selected. */
	nodeTypeFilter: string | null;
	/** Multi-selection form. Missing means load nodeTypeFilter for compatibility. */
	nodeTypeFilters?: string[];
	parentsFirst?: boolean;
	/**
	 * Props reveal: pin the synthetic "+ Add property" row first instead of
	 * last. Off by default — last is the resting state, mirroring how
	 * folders-first pins without re-sorting the list itself.
	 */
	addPropertyFirst?: boolean;
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
