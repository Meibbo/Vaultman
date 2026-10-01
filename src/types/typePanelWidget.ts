import type { App } from 'obsidian';
import type { ResolvedCommandAction } from '../logic/logicCommandActions';
import type { InteractionMode } from '../logic/logicInteractionMode';
import type { ToolbarOverflowStrategy } from '../logic/logicResponsiveLayout';
import type { SavedLayout } from './typeSettings';
import type { ExplorerSortState, ExplorerTabId, ScopeTarget } from './typeUI';
import type { GroupPreset } from './typeGroupPreset';
import type { CounterRange } from './typeGroupPreset';
import type { MaterializePresetHandler } from '../logic/logicGroupPresets';
import type { SasiRegistry } from '../logic/logicSasiRegistry';
import type { SasiHandler } from '../logic/logicSasiInvoke';
import type {
	CreateGroupHandler,
	DegroupSelectedHandler,
} from '../logic/logicGroupSelectionTransaction';
import type { TransactionBarState } from '../logic/logicTransactionBarState';
import type { FilesMenuItem } from '../logic/logicFilesContextMenu';
import type { ToolbarMenuKind } from '../logic/logicToolbarMenuCatalog';
import type { GroupHideHandler, GroupDeleteHandler } from './typeCMenu';


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
	origin: 'pointer' | 'keyboard' | 'menu' | 'programmatic' | 'command';
	payload?: Readonly<Record<string, unknown>>;
}

export interface ScenePanelWidgetActionPort {
	invoke(invocation: PanelWidgetActionInvocation): Promise<boolean>;
}

export interface PanelWidgetExplorerProjectionConfig {
	sortState: ExplorerSortState;
	visibleCells: ReadonlySet<string>;
	/** Effective presentation for Tasks in this instance. */
	taskCellDisplayMode?: import('../logic/logicTaskMetric').TaskCellDisplayMode | 'auto';
	viewMode: 'tree' | 'grid' | 'table';
	interactionMode?: InteractionMode;
	/** Spec 08 §2: view_options del engine `tree`, per_instance. */
	stickyRows?: boolean;
	/** Spec 08 §2: view_option del engine `tree`, per_instance, solo Files. */
	compactFolders?: boolean;
	/**
	 * Spec 08: view_option del engine `tree`, per_instance. Colapsa el padding
	 * de fila a 4px e ignora la sangría por profundidad; el caret de un p-node
	 * se conserva, solo deja de desplazarse por `--depth`.
	 */
	indent?: boolean;
	/** U130 polishing: view_option `tooltips`, per_instance. `false` apaga
	 * los tooltips de nodos y cells del explorer. */
	tooltips?: boolean;
	/** Spec 08 §3.2: group preset seleccionado, per_instance. */
	groupPreset?: GroupPreset;
	/** Spec 08 §4: custom groups ocultos en esta instancia. */
	hiddenGroupIds?: readonly string[];
	/**
	 * U130-09: custom groups de esta scene de esta instancia
	 * (`SceneConfig.groupMemberships`). El explorer ya no busca un layout por
	 * nombre: recibe el mapa de su scene como recibe `hiddenGroupIds`.
	 */
	groupMemberships?: Readonly<Record<string, readonly string[]>>;
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
	setIndentEnabled?(enabled: boolean): void;
	/** Owner-local hover outline while choosing a parent or level scope. */
	setScopePickMode?(mode: 'parent' | 'level' | null): void;
	/** Optional scope-tree capabilities; flat explorers may omit them. */
	scopeParentForNode?(id: string): string | null;
	hasScopeParentNodes?(): boolean;
	scopeLevelForNode?(id: string): number | string | null;
	sortNodeLabel?(id: string): string | null;
	/** U130 polishing: apaga los tooltips de nodos y cells del explorer. */
	setTooltipsEnabled?(enabled: boolean): void;
	/** Spec 08 §3.2: the grouping switch, per instance. */
	setGroupPreset?(preset: GroupPreset): void;
	/** Spec 08 §4: custom groups hidden (not deleted) in this instance. */
	setHiddenGroupIds?(ids: readonly string[]): void;
	/**
	 * U130-09: the custom groups of this scene, groupId -> member URNs. The
	 * U130-05 per-instance layout activation setter is gone with it: the
	 * explorer projects what the scene holds, and a layout only copies its
	 * photo into the scene.
	 */
	setGroupMemberships?(
		memberships: Readonly<Record<string, readonly string[]>>,
	): void;
	/**
	 * Spec 08 §3.3 + U130 transacción: recibe el snapshot inmutable de la
	 * selección y devuelve el resultado discriminado. Solo `committed`
	 * limpia el axón (lo hace el explorer, nunca el navbar).
	 */
	setCreateGroupHandler?(handler?: CreateGroupHandler): void;
	/**
	 * U130 Degroup selected: el explorer captura snapshot + owner invocado;
	 * el navbar persiste (custom) o escribe la nota (note). Preset sin handler.
	 */
	setDegroupSelectedHandler?(handler?: DegroupSelectedHandler): void;
	/** Persist one visible preset bucket as a custom group. */
	setMaterializePresetHandler?(handler?: MaterializePresetHandler): void;
	/** Scene-owned visibility mutation for preset and custom group headers. */
	setGroupHideHandler?(handler?: GroupHideHandler): void;
	/** Scene-owned deletion mutation for custom group headers. */
	setGroupDeleteHandler?(handler?: GroupDeleteHandler): void;
	/** Persist the complete explicit range set after one header edit. */
	setCounterRangesChangeHandler?(
		handler?: (ranges: readonly CounterRange[], target: ScopeTarget) => void,
	): void;
	/** Add one counter bucket inside the current fetched min/max domain. */
	createCounterRangeSlice?(): boolean;
	/** Identidad de scene/instancia para la guarda de reconciliación. */
	setSelectionScope?(scope: { instanceId: string | null; revision: number | null; scene: string }): void;
	configurePanelWidgetProjection?(
		config: PanelWidgetExplorerProjectionConfig,
	): void;
	setScopePickMode?(mode: 'parent' | 'level' | null): void;
	previewScopePick?(nodeId: string): void;
}

