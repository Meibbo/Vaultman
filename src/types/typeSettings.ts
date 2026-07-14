import type { Plugin } from 'obsidian';
import type { FilterTemplate } from './typeFilter';
import type { MenuHideRule } from './typeCMenu';
import type { QueueTemplate } from './typeOps';
import type { BadgeCancelClickMode } from '../utils/badgeInteraction';

export type Language = 'auto' | 'en' | 'es';

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
