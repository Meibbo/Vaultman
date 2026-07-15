import type { Plugin } from 'obsidian';
import type { FilterTemplate } from './typeFilter';
import type { MenuHideRule } from './typeCMenu';
import type { QueueTemplate } from './typeOps';
import type { BadgeCancelClickMode } from '../utils/badgeInteraction';

export type Language = 'auto' | 'en' | 'es';

/** A saved per-tab explorer view config (view options + sort). */
export interface SavedViewConfig {
	viewMode: string;
	visibleCells: string[];
	sortState: {
		sortBy: string;
		direction: 'asc' | 'desc';
		childLevel: boolean;
		nodeTypeFilter: string | null;
	};
}

/** A named explorer layout: per-tab configs + a short human summary. */
export interface SavedLayout {
	name: string;
	summary: string;
	config: Record<string, SavedViewConfig>;
}

export interface VaultmanSettings {
	language: Language;
	defaultPropertyType: string;
	filterTemplates: FilterTemplate[];
	queueTemplates: QueueTemplate[];
	/** Path to the active session .md file (empty = no session) */
	sessionFilePath: string;
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
	openMode: 'sidebar' | 'main' | 'both';
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
	/** Hard (instant) jump instead of smooth scroll */
	tocHardJump: boolean;
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
}

export const DEFAULT_SETTINGS: VaultmanSettings = {
	language: 'auto',
	defaultPropertyType: 'text',
	filterTemplates: [],
	queueTemplates: [],
	sessionFilePath: '',
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
	openMode: 'sidebar',
	pageOrder: ['filters', 'statistics'],
	separatePanes: false,
	viewMode: 'list',
	filtersShowTabLabels: true,
	minimalStyle: true,
	coloredBadges: false,
	badgeCancelClickMode: 'double',
	showDock: false,
	floatingTocEnabled: false,
	floatingTocNiagara: false,
	floatingTocNiagaraNodes: false,
	floatingTocPlainStyle: false,
	tocPosition: 'right',
	tocGlyphMode: 'letter',
	tocLabelMode: 'scrub',
	tocReveal: 'all',
	tocGlow: true,
	tocNameOrder: 'down',
	tocNamePill: false,
	tocHardJump: false,
	showToolbar: true,
	bypassOperations: false,
	suppressBulkOperationWarning: false,
	bulkOperationWarningThreshold: 400,
	performanceHudEnabled: false,
	filtersTabLabelsMigrated: true,
	glassBlurIntensity: 60,
	contextMenuShowInFileMenu: true,
	contextMenuShowInEditorMenu: true,
	contextMenuShowInMoreOptions: true,
	contextMenuHideRules: [],
};
