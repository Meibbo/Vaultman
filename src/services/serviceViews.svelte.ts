import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import type {
	ActiveFilterEntry,
	DecorationOutput,
	IDecorationManager,
	NodeBase,
	QueueChange,
} from '../types/typeContracts';
import type { FilterRule, FilterType } from '../types/typeFilter';
import type { PendingChange } from '../types/typeOps';
import type {
	ExplorerRenderModel,
	ExplorerViewInput,
	ExplorerViewMode,
	ExplorerViewRevisions,
	IViewService,
	ViewBadge,
	ViewBadgeLayers,
	ViewIconLayer,
	ViewIconSource,
	ViewLayers,
	ViewTextRange,
	ViewRow,
	ViewTone,
} from '../types/typeViews';
import { getActivePerfProbe } from '../dev/perfProbe';
import { withViewStateClasses } from '../utils/utilViewLayers';

interface ViewServiceOptions {
	decorationManager?: IDecorationManager;
	defaultMode?: ExplorerViewMode;
	showMatchedFilterDecorations?: () => boolean;
}

const EXPLORER_REVISION_FIELDS = [
	'filesRevision',
	'propsRevision',
	'tagsRevision',
	'contentRevision',
	'queueRevision',
	'filterRevision',
] as const satisfies readonly (keyof ExplorerViewRevisions)[];

const MAX_SEMANTIC_LAYER_CACHE_ENTRIES = 5000;

interface SemanticContext {
	kind?: string;
	propName?: string;
	property?: string;
	value?: string;
	rawValue?: string;
	isValueNode?: boolean;
	tag?: string;
	tagPath?: string;
	path?: string;
	filePath?: string;
	basename?: string;
	folderPath?: string;
	isFolder?: boolean;
	file?: {
		path?: string;
		basename?: string;
		name?: string;
	};
}

interface SemanticTarget {
	kind?: string;
	property?: string;
	value?: string;
	isValueNode?: boolean;
	tag?: string;
	filePath?: string;
	basename?: string;
	folderPath?: string;
	isFolder?: boolean;
}

export class ViewService implements IViewService {
	private readonly decorationManager?: IDecorationManager;
	private readonly defaultMode: ExplorerViewMode;
	private readonly showMatchedFilterDecorations: () => boolean;
	private decorationRevision = 0;

	// Svelte 5 Native Reactivity
	private readonly modes = new SvelteMap<string, ExplorerViewMode>();
	private readonly selections = new SvelteMap<string, SvelteSet<string>>();
	private readonly expanded = new SvelteMap<string, SvelteSet<string>>();
	private readonly focused = new SvelteMap<string, string | null>();
	private readonly subscribers = new Map<string, Set<() => void>>();

	// Cached indices to avoid O(N * (M+K)) during tree decoration
	private lastOps: readonly QueueChange[] | undefined;
	private lastFilters: readonly ActiveFilterEntry[] | undefined;
	private cachedOpIndex: ReturnType<ViewService['indexOperations']> | undefined;
	private cachedFilterIndex: ReturnType<ViewService['indexActiveFilters']> | undefined;
	private readonly semanticLayerCache = new Map<string, ViewLayers>();

	constructor(options: ViewServiceOptions = {}) {
		this.decorationManager = options.decorationManager;
		this.defaultMode = options.defaultMode ?? 'tree';
		this.showMatchedFilterDecorations = options.showMatchedFilterDecorations ?? (() => false);
		this.decorationManager?.subscribe(() => {
			this.decorationRevision += 1;
			this.semanticLayerCache.clear();
			this.notifyAll();
		});
	}

	getModel<TNode extends NodeBase>(input: ExplorerViewInput<TNode>): ExplorerRenderModel<TNode> {
		return (
			getActivePerfProbe()?.measure('viewService.getModel', { nodes: input.nodes.length }, () =>
				this.buildModel(input),
			) ?? this.buildModel(input)
		);
	}

	private buildModel<TNode extends NodeBase>(
		input: ExplorerViewInput<TNode>,
	): ExplorerRenderModel<TNode> {
		const selected = this.selectionFor(input.explorerId);
		const opIndex = this.getOpIndex(input.operations);
		const filterIndex = this.getFilterIndex(input.activeFilters);
		const showMatchedFilterDecorations = this.showMatchedFilterDecorations();

		const rows = input.nodes.map((node) =>
			this.toRow(input, node, selected, opIndex, filterIndex, showMatchedFilterDecorations),
		);

		return {
			explorerId: input.explorerId,
			mode: input.mode,
			rows,
			columns: input.columns ?? [],
			groups: input.groups ?? [],
			selection: { ids: new Set(selected) },
			focus: { id: this.focused.get(input.explorerId) ?? null },
			sort: input.sort ?? { id: 'manual', direction: 'asc' },
			search: input.search ?? { query: '' },
			virtualization: { rowHeight: 32, overscan: 5 },
			capabilities: input.capabilities ?? {},
			empty: rows.length === 0 ? { label: 'No items' } : undefined,
		};
	}

