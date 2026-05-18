import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import type {
	DecorationOutput,
	IDecorationManager,
	NodeBase,
} from '../types/typeContracts';
import type { INodeSelectionService, NodeSelectionSnapshot } from '../types/typeSelection';
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
	ViewRow,
	ViewTone,
} from '../types/typeViews';
import { getActivePerfProbe } from '../dev/perfProbe';
import { withViewStateClasses } from '../utils/utilViewLayers';
import { NodeSelectionService } from './serviceSelection.svelte';
import {
	createActiveFilterOverlayIndex,
	createOperationOverlayIndex,
	mergeViewLayers,
	projectOverlayLayers,
	type ActiveFilterOverlayIndex,
	type OperationOverlayIndex,
} from './serviceOverlayProjection';

interface ViewServiceOptions {
	decorationManager?: IDecorationManager;
	defaultMode?: ExplorerViewMode;
	selectionService?: INodeSelectionService;
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

export class ViewService implements IViewService {
	private readonly decorationManager?: IDecorationManager;
	private readonly defaultMode: ExplorerViewMode;
	private readonly showMatchedFilterDecorations: () => boolean;
	readonly selectionService: INodeSelectionService;
	private decorationRevision = 0;

	// Svelte 5 Native Reactivity
	private readonly modes = new SvelteMap<string, ExplorerViewMode>();
	private readonly expanded = new SvelteMap<string, SvelteSet<string>>();
	private readonly subscribers = new Map<string, Set<() => void>>();

	// Cached indices to avoid O(N * (M+K)) during tree decoration
	private lastOps: Parameters<typeof createOperationOverlayIndex>[0];
	private lastFilters: Parameters<typeof createActiveFilterOverlayIndex>[0];
	private cachedOpIndex: OperationOverlayIndex | undefined;
	private cachedFilterIndex: ActiveFilterOverlayIndex | undefined;
	private readonly semanticLayerCache = new Map<string, ViewLayers>();

	constructor(options: ViewServiceOptions = {}) {
		this.decorationManager = options.decorationManager;
		this.defaultMode = options.defaultMode ?? 'tree';
		this.selectionService = options.selectionService ?? new NodeSelectionService();
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
		const selection = this.selectionService.snapshot(input.explorerId);
		const selected = selection.ids;
		const opIndex = this.getOpIndex(input.operations);
		const filterIndex = this.getFilterIndex(input.activeFilters);
		const showMatchedFilterDecorations = this.showMatchedFilterDecorations();

		const rows = input.nodes.map((node) =>
			this.toRow(input, node, selection, opIndex, filterIndex, showMatchedFilterDecorations),
		);

		return {
			explorerId: input.explorerId,
			mode: input.mode,
			rows,
			columns: input.columns ?? [],
			groups: input.groups ?? [],
			selection: { ids: new Set(selected), anchorId: selection.anchorId },
			focus: { id: selection.focusedId },
			sort: input.sort ?? { id: 'manual', direction: 'asc' },
			search: input.search ?? { query: '' },
			virtualization: { rowHeight: 32, overscan: 5 },
			capabilities: input.capabilities ?? {},
			empty: rows.length === 0 ? { label: 'No items' } : undefined,
		};
	}

	private getOpIndex(operations: Parameters<typeof createOperationOverlayIndex>[0]) {
		if (this.lastOps === operations && this.cachedOpIndex) return this.cachedOpIndex;
		this.lastOps = operations;
		this.cachedOpIndex = createOperationOverlayIndex(operations);
		return this.cachedOpIndex;
	}

	private getFilterIndex(filters: Parameters<typeof createActiveFilterOverlayIndex>[0]) {
		if (this.lastFilters === filters && this.cachedFilterIndex) return this.cachedFilterIndex;
		this.lastFilters = filters;
		this.cachedFilterIndex = createActiveFilterOverlayIndex(filters);
		return this.cachedFilterIndex;
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
		const snapshot = this.selectionService.snapshot(explorerId);
		if (mode === 'replace') {
			if (snapshot.ids.size === 1 && snapshot.ids.has(id) && snapshot.focusedId === id) return;
			this.selectionService.selectPointer(explorerId, [id], id);
		} else if (mode === 'toggle') {
			this.selectionService.selectPointer(explorerId, orderedSelectionIds(snapshot, id), id, {
				additive: true,
			});
		} else {
			if (snapshot.ids.has(id)) return;
			this.selectionService.selectPointer(explorerId, orderedSelectionIds(snapshot, id), id, {
				additive: true,
			});
		}
		this.notify(explorerId);
	}

	clearSelection(explorerId: string): void {
		const snapshot = this.selectionService.snapshot(explorerId);
		if (snapshot.ids.size === 0 && !snapshot.anchorId && !snapshot.focusedId && !snapshot.hoveredId) {
			return;
		}
		getActivePerfProbe()?.count('viewService.clearSelection');
		this.selectionService.clear(explorerId);
		this.notify(explorerId);
	}

	toggleExpanded(explorerId: string, id: string): void {
		const expanded = this.expandedFor(explorerId);
		if (expanded.has(id)) expanded.delete(id);
		else expanded.add(id);
		this.notify(explorerId);
	}

	setFocused(explorerId: string, id: string | null): void {
		if (this.selectionService.snapshot(explorerId).focusedId === id) return;
		getActivePerfProbe()?.count('viewService.setFocused');
		this.selectionService.setFocused(explorerId, id);
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
		selection: NodeSelectionSnapshot,
		opIndex: OperationOverlayIndex,
		filterIndex: ActiveFilterOverlayIndex,
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
		const isSelected = selection.ids.has(node.id);
		const isFocused = selection.focusedId === node.id;
		const rowLayers: ViewLayers = {
			...layers,
			state: {
				...layers.state,
				selected: isSelected || undefined,
				focused: isFocused || undefined,
			},
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
		opIndex: OperationOverlayIndex,
		filterIndex: ActiveFilterOverlayIndex,
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
		opIndex: OperationOverlayIndex,
		filterIndex: ActiveFilterOverlayIndex,
		showMatchedFilterDecorations: boolean,
	): ViewLayers {
		const decoration = this.decorationManager?.decorate(node, context);
		const semanticLayers = projectOverlayLayers({
			node,
			context,
			label,
			operations: opIndex,
			activeFilters: filterIndex,
			showMatchedFilterDecorations,
		});
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
		return mergeViewLayers(decorationLayers, semanticLayers);
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

function orderedSelectionIds(snapshot: NodeSelectionSnapshot, targetId: string): string[] {
	const ids = [...snapshot.ids];
	if (!ids.includes(targetId)) ids.push(targetId);
	return ids.length > 0 ? ids : [targetId];
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
