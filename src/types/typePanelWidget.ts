import type { App } from 'obsidian';
import type { ResolvedCommandAction } from '../logic/logicCommandActions';
import type { InteractionMode } from '../logic/logicInteractionMode';
import type { ToolbarOverflowStrategy } from '../logic/logicResponsiveLayout';
import type { SavedLayout } from './typeSettings';
import type { ExplorerSortState, ExplorerTabId } from './typeUI';

export type PanelWidgetNodeKind = 'action' | 'data' | 'container';
export type PanelWidgetCellKind =
	| 'action'
	| 'content'
	| 'metadata'
	| 'provided'
	| 'deco';

export interface PanelWidgetActionReference {
	id: string;
	payload?: Readonly<Record<string, unknown>>;
}

export interface PanelWidgetNode {
	id: string;
	nodeKind: PanelWidgetNodeKind;
	cellKind: PanelWidgetCellKind;
	presentation: 'button' | 'menu' | 'toggle' | 'tabs' | 'search';
	label: string;
	icon: string;
	order: number;
	available: boolean;
	condensable?: boolean;
	action?: PanelWidgetActionReference;
	checked?: boolean;
}

export interface PanelWidgetPvpuiConfig {
	nodeOrder?: readonly string[];
	hiddenNodeIds?: readonly string[];
}

export interface PanelWidgetProjection {
	hostId: string;
	providerId: string;
	nodes: readonly PanelWidgetNode[];
}

export interface PanelWidgetActionInvocation {
	actionId: string;
	origin: 'pointer' | 'keyboard' | 'menu' | 'programmatic';
	payload?: Readonly<Record<string, unknown>>;
}

export interface ScenePanelWidgetActionPort {
	invoke(invocation: PanelWidgetActionInvocation): Promise<boolean>;
}

export interface PanelWidgetExplorerProjectionConfig {
	sortState: ExplorerSortState;
	visibleCells: ReadonlySet<string>;
	viewMode: 'tree' | 'grid' | 'table';
	interactionMode?: InteractionMode;
}

export interface PanelWidgetExplorerPort {
	setSortState(state: ExplorerSortState): void;
	setVisibleCells(cells: Set<string>): void;
	setViewMode(mode: 'tree' | 'grid' | 'table'): void;
	setInteractionMode?(mode: InteractionMode): void;
	setInteractionModeChangeHandler?(
		handler?: (mode: InteractionMode) => void,
	): void;
	configurePanelWidgetProjection?(
		config: PanelWidgetExplorerProjectionConfig,
	): void;
}

export interface PanelWidgetExpandableExplorerPort extends PanelWidgetExplorerPort {
	expandAll(): void;
	collapseAll(): void;
	hasExpandedNodes(): boolean;
	setExpansionChangeHandler(handler?: () => void): void;
}

export interface PanelWidgetFilesExplorerPort extends PanelWidgetExpandableExplorerPort {
	autoRevealActiveFile(): void;
	createFromSearch(category: number, term: string): void | Promise<void>;
	getFileTypeOptions(): Array<{ id: string; icon: string; label: string }>;
	hasSortNode(id: string): boolean;
	scopeRootForNode(id: string): string | null;
	sortNodeLabel(id: string): string | null;
	setInteractionMode(mode: InteractionMode): void;
	setSortStateChangeHandler(handler?: (state: ExplorerSortState) => void): void;
}

export interface PanelWidgetTreeExplorerPort extends PanelWidgetExpandableExplorerPort {
	createFromSearch(term: string, category?: number): void | Promise<void>;
	hasSortNode?(id: string): boolean;
	scopeRootForNode(id: string): string | null;
	sortNodeLabel?(id: string): string | null;
	setInteractionMode(
		mode: InteractionMode,
		onContentSearch?: (query: string) => void,
	): void;
	setSortStateChangeHandler?(
		handler?: (state: ExplorerSortState) => void,
	): void;
}

export interface PanelWidgetHeaderTabOption {
	id: string;
	label: string;
	icon: string;
}

export interface PanelWidgetHeaderMenuAction {
	id: 'filters' | 'queue' | 'statistics';
	label: string;
	icon: string;
	count?: number;
	warning?: boolean;
	tooltip?: string;
	onClick: () => void;
	onDoubleClick?: () => void;
}