	private getOpIndex(operations: readonly QueueChange[] | undefined) {
		if (this.lastOps === operations && this.cachedOpIndex) return this.cachedOpIndex;
		this.lastOps = operations;
		this.cachedOpIndex = this.indexOperations(operations);
		return this.cachedOpIndex;
	}

	private getFilterIndex(filters: readonly ActiveFilterEntry[] | undefined) {
		if (this.lastFilters === filters && this.cachedFilterIndex) return this.cachedFilterIndex;
		this.lastFilters = filters;
		this.cachedFilterIndex = this.indexActiveFilters(filters);
		return this.cachedFilterIndex;
	}

	private indexOperations(operations: readonly QueueChange[] | undefined) {
		const byProp = new Map<string, QueueChange[]>();
		const byTag = new Map<string, QueueChange[]>();
		const byFile = new Map<string, QueueChange[]>();
		const all = operations ?? [];

		for (const op of all) {
			const c = op.change;
			if (c.type === 'property') {
				const key = normalizeProperty(c.property) || '';
				if (!byProp.has(key)) byProp.set(key, []);
				byProp.get(key)!.push(op);
			} else if (c.type === 'tag') {
				const key = normalizeTag(c.tag) || '';
				if (!byTag.has(key)) byTag.set(key, []);
				byTag.get(key)!.push(op);
			} else if ('files' in c) {
				for (const f of c.files) {
					const key = normalizePath(f.path) || '';
					if (!byFile.has(key)) byFile.set(key, []);
					byFile.get(key)!.push(op);
				}
			}
		}
		return { byProp, byTag, byFile, all };
	}

	private indexActiveFilters(filters: readonly ActiveFilterEntry[] | undefined) {
		const byProp = new Map<string, ActiveFilterEntry[]>();
		const byTag = new Map<string, ActiveFilterEntry[]>();
		const byPath = new Map<string, ActiveFilterEntry[]>();
		const byFileTarget: ActiveFilterEntry[] = [];
		const all = filters ?? [];

		for (const entry of all) {
			if (!isActiveFilterRuleEntry(entry)) continue;
			const r = entry.rule;
			if (r.property) {
				const key = normalizeProperty(r.property) || '';
				if (!byProp.has(key)) byProp.set(key, []);
				byProp.get(key)!.push(entry);
			}
			if (r.filterType === 'has_tag' && r.values) {
				for (const v of r.values) {
					const key = normalizeTag(v) || '';
					if (!byTag.has(key)) byTag.set(key, []);
					byTag.get(key)!.push(entry);
				}
			}
			if (r.filterType === 'file_path' && r.values) {
				for (const v of r.values) {
					const key = normalizePath(v) || '';
					if (!byPath.has(key)) byPath.set(key, []);
					byPath.get(key)!.push(entry);
				}
			} else if (isFileTargetFilter(r.filterType)) {
				byFileTarget.push(entry);
			}
		}
		return { byProp, byTag, byPath, byFileTarget, all };
	}

	setViewMode(explorerId: string, mode: ExplorerViewMode): void {
		if (this.modes.get(explorerId) === mode) return;
		this.modes.set(explorerId, mode);
		this.notify(explorerId);
	}

	getViewMode(explorerId: string): ExplorerViewMode {
		return this.modes.get(explorerId) ?? this.defaultMode;
	}

	select(explorerId: string, id: string, mode: 'replace' | 'toggle' | 'add' = 'replace'): void {
		getActivePerfProbe()?.count('viewService.select');
		const selected = this.selectionFor(explorerId);
		if (mode === 'replace') {
			if (selected.size === 1 && selected.has(id)) return;
			selected.clear();
			selected.add(id);
		} else if (mode === 'toggle') {
			if (selected.has(id)) selected.delete(id);
			else selected.add(id);
		} else {
			if (selected.has(id)) return;
			selected.add(id);
		}
		this.notify(explorerId);
	}

