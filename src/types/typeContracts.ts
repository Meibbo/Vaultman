import type { TFile } from 'obsidian';
import type { BasesImportTarget } from './typeBasesInterop';
import type { FilterGroup, FilterNode, FilterRule } from './typeFilter';
import type { PendingChange, OperationResult } from './typeOps';
import type { IViewService } from './typeViews';

// ─────────────────────────────────────────────────────────
// Indexing primitives
// ─────────────────────────────────────────────────────────

/** A node carries an id (stable), an optional parent path, and arbitrary payload typed by the index. */
export interface NodeBase {
	id: string;
}

export interface FileNode extends NodeBase {
	path: string;
	basename: string;
	file: TFile;
}

export interface TagNode extends NodeBase {
	tag: string; // e.g. "#project/active"
	count: number;
	parent?: string; // for nesting
}

export interface PropNode extends NodeBase {
	property: string;
	values: string[];
	valueFrequencies: Record<string, number>;
	fileCount: number;
}

export interface ContentMatch extends NodeBase {
	filePath: string;
	line: number;
	before: string;
	match: string;
	after: string;
}

export interface ContentSearchStatus {
	query: string;
	phase: 'idle' | 'scanning' | 'done';
	scanned: number;
	total: number;
	resultCount: number;
}

export interface QueueChange extends NodeBase {
	change: PendingChange;
	group: string; // e.g. operation type
}

export interface ActiveFilterRuleEntry extends NodeBase {
	kind: 'rule';
	rule: FilterRule;
	parent?: FilterGroup;
	depth?: number;
	source?: 'tree' | 'search';
}

export interface ActiveFilterGroupEntry extends NodeBase {
	kind: 'group';
	group: FilterGroup;
	parent?: FilterGroup;
	depth?: number;
	source?: 'tree' | 'search';
}

export type ActiveFilterEntry = ActiveFilterRuleEntry | ActiveFilterGroupEntry;

export interface SnippetNode extends NodeBase {
	name: string;
	enabled: boolean;
}

export interface PluginNode extends NodeBase {
	pluginId: string;
	name: string;
	enabled: boolean;
	loaded: boolean;
	version?: string;
	author?: string;
	description?: string;
	isDesktopOnly?: boolean;
}

export interface TemplateNode extends NodeBase {
	name: string;
	path: string;
}

export interface BasesImportTargetNode extends NodeBase {
	path: string;
	label: string;
	file: TFile;
	targets: BasesImportTarget[];
}

// ─────────────────────────────────────────────────────────
// INodeIndex — generic index contract
// ─────────────────────────────────────────────────────────

export interface INodeIndex<TNode extends NodeBase> {
	/** Reactive list of nodes (rune-backed in svelte.ts impls; readonly array elsewhere). */
	readonly nodes: readonly TNode[];
	/** Monotonic publish revision; changes only when this index publishes a new snapshot. */
	readonly revision: number;
	/** Re-scan source of truth and rebuild `nodes`. */
	refresh(): void | Promise<void>;
	/** Subscribe to changes; returns unsubscribe fn. */
	subscribe(cb: () => void): () => void;
	/** Look up by id — O(1). */
	byId(id: string): TNode | undefined;
}

export type IFilesIndex = INodeIndex<FileNode>;
export type ITagsIndex = INodeIndex<TagNode>;
export type IPropsIndex = INodeIndex<PropNode>;
export type IContentIndex = INodeIndex<ContentMatch> & {
	readonly status: ContentSearchStatus;
	setQuery(query: string): void;
};
export type IOperationsIndex = INodeIndex<QueueChange>;
export type IActiveFiltersIndex = INodeIndex<ActiveFilterEntry>;
export type ICSSSnippetsIndex = INodeIndex<SnippetNode>;
export type ICommunityPluginsIndex = INodeIndex<PluginNode>;
export type ITemplatesIndex = INodeIndex<TemplateNode>;
export type IBasesImportTargetsIndex = INodeIndex<BasesImportTargetNode>;

// ─────────────────────────────────────────────────────────
// Services
// ─────────────────────────────────────────────────────────

export interface IFilterService {
	readonly activeFilter: FilterGroup;
	readonly filteredFiles: readonly TFile[];
	readonly selectedFiles: readonly TFile[];
	setFilter(filter: FilterGroup): void;
	clearFilters(): void;
	addNode(node: FilterNode, parent?: FilterGroup): void;
	removeNode(node: FilterNode, parent?: FilterGroup): void;
	removeNodeByProperty(prop: string, value?: string): void;
	setSearchFilter?(name: string, folder: string): void;
	getSearchFilters?(): { name: string; folder: string };
	getSearchFilterRules?(): FilterRule[];
	clearSearchFilter?(kind?: 'name' | 'folder' | 'all'): void;
	setSelectedFiles(files: TFile[]): void;
	setSelectedFileFilter?(files: TFile[]): void;
	subscribe(cb: () => void): () => void;
}

export interface IOperationQueue {
	readonly pending: readonly PendingChange[];
	readonly size: number;
	add(change: PendingChange): void;
	remove(id: string): void;
	clear(): void;
	execute(): Promise<OperationResult>;
	subscribe(cb: () => void): () => void;
}

export interface ISessionFile {
	read(): Promise<string>;
	write(content: string): Promise<void>;
	exists(): boolean;
}

export interface DecorationOutput {
	/** Inline icons next to a node (lucide names). */
	icons: string[];
	/** Badges (label + accent token, NOT --red/--blue). */
	badges: { label: string; accent?: string }[];
	/** Inline highlight ranges within node label. */
	highlights: { start: number; end: number }[];
	/** Optional snippet preview (e.g. content match excerpt). */
	snippet?: string;
}

export interface IDecorationManager {
	decorate<TNode extends NodeBase>(node: TNode, context?: unknown): DecorationOutput;
	subscribe(cb: () => void): () => void;
}

export interface IRouter {
	readonly activePage: string;
	readonly pageOrder: readonly string[];
	readonly activeTab: string;
	readonly tabOrder: readonly string[];
	navigateToPage(id: string): void;
	navigateToTab(id: string): void;
	reorderPage(fromIdx: number, toIdx: number): void;
	reorderTab(fromIdx: number, toIdx: number): void;
}

export interface OverlayEntry {
	id: string;
	/** Component to render (Svelte 5 component reference). */
	component: unknown;
	/** Props passed to the component. */
	props?: Record<string, unknown>;
	/** Click outside dismisses by default unless false. */
	dismissOnOutsideClick?: boolean;
}

export interface IOverlayState {
	readonly stack: readonly OverlayEntry[];
	push(entry: OverlayEntry): void;
	pop(): void;
	popById(id: string): void;
	clear(): void;
	isOpen(id: string): boolean;
}

export type { IViewService };

/** Explorer: index + UI state (selection, expansion, scroll, search). */
export interface IExplorer<TNode extends NodeBase> {
	readonly selectedIds: ReadonlySet<string>;
	readonly expandedIds: ReadonlySet<string>;
	readonly search: string;
	readonly filteredNodes: readonly TNode[];
	toggleSelect(id: string): void;
	toggleExpand(id: string): void;
	setSearch(q: string): void;
	clearSelection(): void;
	subscribe(cb: () => void): () => void;
}