export interface PanelWidgetHeaderAction {
	id: string;
	label: string;
	icon: string;
	disabled?: boolean;
	onClick: (event: MouseEvent) => void;
	order?: number;
	/**
	 * Held state for actions that toggle something. Rendered with the same
	 * decoration the search node wears while its box is open. Left undefined by
	 * actions that simply fire, so they carry no pressed state at all.
	 */
	checked?: boolean;
}

export type PanelWidgetSearchCategoryState = Record<
	'files' | 'props' | 'tags',
	number
> &
	Partial<Record<Exclude<ExplorerTabId, 'files' | 'props' | 'tags'>, number>>;

/**
 * Scene-local PSS output consumed by the stable Navbar panelWidget host.
 *
 * This is deliberately a value/port contract: provider pages publish state,
 * but never mount a renderer or register globally.
 */
export interface NavbarPanelWidgetState {
	providerId: string;
	actionPort: ScenePanelWidgetActionPort;
	activeTab: ExplorerTabId;
	filtersSearch: string;
	filtersSearchCategory: PanelWidgetSearchCategoryState;
	searchExpanded?: boolean;
	onSearchExpandedChange?: (expanded: boolean) => void;
	/**
	 * Trailing controls rendered inside the searchbox. An operation mode that
	 * needs its own switches publishes them here rather than adding a bar.
	 */
	searchTrailingActions?: readonly PanelWidgetNode[];
	onSearchTrailingAction?: (node: PanelWidgetNode) => void;
	tagsExplorer?: PanelWidgetTreeExplorerPort | null;
	propExplorer?: PanelWidgetTreeExplorerPort;
	fileList?: PanelWidgetFilesExplorerPort;
	snippetsExplorer?: PanelWidgetExplorerPort;
	pluginsExplorer?: PanelWidgetExplorerPort;
	icon: (node: HTMLElement, name: string) => { update(name: string): void };
	addOpCount?: number;
	minimalStyle?: boolean;
	showDock?: boolean;
	tabOptions?: PanelWidgetHeaderTabOption[];
	tabMenuActions?: PanelWidgetHeaderMenuAction[];
	headerActions?: PanelWidgetHeaderAction[];
	activeSectionTab?: string;
	onSectionTabChange?: (tab: string) => void;
	onFiltersSearchChange?: (value: string) => void;
	onFiltersSearchCategoryChange?: (
		value: PanelWidgetSearchCategoryState,
	) => void;
	onViewFiltersChanged?: () => void;
	onContentSearch?: (query: string) => void;
	showExplorerControls?: boolean;
	expansionRevision?: number;
	floatingTocEnabled?: boolean;
	onToggleFloatingToc?: () => void;
	toolbarToolsMenu?: boolean;
	toolbarOverflowStrategy?: ToolbarOverflowStrategy;
	frameWidth?: number;
	onToggleToolbar?: () => void;
	toolbarShown?: boolean;
	savedLayouts?: SavedLayout[];
	onSaveLayout?: (layout: SavedLayout) => void;
	onLayoutLoaded?: (layout: SavedLayout) => void;
	app?: App;
	showTabLabels?: boolean;
	sortLevelInline?: boolean;
	orderCellsByActivation?: boolean;
	commandActions?: ResolvedCommandAction[];
	onRunCommand?: (id: string) => void;
	createActionsPlacement?: 'searchbox' | 'toolbar';
	pvpuiConfig?: PanelWidgetPvpuiConfig;
}

/**
 * U121-003: the panelWidget's owner token. `providerId`, `generation` and
 * `projection` commit together as one immutable envelope, so a provider that
 * finished async work after the Scene moved on cannot publish over the provider
 * that owns the toolbar now. Two Vaultman instances carry different
 * `sceneInstanceId` values and cannot address each other's host.
 */
export interface ScenePanelWidgetEnvelope {
	sceneInstanceId: string;
	providerId: string;
	generation: number;
	projection: NavbarPanelWidgetState;
}

export type ScenePanelWidgetPublication = ScenePanelWidgetEnvelope;