	clearSelection(explorerId: string): void {
		const selected = this.selections.get(explorerId);
		if (!selected || selected.size === 0) return;
		getActivePerfProbe()?.count('viewService.clearSelection');
		selected.clear();
		this.notify(explorerId);
	}

	toggleExpanded(explorerId: string, id: string): void {
		const expanded = this.expandedFor(explorerId);
		if (expanded.has(id)) expanded.delete(id);
		else expanded.add(id);
		this.notify(explorerId);
	}

	setFocused(explorerId: string, id: string | null): void {
		if (this.focused.get(explorerId) === id) return;
		getActivePerfProbe()?.count('viewService.setFocused');
		this.focused.set(explorerId, id);
		this.notify(explorerId);
	}

	subscribe(explorerId: string, cb: () => void): () => void {
		let callbacks = this.subscribers.get(explorerId);
		if (!callbacks) {
			callbacks = new Set();
			this.subscribers.set(explorerId, callbacks);
		}
		callbacks.add(cb);
		return () => {
			callbacks.delete(cb);
			if (callbacks.size === 0) this.subscribers.delete(explorerId);
		};
	}

	private toRow<TNode extends NodeBase>(
		input: ExplorerViewInput<TNode>,
		node: TNode,
		selected: ReadonlySet<string>,
		opIndex: ReturnType<ViewService['indexOperations']>,
		filterIndex: ReturnType<ViewService['indexActiveFilters']>,
		showMatchedFilterDecorations: boolean,
	): ViewRow<TNode> {
		const label = input.getLabel?.(node) ?? labelFromNode(node);
		const layers = this.layersFor(
			input,
			node,
			label,
			opIndex,
			filterIndex,
			showMatchedFilterDecorations,
		);
		const isSelected = selected.has(node.id);
		const rowLayers: ViewLayers = {
			...layers,
			state: { ...layers.state, selected: isSelected || undefined },
		};

		return {
			id: node.id,
			node,
			label,
			detail: input.getDetail?.(node),
			icon: layers.icons?.[0]?.icon,
			depth: (node as { depth?: number }).depth,
			cells: [],
			cls: withViewStateClasses((node as { cls?: string }).cls, rowLayers),
			layers: rowLayers,
			actions: input.getActions?.(node) ?? input.actions ?? [],
		};
	}

	private layersFor<TNode extends NodeBase>(
		input: ExplorerViewInput<TNode>,
		node: TNode,
		label: string,
		opIndex: ReturnType<ViewService['indexOperations']>,
		filterIndex: ReturnType<ViewService['indexActiveFilters']>,
		showMatchedFilterDecorations: boolean,
	): ViewLayers {
		const context = input.getDecorationContext?.(node);
		const revisionKey = revisionCacheKey(input.revisions);
		if (revisionKey) {
			const cacheKey = this.semanticLayerCacheKey(
				input,
				node,
				label,
				context,
				revisionKey,
				showMatchedFilterDecorations,
			);
			const cached = this.semanticLayerCache.get(cacheKey);
			if (cached) {
				getActivePerfProbe()?.count('viewService.semanticCache.hit', { nodes: 1 });
				return cached;
			}

			getActivePerfProbe()?.count('viewService.semanticCache.miss', { nodes: 1 });
			const layers = this.computeLayers(
				node,
				context,
				label,
				opIndex,
				filterIndex,
				showMatchedFilterDecorations,
			);
			this.rememberSemanticLayers(cacheKey, layers);
			return layers;
		}

		return this.computeLayers(
			node,
			context,
			label,
			opIndex,
			filterIndex,
			showMatchedFilterDecorations,
		);
	}

	private computeLayers<TNode extends NodeBase>(
		node: TNode,
		context: unknown,
		label: string,
		opIndex: ReturnType<ViewService['indexOperations']>,
		filterIndex: ReturnType<ViewService['indexActiveFilters']>,
		showMatchedFilterDecorations: boolean,
	): ViewLayers {
		const decoration = this.decorationManager?.decorate(node, context);
		const semanticLayers = semanticLayersFor(
			node,
			context,
			label,
			opIndex,
			filterIndex,
			showMatchedFilterDecorations,
		);
		if (!decoration) return semanticLayers;

		const source = iconSourceFromContext(context);
		const decorationLayers: ViewLayers = {
			icons: decoration.icons.map(
				(icon, index): ViewIconLayer => ({
					id: `${node.id}:icon:${index}`,
					icon,
					source,
				}),
			),
			badges: badgeLayersFromDecoration(node.id, decoration, source),
			highlights: decoration.highlights.length > 0 ? { query: decoration.highlights } : undefined,
		};
		return mergeLayers(decorationLayers, semanticLayers);
	}