export interface PanelWidgetExpandableExplorerPort extends PanelWidgetExplorerPort {
	expandAll(): void;
	collapseAll(): void;
	hasExpandedNodes(): boolean;
	setExpansionChangeHandler(handler?: () => void): void;
}

export interface PanelWidgetFilesExplorerPort extends PanelWidgetExpandableExplorerPort {
	autoRevealActiveFile(): void;
	/** U130 view menu alt-cmenu: live update of task metric display mode */
	setTaskCellDisplayMode?(mode: import('../logic/logicTaskMetric').TaskCellDisplayMode | 'auto'): void;
	/** U130 toolbar alt-cmenu: override per-instance del "always reveal"
	 * (`undefined` = setting global). Lo empuja el navbar. */
	setAutoRevealOverride?(value: boolean | undefined): void;
	createFromSearch(category: number, term: string): void | Promise<void>;
	getFileTypeOptions(): Array<{ id: string; icon: string; label: string }>;
	hasSortNode(id: string): boolean;
	scopeRootForNode(id: string): string | null;
	/** Scope pick: a p-node owns itself; a leaf resolves to its parent. */
	scopeParentForNode(id: string): string | null;
	/** True when the current projected tree contains a selectable p-node. */
	hasScopeParentNodes?(): boolean;
	/** Spec 08 §3.1: the row's 1-based level, for "Select a level". */
	scopeLevelForNode?(id: string): number | string | null;
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
	/** Scope pick: a p-node owns itself; a leaf resolves to its parent. */
	scopeParentForNode(id: string): string | null;
	/** True when the current projected tree contains a selectable p-node. */
	hasScopeParentNodes?(): boolean;
	/** Spec 08 §3.1: the row's 1-based level, for "Select a level". */
	scopeLevelForNode?(id: string): number | string | null;
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
	toolbarDirectionalDropMarker?: boolean;
	toolbarOverflowStrategy?: ToolbarOverflowStrategy;
	frameWidth?: number;
	onToggleToolbar?: () => void;
	toolbarShown?: boolean;
	/** U130 toolbar alt-cmenu: global `autoRevealActiveFile` para pintar el
	 * toggle per-instance (el override vive en SceneConfig.autoReveal). */
	autoRevealGlobal?: boolean;
	taskCellDisplayGlobal?: import('../logic/logicTaskMetric').TaskCellDisplayMode;
	savedLayouts?: SavedLayout[];
	onSaveLayout?: (layout: SavedLayout) => void;
	onLayoutLoaded?: (layout: SavedLayout) => void;
	app?: App;
	showTabLabels?: boolean;
	orderCellsByActivation?: boolean;
	/** U121-108: edge of the select-mode checkbox; `hidden` hides its view_option. */
	selectionCheckboxPosition?: 'start' | 'end' | 'hidden';
	/** U130-110: global layouts for the catalog-backed native toolbar menus. */
	toolbarMenuLayouts?: Partial<Record<ToolbarMenuKind, FilesMenuItem[]>>;
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
