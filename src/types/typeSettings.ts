import type { Plugin } from 'obsidian';
import type { FilterTemplate } from './typeFilter';
import type { MenuHideRule } from './typeCMenu';
import type { QueueTemplate } from './typeOps';
import type { BadgeCancelClickMode } from '../utils/badgeInteraction';
import type { ExplorerSortState } from './typeUI';
import type { InteractionMode } from '../logic/logicInteractionMode';
import {
	DEFAULT_FILES_HOVER_INFO,
	type FileHoverInfoId,
} from '../logic/logicCellRegistry';
import type { AddonIconOverrides } from '../logic/logicAddonIcons';
import type { FilesMenuItem } from '../logic/logicFilesContextMenu';

export type Language = 'auto' | 'en' | 'es';

/** A saved per-tab explorer view config (view options + sort). */
export interface SavedViewConfig {
	viewMode: string;
	visibleCells: string[];
	sortState: ExplorerSortState;
	interactionMode?: InteractionMode;
}

/** Floating index state captured with a layout (D40). */
export interface SavedFloatingTocState {
	enabled: boolean;
	kind: 'files' | 'folders';
	rootId: string | null;
}

/** A named explorer layout: per-tab configs + a short human summary. */
export interface SavedLayout {
	name: string;
	summary: string;
	config: Record<string, SavedViewConfig>;
	floatingToc?: SavedFloatingTocState;
}

export const FILES_ICON_SCOPES = ['all', 'files', 'folders', 'custom'] as const;
export type FilesIconScope = (typeof FILES_ICON_SCOPES)[number];
export type AddonCellStyle = 'native' | 'badge';

