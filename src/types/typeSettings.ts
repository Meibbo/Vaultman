import type { Plugin } from 'obsidian';
import type { FilterTemplate } from './typeFilter';
import type { MenuHideRule } from './typeCtxMenu';
import { DEFAULT_LAYOUT_SETTINGS, type LayoutSettings } from '../services/serviceLayout';
import type { MouseGestureConfig, NodeMouseActionConfig } from '../services/serviceMouse';
import { DEFAULT_NODE_MOUSE_ACTIONS } from '../services/serviceMouse';
import type { OperationScope } from '../services/serviceOperationScope';
import { DEFAULT_ELASTIC_UI_SETTINGS, type ElasticUiSettings } from './typeElasticUi';

export type Language = 'auto' | 'en' | 'es';
export type MouseGestureSurface = 'node' | 'fab' | 'toolbar';

export interface VaultmanSettings {
	/** Render the search affordance inline in the toolbar primitives row,
	 *  or as the lifted overlay island. Inline mode keeps a permanent search
	 *  input between the toolbar buttons; clicking expand promotes to overlay. */
	toolbarSearchMode: 'island' | 'inline';
	/** Whether popup islands close when clicking the transparent outside area/backdrop. */
	islandDismissOnOutsideClick: boolean;
	/** Desaturate accent tokens when the Obsidian workspace, not Vaultman chrome, has focus. */
	faintAccentsWhenWorkspaceFocused: boolean;
	/** Elastic UI / Chameleon mode + identity contracts. */
	elasticUi: ElasticUiSettings;
	// after this line these settings are not used
	//
	// -----------------------------------------------------------------
	defaultPropertyType: string;
	filterTemplates: FilterTemplate[];
	/** Path to the active session .md file (empty = no session) */
	sessionFilePath: string;
	/** Ctrl+click on property/value opens Obsidian core search */
	explorerCtrlClickSearch: boolean;
	/** Show pending queue changes in the explorer tree */
	explorerShowQueuePreview: boolean;
	/** Show badges, highlights, and active row styling on ordinary nodes matched by active filters. */
	explorerShowMatchedFilterDecorations: boolean;
	/** Show base backgrounds on node surfaces such as tree rows, grid tiles, cards, and table rows. */
	explorerNodeBackgrounds: boolean;
	/** Show base borders/shadows on node surfaces such as grid tiles, cards, and table rows. */
	explorerNodeBorders: boolean;
	/** Enable content search in file tree */
	explorerContentSearch: boolean;
	/** Default scope for explorer operations: auto = selected > filtered */
	explorerOperationScope: OperationScope;
	/** Show dot-prefixed files and folders in the Files explorer. */
	explorerFilesShowHidden: boolean;
	/** Place folder nodes before file nodes in the Files explorer. */
	explorerFilesFoldersFirst: boolean;
	/** Enable manual native drag/drop for node surfaces from the sort menu. */
	manualDndEnabled?: boolean;
	/** Configurable mouse gesture grammar per interactive surface. */
	mouseGestures?: Partial<Record<MouseGestureSurface, MouseGestureConfig>>;
	/** Configurable command semantics for primary/secondary/tertiary node gestures. */
	nodeMouseActions?: NodeMouseActionConfig;
	/** Generic placement contract for pages, tabs, dock labels, and tab labels. */
	layout?: LayoutSettings;
	/** Persisted visible node fields keyed by `${providerId}:${viewMode}`. */
	viewFieldVisibility?: Record<string, string[]>;
	/** Position of the operations panel */
	operationsPanelPosition: 'right' | 'bottom' | 'replace';
	/** Path to last .base file used with Vaultman */
	basesLastUsedPath: string;
	/** Fallback when no .base file is open */
	basesOpenMode: 'last-used' | 'picker';
	/** Side for operations panel */
	basesOpsPanelSide: 'left' | 'right';
	/** Side for explorer panel */
	basesExplorerSide: 'left' | 'right';
	/** Auto-open panels when active leaf becomes .base */
	basesAutoAttach: boolean;
	/** Inject checkbox column into .base table */
	basesInjectCheckboxes: boolean;
	/** Show column separators in .base table */
	basesShowColumnSeparators: boolean;
	/** What to open when the ribbon icon is clicked: sidebar only, main view only, or both */
	openMode: 'sidebar' | 'main' | 'both';
	/** Order of pages in the sidebar bottom nav (page IDs: 'ops', 'statistics', 'filters') */
	pageOrder: string[];
	/** When true, each page opens as its own Obsidian sidebar pane */
	separatePanes: boolean;
	/** File list view mode in the sidebar Files page */
	viewMode: 'list' | 'selected';
	/** Show labels on the tab bar in the Filters page */
	filtersShowTabLabels: boolean;
	/** Internal one-shot migration marker for the Iter.12 tab label default */
	filtersTabLabelsMigrated?: boolean;
	/** Property grid render mode */
	gridRenderMode?: 'plain' | 'chunk' | 'all';
	/** How hierarchical nodes are represented in the grid */
	gridHierarchyMode?: 'folder' | 'inline';
	/** Columns that allow inline editing in the grid */
	gridEditableColumns?: string[];
	/** Columns that use live preview in the grid */
	gridLivePreviewColumns?: string[];
	/** Chunk size for live-preview rendering */
	gridRenderChunkSize?: number;
	/** Columns shown in the property grid */
	gridColumns?: string[];
	/** Show Vaultman items in Obsidian's file-menu (right-click in explorer) */
	contextMenuShowInFileMenu: boolean;
	/** Show Vaultman items in Obsidian's editor-menu (right-click in editor) */
	contextMenuShowInEditorMenu: boolean;
	/** Show Vaultman items in Obsidian's more-options menu (··· button) */
	contextMenuShowInMoreOptions: boolean;
	/** Rules for hiding native/third-party items from workspace context menus */
	contextMenuHideRules: MenuHideRule[];
	/** Maximum number of records retained by the ops-log ring buffer. */
	opsLogRetention?: number;
	/**
	 * Per-tab detach flags persisted by `LeafDetachService`. Keys are
	 * canonical `TabId` strings from `src/registry/tabRegistry.ts`.
	 * Owned exclusively by `LeafDetachService` (phase 6, multifacet wave 2).
	 */
	independentLeaves?: Record<string, boolean>;
	/**
	 * Folder where new binding notes are created (Phase 7, multifacet
	 * wave 2). Empty string means vault root. The Settings UI validates
	 * the folder exists or offers to create it before saving.
	 */
	bindingNoteFolder?: string;
	/**
	 * Default state for the FnR island `regex` flag on instantiation
	 * (Phase 8, multifacet wave 2). When true, new `FnRIslandService`
	 * instances start with `flags.regex = true` (and `wholeWord = false`
	 * because of mutual exclusion).
	 */
	fnrRegexDefault?: boolean;
}