	private semanticLayerCacheKey<TNode extends NodeBase>(
		input: ExplorerViewInput<TNode>,
		node: TNode,
		label: string,
		context: unknown,
		revisionKey: string,
		showMatchedFilterDecorations: boolean,
	): string {
		return [
			input.explorerId,
			input.mode,
			revisionKey,
			`decor:${this.decorationRevision}`,
			`matched-filter:${showMatchedFilterDecorations ? 1 : 0}`,
			node.id,
			label,
			stableValueKey(context),
		].join('\u0000');
	}

	private rememberSemanticLayers(key: string, layers: ViewLayers): void {
		if (this.semanticLayerCache.size >= MAX_SEMANTIC_LAYER_CACHE_ENTRIES) {
			getActivePerfProbe()?.count('viewService.semanticCache.evict', {
				nodes: this.semanticLayerCache.size,
			});
			this.semanticLayerCache.clear();
		}
		this.semanticLayerCache.set(key, layers);
	}

	private selectionFor(explorerId: string): SvelteSet<string> {
		let selected = this.selections.get(explorerId);
		if (!selected) {
			selected = new SvelteSet<string>();
			this.selections.set(explorerId, selected);
		}
		return selected;
	}

	private expandedFor(explorerId: string): SvelteSet<string> {
		let expanded = this.expanded.get(explorerId);
		if (!expanded) {
			expanded = new SvelteSet<string>();
			this.expanded.set(explorerId, expanded);
		}
		return expanded;
	}

	private notify(explorerId: string): void {
		const callbacks = this.subscribers.get(explorerId);
		if (!callbacks) return;
		for (const cb of callbacks) cb();
	}

	private notifyAll(): void {
		for (const explorerId of this.subscribers.keys()) this.notify(explorerId);
	}
}

function labelFromNode(node: NodeBase): string {
	const candidate = node as {
		label?: string;
		basename?: string;
		tag?: string;
		property?: string;
		name?: string;
	};
	return (
		candidate.label ??
		candidate.basename ??
		candidate.tag ??
		candidate.property ??
		candidate.name ??
		node.id
	);
}

function iconSourceFromContext(context: unknown): ViewIconSource {
	const kind = (context as { kind?: string } | undefined)?.kind;
	if (kind === 'operation') return 'operation';
	if (kind === 'filter') return 'filter';
	if (kind === 'file') return 'file';
	if (kind === 'folder') return 'folder';
	if (kind === 'tag') return 'tag';
	if (kind === 'prop') return 'type';
	return 'custom';
}

function semanticLayersFor<TNode extends NodeBase>(
	node: TNode,
	context: unknown,
	label: string,
	opIndex: ReturnType<ViewService['indexOperations']>,
	filterIndex: ReturnType<ViewService['indexActiveFilters']>,
	showMatchedFilterDecorations: boolean,
): ViewLayers {
	const kind = (context as { kind?: string } | undefined)?.kind;
	if (kind === 'operation' || isQueueChange(node)) return operationLayersFor(node);
	if (kind === 'filter' || isActiveFilterEntry(node)) return filterLayersFor(node, label);
	const operationLayers = matchedOperationLayersFor(node, context, opIndex);
	if (!showMatchedFilterDecorations) return operationLayers;
	return mergeLayers(operationLayers, matchedActiveFilterLayersFor(node, context, label, filterIndex));
}

function operationLayersFor(node: NodeBase): ViewLayers {
	if (!isQueueChange(node)) return {};
	const intent = operationIntent(node.change, node.group);
	return {
		icons: [
			{
				id: `${node.id}:op-icon`,
				icon: intent.icon,
				source: 'operation',
			},
		],
		badges: {
			ops: [
				{
					id: `${node.id}:op`,
					label: intent.label,
					icon: intent.icon,
					tone: intent.tone,
					sourceId: node.id,
					actionId: 'remove',
				},
			],
		},
		state: { pending: true },
	};
}

function filterLayersFor(node: NodeBase, label: string): ViewLayers {
	if (!isActiveFilterEntry(node)) return {};
	if (node.kind === 'group') return filterGroupLayersFor(node);
	const enabled = node.rule.enabled !== false;
	return {
		icons: [
			{
				id: `${node.id}:filter-icon`,
				icon: 'lucide-filter',
				source: 'filter',
			},
		],
		badges: {
			filters: [
				{
					id: `${node.id}:filter`,
					label: filterTypeLabel(node.rule.filterType),
					icon: 'lucide-filter',
					tone: enabled ? 'info' : 'neutral',
					sourceId: node.id,
					actionId: 'remove',
				},
			],
		},
		highlights: {
			filter: filterRangesForRule(label, node.rule),
		},
		state: {
			activeFilter: enabled || undefined,
			disabled: enabled ? undefined : true,
		},
	};
}

