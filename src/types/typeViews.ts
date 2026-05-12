import type { ActiveFilterEntry, NodeBase, QueueChange } from './typeContracts';

export const EXPLORER_VIEW_MODES = [
	'tree',
	'table',
	'grid',
	'cards',
	'markmap',
	'list',
	'svar',
] as const;

export type ExplorerViewMode = (typeof EXPLORER_VIEW_MODES)[number];

export function isExplorerViewMode(value: string): value is ExplorerViewMode {
	return (EXPLORER_VIEW_MODES as readonly string[]).includes(value);
}

export type ViewTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent';

export type ViewIconSource =
	| 'type'
	| 'iconic'
	| 'file'
	| 'folder'
	| 'tag'
	| 'operation'
	| 'filter'
	| 'state'
	| 'custom';

export interface ViewTextRange {
	start: number;
	end: number;
}

export interface ViewIconLayer {
	id: string;
	icon: string;
	source: ViewIconSource;
	priority?: number;
}

export interface ViewBadge {
	id: string;
	label?: string;
	icon?: string;
	tone?: ViewTone;
	solid?: boolean;
	inherited?: boolean;
	sourceId?: string;
	actionId?: string;
}

export interface ViewBadgeLayers {
	ops?: readonly ViewBadge[];
	filters?: readonly ViewBadge[];
	warnings?: readonly ViewBadge[];
	inherited?: readonly ViewBadge[];
	counts?: readonly ViewBadge[];
}

export interface ViewHighlightLayers {
	query?: readonly ViewTextRange[];
	filter?: readonly ViewTextRange[];
	warning?: readonly ViewTextRange[];
}

export interface ViewStateLayers {
	selected?: boolean;
	focused?: boolean;
	activeFilter?: boolean;
	searchMatch?: boolean;
	deleted?: boolean;
	pending?: boolean;
	disabled?: boolean;
	warning?: boolean;
	editing?: boolean;
	dropTarget?: boolean;
	dragging?: boolean;
}

export type ViewMarkKind =
	| 'order'
	| 'query'
	| 'filters'
	| 'specific_view'
	| 'queue_list_template'
	| 'column_set'
	| 'group_set'
	| 'pinned_item'
	| 'manual_sort'
	| 'template_membership';

export interface ViewMarkLayer {
	id: string;
	kind: ViewMarkKind;
	label?: string;
	icon?: string;
	source: 'user' | 'system' | 'template';
}

export interface ViewLayers {
	icons?: readonly ViewIconLayer[];
	badges?: ViewBadgeLayers;
	highlights?: ViewHighlightLayers;
	state?: ViewStateLayers;
	marks?: readonly ViewMarkLayer[];
}

export interface ViewAction<TRowNode extends NodeBase = NodeBase> {
	id: string;
	label: string;
	icon?: string;
	tone?: ViewTone;
	disabled?: boolean;
	run?: (row: ViewRow<TRowNode>) => unknown;
}

export interface ViewCell {
	id: string;
	columnId: string;
	value: unknown;
	display: string;
	type?: 'text' | 'number' | 'checkbox' | 'date' | 'tag' | 'file' | 'badge';
	editable?: boolean;
	layers?: ViewLayers;
}

export interface ViewColumn<TNode extends NodeBase = NodeBase> {
	id: string;
	label: string;
	icon?: string;
	width?: number;
	minWidth?: number;
	type?: string;
	sortable?: boolean;
	resizable?: boolean;
	editable?: boolean;
	getValue?: (node: TNode) => unknown;
}

export interface ViewRow<TNode extends NodeBase = NodeBase> {
	id: string;
	node: TNode;
	label: string;
	detail?: string;
	icon?: string;
	cls?: string;
	depth?: number;
	cells: readonly ViewCell[];
	layers: ViewLayers;
	actions: readonly ViewAction<TNode>[];
	disabled?: boolean;
}

export interface ViewGroup<TNode extends NodeBase = NodeBase> {
	id: string;
	label: string;
	rows: readonly ViewRow<TNode>[];
	layers?: ViewLayers;
	collapsed?: boolean;
}

export interface ViewSelectionState {
	ids: ReadonlySet<string>;
	anchorId?: string | null;
}

export interface ViewFocusState {
	id: string | null;
}

export interface ViewSortState {
	id: string;
	direction: 'asc' | 'desc';
}

export interface ViewSearchState {
	query: string;
}

export interface ViewVirtualState {
	rowHeight: number;
	overscan: number;
}

export interface ViewCapabilities {
	canSelect?: boolean;
	canMultiSelect?: boolean;
	canExpand?: boolean;
	canRename?: boolean;
	canDrag?: boolean;
	canDrop?: boolean;
	canEditCells?: boolean;
	canResizeColumns?: boolean;
	canReorderColumns?: boolean;
	canGroup?: boolean;
	canApplyMarks?: boolean;
}

export type ViewEmptyKind = 'loading' | 'empty' | 'search' | 'filters' | 'import';

export interface ViewEmptyState {
	kind?: ViewEmptyKind;
	label: string;
	detail?: string;
	icon?: string;
}

export interface ExplorerViewRevisions {
	filesRevision?: number;
	propsRevision?: number;
	tagsRevision?: number;
	contentRevision?: number;
	queueRevision?: number;
	filterRevision?: number;
}

export interface ExplorerViewInput<TNode extends NodeBase = NodeBase> {
	explorerId: string;
	mode: ExplorerViewMode;
	nodes: readonly TNode[];
	operations?: readonly QueueChange[];
	activeFilters?: readonly ActiveFilterEntry[];
	revisions?: ExplorerViewRevisions;
	columns?: readonly ViewColumn<TNode>[];
	groups?: readonly ViewGroup<TNode>[];
	actions?: readonly ViewAction<TNode>[];
	getLabel?: (node: TNode) => string;
	getDetail?: (node: TNode) => string | undefined;
	getActions?: (node: TNode) => readonly ViewAction<TNode>[];
	getDecorationContext?: (node: TNode) => unknown;
	search?: ViewSearchState;
	sort?: ViewSortState;
	capabilities?: ViewCapabilities;
}

export interface ExplorerRenderModel<TNode extends NodeBase = NodeBase> {
	explorerId: string;
	mode: ExplorerViewMode;
	rows: readonly ViewRow<TNode>[];
	columns: readonly ViewColumn<TNode>[];
	groups: readonly ViewGroup<TNode>[];
	selection: ViewSelectionState;
	focus: ViewFocusState;
	sort: ViewSortState;
	search: ViewSearchState;
	virtualization: ViewVirtualState;
	capabilities: ViewCapabilities;
	empty?: ViewEmptyState;
}

export interface IViewService {
	getModel<TNode extends NodeBase>(input: ExplorerViewInput<TNode>): ExplorerRenderModel<TNode>;
	setViewMode(explorerId: string, mode: ExplorerViewMode): void;
	getViewMode(explorerId: string): ExplorerViewMode;
	select(explorerId: string, id: string, mode?: 'replace' | 'toggle' | 'add'): void;
	clearSelection(explorerId: string): void;
	toggleExpanded(explorerId: string, id: string): void;
	setFocused(explorerId: string, id: string | null): void;
	subscribe(explorerId: string, cb: () => void): () => void;
}