/** Minimal interface used by VaultmanSettingsTab — breaks the main.ts circular import. */
export interface iVaultmanPlugin extends Plugin {
	settings: VaultmanSettings;
	saveSettings(): Promise<void>;
}

export const DEFAULT_SETTINGS: VaultmanSettings = {
	toolbarSearchMode: 'island',
	islandDismissOnOutsideClick: false,
	faintAccentsWhenWorkspaceFocused: false,
	elasticUi: { ...DEFAULT_ELASTIC_UI_SETTINGS },
	// after this line these settings are not used
	//
	// -----------------------------------------------------------------
	defaultPropertyType: 'text',
	filterTemplates: [],
	sessionFilePath: '',
	explorerCtrlClickSearch: true,
	explorerShowQueuePreview: true,
	explorerShowMatchedFilterDecorations: false,
	explorerNodeBackgrounds: true,
	explorerNodeBorders: true,
	explorerContentSearch: true,
	explorerOperationScope: 'auto',
	explorerFilesShowHidden: false,
	explorerFilesFoldersFirst: true,
	manualDndEnabled: false,
	mouseGestures: {
		node: { primaryTiming: 'immediate', tertiary: ['alt-click', 'middle-click'] },
		fab: { primaryTiming: 'defer', tertiary: ['alt-click', 'middle-click'] },
		toolbar: { primaryTiming: 'defer', tertiary: ['alt-click', 'middle-click'] },
	},
	nodeMouseActions: DEFAULT_NODE_MOUSE_ACTIONS,
	layout: DEFAULT_LAYOUT_SETTINGS,
	viewFieldVisibility: {},
	operationsPanelPosition: 'right',
	basesLastUsedPath: '',
	basesOpenMode: 'last-used',
	basesOpsPanelSide: 'left',
	basesExplorerSide: 'right',
	basesAutoAttach: false,
	basesInjectCheckboxes: true,
	basesShowColumnSeparators: false,
	openMode: 'sidebar',
	pageOrder: ['ops', 'statistics', 'filters'],
	separatePanes: false,
	viewMode: 'list',
	filtersShowTabLabels: true,
	filtersTabLabelsMigrated: true,
	gridHierarchyMode: 'folder',
	contextMenuShowInFileMenu: true,
	contextMenuShowInEditorMenu: true,
	contextMenuShowInMoreOptions: true,
	contextMenuHideRules: [],
	opsLogRetention: 1000,
	independentLeaves: {},
	bindingNoteFolder: '',
	fnrRegexDefault: false,
};