function filterGroupLayersFor(node: ActiveFilterEntry): ViewLayers {
	if (node.kind !== 'group') return {};
	const enabled = node.group.enabled !== false;
	const label = node.group.kind === 'selected_files' ? 'selected files' : node.group.logic;
	return {
		icons: [
			{
				id: `${node.id}:filter-group-icon`,
				icon: 'lucide-list-filter',
				source: 'filter',
			},
		],
		badges: {
			filters: [
				{
					id: `${node.id}:filter-group`,
					label,
					icon: 'lucide-list-filter',
					tone: enabled ? 'info' : 'neutral',
					sourceId: node.id,
					actionId: 'remove',
				},
			],
			counts: [
				{
					id: `${node.id}:filter-group-count`,
					label: String(node.group.children.length),
					tone: 'neutral',
				},
			],
		},
		state: {
			activeFilter: enabled || undefined,
			disabled: enabled ? undefined : true,
		},
	};
}

function matchedOperationLayersFor(
	node: NodeBase,
	context: unknown,
	opIndex: ReturnType<ViewService['indexOperations']>,
): ViewLayers {
	if (opIndex.all.length === 0) return {};
	const target = semanticTargetFor(node, context);

	let candidates: QueueChange[] = [];
	if (target.kind === 'prop' && target.property) {
		candidates = opIndex.byProp.get(target.property) ?? [];
	} else if (target.kind === 'tag' && target.tag) {
		candidates = opIndex.byTag.get(target.tag) ?? [];
	} else if (target.kind === 'file') {
		candidates = (target.filePath ? opIndex.byFile.get(target.filePath) : null) ?? [];
	}

	const matches = candidates.filter((operation) => operationMatchesTarget(operation.change, target));
	if (matches.length === 0) return {};

	const badges: ViewBadge[] = matches.map((operation, index) => {
		const intent = operationIntent(operation.change, operation.group);
		const sourceId = operation.id || operation.change.id || String(index);
		return {
			id: `${node.id}:op:${sourceId}`,
			label: intent.label,
			icon: intent.icon,
			tone: intent.tone,
			sourceId,
			actionId: 'remove',
		};
	});
	const hasDelete = matches.some(
		(operation) => operationIntent(operation.change, operation.group).label === 'delete',
	);

	return {
		badges: { ops: uniqueBadges(badges) },
		state: {
			pending: true,
			deleted: hasDelete || undefined,
		},
	};
}

function matchedActiveFilterLayersFor(
	node: NodeBase,
	context: unknown,
	label: string,
	filterIndex: ReturnType<ViewService['indexActiveFilters']>,
): ViewLayers {
	if (filterIndex.all.length === 0) return {};
	const target = semanticTargetFor(node, context);

	let candidates: ActiveFilterEntry[] = [];
	if (target.kind === 'prop' && target.property) {
		candidates = filterIndex.byProp.get(target.property) ?? [];
	} else if (target.kind === 'tag' && target.tag) {
		candidates = filterIndex.byTag.get(target.tag) ?? [];
	} else if (target.kind === 'file' && target.filePath) {
		candidates = [...(filterIndex.byPath.get(target.filePath) ?? []), ...filterIndex.byFileTarget];
	} else if (target.kind === 'file') {
		candidates = filterIndex.byFileTarget;
	}

	const matches = candidates.flatMap((entry, index) =>
		isActiveFilterRuleEntry(entry) && filterMatchesTarget(entry.rule, target)
			? [{ entry, index }]
			: [],
	);
	if (matches.length === 0) return {};

	const badges: ViewBadge[] = matches.map(({ entry, index }) => {
		const sourceId = entry.id || entry.rule.id || String(index);
		const enabled = entry.rule.enabled !== false;
		return {
			id: `${node.id}:filter:${sourceId}`,
			label: filterTypeLabel(entry.rule.filterType),
			icon: 'lucide-filter',
			tone: enabled ? 'info' : 'neutral',
			sourceId,
			actionId: 'remove',
		};
	});
	const filterRanges = collapseRanges(
		matches.flatMap(({ entry }) => filterRangesForRule(label, entry.rule) ?? []),
	);
	const hasEnabled = matches.some(({ entry }) => entry.rule.enabled !== false);

	return {
		badges: { filters: uniqueBadges(badges) },
		highlights: filterRanges.length > 0 ? { filter: filterRanges } : undefined,
		state: {
			activeFilter: hasEnabled || undefined,
			disabled: hasEnabled ? undefined : true,
		},
	};
}