export interface VaultmanSettings {
	language: Language;
	defaultPropertyType: string;
	filterTemplates: FilterTemplate[];
	queueTemplates: QueueTemplate[];
	/** Path to the active session .md file (empty = no session) */
	sessionFilePath: string;
	/** Plugin version whose Updates welcome was last acknowledged */
	lastSeenUpdatesVersion: string;
	/** Ctrl+click on property/value opens Obsidian core search */
	explorerCtrlClickSearch: boolean;
	/** Show pending queue changes in the explorer tree */
	explorerShowQueuePreview: boolean;
	/** Enable content search in file tree */
	explorerContentSearch: boolean;
	/** Highlight explorer rows/cards that match the current explorer search */
	explorerSearchHighlights: boolean;
	/** Default scope for explorer operations: auto = selected > filtered > all */
	explorerOperationScope: 'auto' | 'selected' | 'filtered' | 'all';
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
	openMode: 'sidebar' | 'main' | 'new_instance' | 'both';
	/**
	 * U121-027: render Last opened / Modified / Created as relative copy ("3 hours
	 * ago") while they are under a day old. Off renders the exact date everywhere,
	 * which is the 1.2.0 behaviour.
	 */
	timestampRelative: boolean;
	/** Order of pages in the sidebar bottom nav (page IDs: 'filters', 'statistics') */
	pageOrder: string[];
	/** Glassmorphism blur intensity for bottom bar and popups (0–100, maps to 0–20px) */
	glassBlurIntensity: number;
	/** When true, each page opens as its own Obsidian sidebar pane */
	separatePanes: boolean;
	/** File list view mode in the sidebar Files page */
	viewMode: 'list' | 'selected';
	/** Show labels on the tab bar in the Filters page */
	filtersShowTabLabels: boolean;
	/** Use compact Obsidian-native controls for header and dock actions */
	minimalStyle: boolean;
	/** Use colored badge icons instead of the default monotone badge style */
	coloredBadges: boolean;
	/** Render add-on enabled state as an Obsidian toggle or compact badge. */
	addonCellStyle: AddonCellStyle;
	/** Allow Vaultman explorers to consume icons configured by Iconic */
	iconicEnabled: boolean;
	/** File explorer node kinds that may render their icon cell */
	filesIconScope: FilesIconScope;
	/** Interaction required to cancel an operation badge */
	badgeCancelClickMode: BadgeCancelClickMode;
	/** Show the bottom dock; when false, Filters and Queue move into the Data tab menu. */
	showDock: boolean;
	/** Show the floating TOC rail (first-letter index) over the explorer tabs */
	floatingTocEnabled: boolean;
	/** Enable the Niagara scrub effects on the floating TOC (off = static) */
	floatingTocNiagara: boolean;
	/** Let the rail's control nodes (toggle/drill) join the Niagara scrub */
	floatingTocNiagaraNodes: boolean;
	/** Proto-style rail: bare glyphs with transparent control nodes (no boxes) */
	floatingTocPlainStyle: boolean;
	/** Rail edge: right (default) / left / top / bottom */
	tocPosition: 'right' | 'left' | 'top' | 'bottom';
	/** Reserve a lane between vertical explorer content and its scrollbar */
	tocReservedLane: boolean;
	/** Hide only the active explorer's scrollbar while its floating index is visible. */
	tocHideExplorerScrollbar: boolean;
	/** Glyph mode: first letter or full name */
	tocGlyphMode: 'letter' | 'name';
	/** Name cell visibility while scrubbing: off / selected / scrub / always */
	tocLabelMode: 'off' | 'selected' | 'scrub' | 'always';
	/** Name-cell reveal falloff range: selected / near / wide / all */
	tocReveal: 'selected' | 'near' | 'wide' | 'all';
	/** Radial glow that follows the active glyph while scrubbing */
	tocGlow: boolean;
	/** Vertical name-letter stack order: down / up / flat */
	tocNameOrder: 'down' | 'up' | 'flat';
	/** Wrap the scrub name cell in a frosted pill */
	tocNamePill: boolean;
	/** Smoothly scroll the explorer while scrubbing the floating TOC */
	tocSoftScroll: boolean;
	/** Anchor the rail body: the scrub bell stretches instead of sliding */
	tocStretch: boolean;
	/** BT5-025: shared glyph-color choice for the floating index. */
	tocGlyphColor: import('../logic/logicGlyphColor').GlyphColorChoice;
	/** BT5-025: persisted hex used when tocGlyphColor is 'custom'. */
	tocGlyphCustomColor: string;
	/** Apply the glyph color only while the rail is static, or always */
	tocGlyphColorMode: 'static' | 'always';
	/** BT5-025: shared glyph-color choice for the Explorer (default = opt-out). */
	explorerGlyphColor: import('../logic/logicGlyphColor').GlyphColorChoice;
	/** BT5-025: persisted hex used when explorerGlyphColor is 'custom'. */
	explorerGlyphCustomColor: string;
	/** BT5-025: which Explorer nodes the glyph color applies to. */
	explorerGlyphScope: import('../logic/logicGlyphColor').GlyphColorScope;
	/** Floating index drill also drives the sort scope (reset on index close) */
	tocDrillSyncsSort: boolean;
	/** Show By level options inline in the sort menu instead of a submenu */
	sortLevelInline: boolean;
	/** File paths hidden from the files explorer (D39 Exclude file) */
	excludedFilePaths: string[];
	/** Rainbow folder colors in the files tree (snippet-compatible, D38) */
	explorerRainbowFolders: boolean;
	/** BT5-042: collapsed folder shows one bubble dot or the descendants' badges */
	collapsedFolderBadges: 'dot' | 'badges';
	/** BT5-040: folders show the recursive sum of countable cells of their files */
	folderAggregateCells: boolean;
	/** Condense Files auto-reveal and expansion into one native Tools menu */
	toolbarToolsMenu: boolean;
	/** BT5-021: how the Files toolbar overflows: condensed menu or horizontal scroll */
	toolbarOverflowStrategy: import('../logic/logicResponsiveLayout').ToolbarOverflowStrategy;
	/** BT5-023: command Create File runs; '' or sentinel = Vaultman built-in */
	createFileCommand: string;
	/** BT5-024: ordered Obsidian command ids projected as toolbar action nodes */
	toolbarCommandActions: string[];
	/** BT5-022: where the built-in Create File/Folder actions live */
	createActionsPlacement: 'searchbox' | 'toolbar';
	/** Ordered fields shown in the native Files node hover tooltip */
	filesHoverInfo: FileHoverInfoId[];
	/** Independent display order for every available Files hover entry */
	filesHoverInfoOrder?: FileHoverInfoId[];
	/** Custom icons chosen in Vaultman for snippet/plugin nodes (BT5-019) */
	addonIconOverrides: AddonIconOverrides;
	/** Render cells in the order they were switched on instead of a fixed rank */
	orderCellsByActivation: boolean;
	/** BT5-015: put the node icon in the caret slot when nothing can expand */
	iconInCaretSlot: boolean;
	/** BT5-018: configured Files node context menu (order, visibility, dividers) */
	filesContextMenuLayout: FilesMenuItem[];
	/** BT5-036: configured layouts for the other node context menus, by kind. */
	contextMenuLayouts?: Partial<
		Record<
			import('../logic/logicFilesContextMenu').PanelMenuKind,
			FilesMenuItem[]
		>
	>;
	/** Show the explorer toolbar (tabs / view / sort / search header) */
	showToolbar: boolean;
	/** Named saved explorer layouts (view options + sorts per tab) */
	savedLayouts?: SavedLayout[];
	/** Run operations immediately instead of staging them in the queue */
	bypassOperations: boolean;
	/** Suppress the bulk target confirmation for reusable action presets */
	suppressBulkOperationWarning: boolean;
	/** Queue warning threshold for operations that target many files */
	bulkOperationWarningThreshold: number;
	/** Show the floating performance diagnostics monitor */
	performanceHudEnabled: boolean;
	/** Internal one-shot migration marker for the Iter.12 tab label default */
	filtersTabLabelsMigrated?: boolean;
	/** BT5: default View Compositions have been seeded once */
	viewCompositionsSeeded?: boolean;
	/** Property grid render mode */
	gridRenderMode?: 'plain' | 'chunk' | 'all';
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
}

