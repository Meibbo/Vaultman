import type { App } from 'obsidian';
import type { ResolvedCommandAction } from '../logic/logicCommandActions';
import type { InteractionMode } from '../logic/logicInteractionMode';
import type { ToolbarOverflowStrategy } from '../logic/logicResponsiveLayout';
import type { SavedLayout } from './typeSettings';
import type { ExplorerSortState, ExplorerTabId } from './typeUI';
import type { GroupPreset } from './typeGroupPreset';
import type { SasiRegistry } from '../logic/logicSasiRegistry';
import type { SasiHandler } from '../logic/logicSasiInvoke';
import type { TransactionBarState } from '../logic/logicTransactionBarState';


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
	/** Spec 08 §2: view_options del engine `tree`, per_instance. */
	stickyRows?: boolean;
	/** Spec 08 §2: view_option del engine `tree`, per_instance, solo Files. */
	compactFolders?: boolean;
	/** Spec 08 §3.2: group preset seleccionado, per_instance. */
	groupPreset?: GroupPreset;
}

export interface PanelWidgetExplorerPort {
	setSortState(state: ExplorerSortState): void;
	setVisibleCells(cells: Set<string>): void;
	setViewMode(mode: 'tree' | 'grid' | 'table'): void;
	setInteractionMode?(mode: InteractionMode): void;
	setInteractionModeChangeHandler?(
		handler?: (mode: InteractionMode) => void,
	): void;
	setStickyRowsEnabled?(enabled: boolean): void;
	setCompactFoldersEnabled?(enabled: boolean): void;
	/** Spec 08 §3.2: the grouping switch, per instance. */
	setGroupPreset?(preset: GroupPreset): void;
	/** Spec 08 §3.3: receives the selection's membership URNs to create a custom group. */
	setCreateGroupHandler?(handler?: (urns: readonly string[]) => void): void;
	configurePanelWidgetProjection?(
		config: PanelWidgetExplorerProjectionConfig,
	): void;
	/**
	 * U130-05: per-instance layout activation. Sets the layout name the
	 * explorer resolves in projectedNodes to pick up groupMemberships from
	 * the saved layout, making custom group headers reachable.
	 */
	setActiveLayoutName?(name: string | null): void;
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
	/**
	 * Toolbar reveal-faint oracle: is this file path inside the scene's
	 * current list (the filtered set when the scene narrows, the vault
	 * otherwise)? Absent means listed, so explorers without a narrowing
	 * scene never faint.
	 */
	isPathListed?(path: string): boolean;
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
	/**
	 * Toolbar reveal-faint oracle: is this file path inside the scene's
	 * current list (the filtered set when the scene narrows, the vault
	 * otherwise)? Absent means listed, so explorers without a narrowing
	 * scene never faint.
	 */
	isPathListed?(path: string): boolean;
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
	 * Whether the active provider is projecting a single anchored note rather
	 * than the vault-wide set. The sort menu reads it to offer the options that
	 * only mean something against one note's own order.
	 */
	revealActive?: boolean;
	/**
	 * Workspace active file path, refreshed on file-open. Toolbar decorations
	 * that depend on where the focus is (e.g. the reveal-node faint) read it
	 * instead of subscribing a second watcher.
	 */
	activeFilePath?: string | null;
	/**
	 * U130-05b: el estado del move mode que el searchbox proyecta como celdas.
	 * Sigue siendo el decorador del searchbox, no un segundo bar: lo que cambia
	 * es que el host construye la CARA (`logicSearchCellProjection`) y SASI
	 * guarda la identidad, en vez de viajar nodos ya pintados.
	 */
	searchMoveToggles?: {
		write: 'append' | 'replace';
		originDisposition: 'move' | 'copy';
	} | null;
	/**
	 * El registro con el que el host del searchbox arma su invoker. El invoker
	 * es POR SUPERFICIE --congela su mapa de handlers-- pero el registro es uno
	 * solo, del plugin.
	 */
	sasiRegistry?: SasiRegistry;
	/** Los handlers del move mode del explorer activo, para ese invoker. */
	sasiMoveHandlers?: Record<string, SasiHandler>;
	/**
	 * U130-04: el Bar secundario, hermano del Toolbar, que el host proyecta
	 * mientras hay una transaccion de movimiento. Telemetria mas UN control: el
	 * toggle de tipo de movimiento. `Proceed` y `Cancel` NO viven aqui.
	 */
	transactionBar?: TransactionBarState & {
		// Composed state: visibility, placement, moveKind, originCount
		onToggleMoveKind?: (next: 'node' | 'group') => void;
	};
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
	/**
	 * U130-06: el usuario eligio un modo de interaccion y quiere que sea su
	 * defecto. El componente NO escribe settings: las publica, y quien posee el
	 * plugin decide. Es el mismo contrato que onSaveLayout.
	 */
	onPersistInteractionMode?: (tab: ExplorerTabId, mode: InteractionMode) => void;
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
	/** U130-05 global activation; the navbar's per-instance load overrides it. */
	activeLayoutName?: string | null;
	/** Spec 08 §3.2.2/§3.3: custom groups are `SavedLayout.groupMemberships`. */
	onGroupMembershipsChange?: (
		layoutName: string,
		memberships: Record<string, readonly string[]>,
	) => void;
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