function semanticTargetFor(node: NodeBase, context: unknown): SemanticTarget {
	const ctx = (context ?? {}) as SemanticContext;
	const candidate = node as SemanticContext & {
		label?: string;
		tag?: string;
		property?: string;
		meta?: SemanticContext;
	};
	const meta = candidate.meta ?? {};
	const property =
		ctx.propName ?? ctx.property ?? meta.propName ?? meta.property ?? candidate.property;
	const value = ctx.rawValue ?? ctx.value ?? meta.rawValue ?? meta.value;
	const tag = ctx.tagPath ?? ctx.tag ?? meta.tagPath ?? meta.tag ?? candidate.tag;
	const filePath =
		ctx.filePath ??
		ctx.path ??
		ctx.file?.path ??
		meta.filePath ??
		meta.path ??
		meta.file?.path ??
		candidate.filePath ??
		candidate.path ??
		candidate.file?.path;
	const basename =
		ctx.basename ??
		ctx.file?.basename ??
		ctx.file?.name ??
		meta.basename ??
		meta.file?.basename ??
		meta.file?.name ??
		candidate.basename ??
		candidate.file?.basename ??
		candidate.file?.name;
	const folderPath = ctx.folderPath ?? meta.folderPath ?? candidate.folderPath;
	const isFolder = ctx.isFolder ?? meta.isFolder ?? candidate.isFolder;
	const kind =
		ctx.kind ??
		(property ? 'prop' : tag ? 'tag' : filePath || basename || folderPath ? 'file' : undefined);

	return {
		kind: kind === 'folder' ? 'file' : kind,
		property: normalizeProperty(property),
		value: value == null ? undefined : String(value),
		isValueNode: ctx.isValueNode ?? meta.isValueNode ?? candidate.isValueNode ?? value != null,
		tag: normalizeTag(tag),
		filePath: normalizePath(filePath),
		basename: basename == null ? undefined : String(basename).toLowerCase(),
		folderPath: normalizePath(folderPath),
		isFolder,
	};
}

function operationMatchesTarget(change: PendingChange, target: SemanticTarget): boolean {
	if (change.type === 'property') {
		if (target.kind !== 'prop') return false;
		if (normalizeProperty(change.property) !== target.property) return false;
		if (!target.isValueNode) return true;
		const values = [change.value, change.oldValue].filter(
			(value): value is string => value != null,
		);
		return values.some((value) => String(value) === target.value);
	}

	if (change.type === 'tag') {
		return target.kind === 'tag' && normalizeTag(change.tag) === target.tag;
	}

	if (
		change.type === 'file_rename' ||
		change.type === 'file_move' ||
		change.type === 'file_delete' ||
		change.type === 'template'
	) {
		return target.kind === 'file' && changeTargetsFile(change, target);
	}

	if (change.type === 'content_replace') {
		return target.kind === 'file' && changeTargetsFile(change, target);
	}

	return false;
}

function filterMatchesTarget(rule: FilterRule, target: SemanticTarget): boolean {
	switch (rule.filterType) {
		case 'has_property':
		case 'missing_property':
			return (
				target.kind === 'prop' &&
				!target.isValueNode &&
				normalizeProperty(rule.property) === target.property
			);
		case 'specific_value':
		case 'multiple_values':
			return (
				target.kind === 'prop' &&
				Boolean(target.isValueNode) &&
				normalizeProperty(rule.property) === target.property &&
				rule.values.some((value) => String(value) === target.value)
			);
		case 'has_tag':
			return (
				target.kind === 'tag' && rule.values.some((value) => normalizeTag(value) === target.tag)
			);
		case 'folder':
		case 'folder_exclude':
		case 'file_folder':
			return (
				target.kind === 'file' && rule.values.some((value) => targetMatchesFolder(target, value))
			);
		case 'file_name':
		case 'file_name_exclude':
			return (
				target.kind === 'file' && rule.values.some((value) => targetMatchesFileName(target, value))
			);
		case 'file_path':
			return (
				target.kind === 'file' &&
				rule.values.some((value) => normalizePath(value) === target.filePath)
			);
		default:
			return false;
	}
}