/** Minimal interface used by VaultmanSettingsTab — breaks the main.ts circular import. */
export interface iVaultmanPlugin extends Plugin {
	settings: VaultmanSettings;
	saveSettings(): Promise<void>;
	onSettingsChange(listener: () => void): () => void;
	updateGlassBlur(): void;
	queueService?: {
		setBypassOperations(enabled: boolean): void;
	};
	iconicService?: {
		setEnabled(enabled: boolean): void;
	};
	/** BT5-018/036: the live action catalog each menu sub-page configures. */
	contextMenuService: {
		panelActionCatalog(
			kind?: import('../logic/logicFilesContextMenu').PanelMenuKind,
		): {
			id: string;
			label: string;
			icon?: string;
			native?: boolean;
			submenu?: boolean;
		}[];
	};
}

export const DEFAULT_SETTINGS: VaultmanSettings = {
	language: 'auto',
	defaultPropertyType: 'text',
	filterTemplates: [],
	queueTemplates: [],
	sessionFilePath: '',
	lastSeenUpdatesVersion: '',
	explorerCtrlClickSearch: true,
	explorerShowQueuePreview: true,
	explorerContentSearch: true,
	explorerSearchHighlights: false,
	explorerOperationScope: 'auto',
	operationsPanelPosition: 'right',
	basesLastUsedPath: '',
	basesOpenMode: 'last-used',
	basesOpsPanelSide: 'left',
	basesExplorerSide: 'right',
	basesAutoAttach: false,
	basesInjectCheckboxes: true,
	basesShowColumnSeparators: false,
	openMode: 'new_instance',
	timestampRelative: true,
	pageOrder: ['filters', 'statistics'],
	separatePanes: false,
	viewMode: 'list',
	// BT5-065: the default preset is the compact one, and it reads better
	// without tab labels. An existing vault is unaffected: the one-time label
	// migration keys off a saved value, not off this default.
	filtersShowTabLabels: false,
	minimalStyle: true,
	coloredBadges: false,
	addonCellStyle: 'native',
	iconicEnabled: true,
	filesIconScope: 'all',
	// BT5-065: cancelling a staged operation is reversible, so it does not need
	// the friction of a double click.
	badgeCancelClickMode: 'single',
	showDock: false,
	floatingTocEnabled: false,
	floatingTocNiagara: false,
	floatingTocNiagaraNodes: false,
	floatingTocPlainStyle: false,
	tocPosition: 'right',
	tocReservedLane: false,
	tocHideExplorerScrollbar: true,
	tocGlyphMode: 'letter',
	tocLabelMode: 'scrub',
	tocReveal: 'all',
	tocGlow: true,
	tocNameOrder: 'down',
	tocNamePill: false,
	tocSoftScroll: false,
	tocStretch: false,
	tocGlyphColor: 'default',
	tocGlyphCustomColor: '#7c3aed',
	tocGlyphColorMode: 'static',
	explorerGlyphColor: 'default',
	explorerGlyphCustomColor: '#7c3aed',
	explorerGlyphScope: 'folders',
	tocDrillSyncsSort: false,
	sortLevelInline: true,
	excludedFilePaths: [],
	explorerRainbowFolders: false,
	collapsedFolderBadges: 'dot',
	folderAggregateCells: false,
	toolbarToolsMenu: false,
	toolbarOverflowStrategy: 'condensed',
	createFileCommand: '',
	toolbarCommandActions: [],
	createActionsPlacement: 'searchbox',
	filesHoverInfo: [...DEFAULT_FILES_HOVER_INFO],
	addonIconOverrides: {},
	orderCellsByActivation: false,
	iconInCaretSlot: false,
	filesContextMenuLayout: [],
	showToolbar: true,
	bypassOperations: false,
	suppressBulkOperationWarning: false,
	bulkOperationWarningThreshold: 200,
	performanceHudEnabled: false,
	filtersTabLabelsMigrated: true,
	viewCompositionsSeeded: false,
	glassBlurIntensity: 60,
	contextMenuShowInFileMenu: true,
	contextMenuShowInEditorMenu: true,
	contextMenuShowInMoreOptions: true,
	contextMenuHideRules: [],
};