function isFileTargetFilter(type: FilterType): boolean {
	return (
		type === 'folder' ||
		type === 'folder_exclude' ||
		type === 'file_folder' ||
		type === 'file_name' ||
		type === 'file_name_exclude'
	);
}

function changeTargetsFile(change: PendingChange, target: SemanticTarget): boolean {
	if (!('files' in change)) return false;
	return change.files.some((file) => {
		const path = normalizePath(file.path);
		const basename = (file.basename ?? file.name ?? '').toLowerCase();
		return Boolean(
			(target.filePath && path === target.filePath) ||
			(target.basename && basename === target.basename),
		);
	});
}

function targetMatchesFolder(target: SemanticTarget, value: string): boolean {
	const folder = normalizePath(value);
	if (!folder) return false;
	if (target.isFolder) return target.folderPath === folder || target.filePath === folder;
	return Boolean(
		target.filePath && (target.filePath === folder || target.filePath.startsWith(`${folder}/`)),
	);
}

function targetMatchesFileName(target: SemanticTarget, value: string): boolean {
	const needle = value.toLowerCase();
	return Boolean(needle && target.basename?.includes(needle));
}

function operationIntent(
	change: PendingChange,
	group: string,
): { label: string; icon: string; tone: ViewTone } {
	const raw = `${change.action ?? ''} ${change.type ?? ''} ${group}`.toLowerCase();
	if (raw.includes('delete') || raw.includes('remove')) {
		return { label: 'delete', icon: 'lucide-trash-2', tone: 'danger' };
	}
	if (raw.includes('add')) return { label: 'add', icon: 'lucide-plus', tone: 'success' };
	if (raw.includes('rename')) return { label: 'rename', icon: 'lucide-pencil', tone: 'warning' };
	if (raw.includes('move')) return { label: 'move', icon: 'lucide-folder-input', tone: 'info' };
	if (raw.includes('template'))
		return { label: 'template', icon: 'lucide-book-marked', tone: 'accent' };
	if (raw.includes('replace')) return { label: 'replace', icon: 'lucide-replace', tone: 'warning' };
	if (raw.includes('set')) return { label: 'set', icon: 'lucide-settings-2', tone: 'info' };
	return {
		label: change.action || change.type || group || 'operation',
		icon: 'lucide-settings-2',
		tone: 'info',
	};
}

function filterTypeLabel(type: FilterType): string {
	return type.replaceAll('_', ' ');
}

function filterRangesForRule(label: string, rule: FilterRule): ViewTextRange[] | undefined {
	const terms = [
		rule.property,
		...rule.values,
		...rule.values.map((value) => value.replace(/^#/, '')),
	].filter(Boolean);
	const ranges = terms.flatMap((term) => rangesForTerm(label, term));
	if (ranges.length === 0) return undefined;
	return collapseRanges(ranges);
}

function rangesForTerm(label: string, term: string): ViewTextRange[] {
	const ranges: ViewTextRange[] = [];
	const haystack = label.toLowerCase();
	const needle = term.toLowerCase();
	if (!needle) return ranges;
	let index = 0;
	while ((index = haystack.indexOf(needle, index)) !== -1) {
		ranges.push({ start: index, end: index + term.length });
		index += term.length;
	}
	return ranges;
}

function collapseRanges(ranges: ViewTextRange[]): ViewTextRange[] {
	const seen = new Set<string>();
	return ranges
		.sort((a, b) => a.start - b.start || a.end - b.end)
		.filter((range) => {
			const key = `${range.start}:${range.end}`;
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		});
}

function uniqueBadges(badges: readonly ViewBadge[]): readonly ViewBadge[] {
	const seen = new Set<string>();
	return badges.filter((badge) => {
		if (seen.has(badge.id)) return false;
		seen.add(badge.id);
		return true;
	});
}

function normalizeProperty(value: string | undefined): string | undefined {
	return value?.trim().toLowerCase();
}

function normalizeTag(value: string | undefined): string | undefined {
	return value?.trim().replace(/^#/, '').toLowerCase();
}

function normalizePath(value: string | undefined): string | undefined {
	return value?.replaceAll('\\', '/').replace(/^\/+/, '').replace(/\/+$/, '').toLowerCase();
}

function revisionCacheKey(revisions: ExplorerViewRevisions | undefined): string | null {
	if (!revisions) return null;
	let hasRevision = false;
	const key = EXPLORER_REVISION_FIELDS.map((field) => {
		const value = revisions[field];
		if (typeof value === 'number') {
			hasRevision = true;
			return `${field}:${value}`;
		}
		return `${field}:-`;
	}).join('|');
	return hasRevision ? key : null;
}

function stableValueKey(value: unknown): string {
	if (value == null) return '';
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
		return value.toString();
	}
	if (typeof value === 'symbol') return value.toString();
	if (typeof value === 'function') return '[Function]';
	try {
		return stableSerialize(value, new WeakSet<object>());
	} catch {
		return Object.prototype.toString.call(value);
	}
}

function stableSerialize(value: unknown, seen: WeakSet<object>): string {
	if (value == null || typeof value !== 'object') {
		const json = JSON.stringify(value);
		if (json != null) return json;
		return typeof value === 'symbol' ? value.toString() : String(value);
	}
	if (seen.has(value)) return '"[Circular]"';
	seen.add(value);
	if (Array.isArray(value)) {
		const serialized = `[${value.map((entry) => stableSerialize(entry, seen)).join(',')}]`;
		seen.delete(value);
		return serialized;
	}
	const record = value as Record<string, unknown>;
	const body = Object.keys(record)
		.sort()
		.map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key], seen)}`)
		.join(',');
	seen.delete(value);
	return `{${body}}`;
}

function isQueueChange(node: NodeBase): node is QueueChange {
	const candidate = node as Partial<QueueChange>;
	return Boolean(candidate.change && typeof candidate.group === 'string');
}

function isActiveFilterEntry(node: NodeBase): node is ActiveFilterEntry {
	const candidate = node as {
		kind?: string;
		rule?: { type?: string };
		group?: { type?: string };
	};
	return Boolean(
		(candidate.kind === 'rule' && candidate.rule?.type === 'rule') ||
		(candidate.kind === 'group' && candidate.group?.type === 'group') ||
		candidate.rule?.type === 'rule',
	);
}

function isActiveFilterRuleEntry(
	node: ActiveFilterEntry,
): node is Extract<ActiveFilterEntry, { kind: 'rule' }> {
	const candidate = node as {
		kind?: string;
		rule?: { type?: string };
	};
	return candidate.kind !== 'group' && candidate.rule?.type === 'rule';
}

function mergeLayers(primary: ViewLayers, secondary: ViewLayers): ViewLayers {
	return {
		icons: mergeArrays(primary.icons, secondary.icons),
		badges: mergeBadges(primary.badges, secondary.badges),
		highlights: {
			query: mergeArrays(primary.highlights?.query, secondary.highlights?.query),
			filter: mergeArrays(primary.highlights?.filter, secondary.highlights?.filter),
			warning: mergeArrays(primary.highlights?.warning, secondary.highlights?.warning),
		},
		state: { ...primary.state, ...secondary.state },
		marks: mergeArrays(primary.marks, secondary.marks),
	};
}

function mergeBadges(
	primary: ViewBadgeLayers | undefined,
	secondary: ViewBadgeLayers | undefined,
): ViewBadgeLayers | undefined {
	if (!primary && !secondary) return undefined;
	return {
		ops: mergeArrays(primary?.ops, secondary?.ops),
		filters: mergeArrays(primary?.filters, secondary?.filters),
		warnings: mergeArrays(primary?.warnings, secondary?.warnings),
		inherited: mergeArrays(primary?.inherited, secondary?.inherited),
		counts: mergeArrays(primary?.counts, secondary?.counts),
	};
}

function mergeArrays<T>(
	primary: readonly T[] | undefined,
	secondary: readonly T[] | undefined,
): readonly T[] | undefined {
	const merged = [...(primary ?? []), ...(secondary ?? [])];
	return merged.length > 0 ? merged : undefined;
}

function badgeLayersFromDecoration(
	nodeId: string,
	decoration: DecorationOutput,
	source: ViewIconSource,
): ViewBadgeLayers | undefined {
	if (decoration.badges.length === 0) return undefined;
	const badges = decoration.badges.map(
		(badge, index): ViewBadge => ({
			id: `${nodeId}:badge:${index}`,
			label: badge.label,
			tone: toneFromAccent(badge.accent),
		}),
	);

	if (source === 'operation') return { ops: badges };
	if (source === 'filter') return { filters: badges };
	return { counts: badges };
}

function toneFromAccent(accent: string | undefined): ViewTone {
	if (accent === 'red') return 'danger';
	if (accent === 'green') return 'success';
	if (accent === 'orange') return 'warning';
	if (accent === 'blue') return 'info';
	if (accent === 'purple') return 'accent';
	if (accent === 'accent') return 'accent';
	return 'neutral';
}
