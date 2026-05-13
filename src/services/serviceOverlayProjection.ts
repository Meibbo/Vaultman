import type { ActiveFilterEntry, NodeBase, QueueChange } from '../types/typeContracts';
import type { FilterRule, FilterType } from '../types/typeFilter';
import type { PendingChange } from '../types/typeOps';
import type {
	ViewBadge,
	ViewBadgeLayers,
	ViewLayers,
	ViewTextRange,
} from '../types/typeViews';
import { queueChangeIntent } from './serviceQueuePresentation';

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

export interface OperationOverlayIndex {
	byProp: ReadonlyMap<string, readonly QueueChange[]>;
	byTag: ReadonlyMap<string, readonly QueueChange[]>;
	byFile: ReadonlyMap<string, readonly QueueChange[]>;
	all: readonly QueueChange[];
}

export interface ActiveFilterOverlayIndex {
	byProp: ReadonlyMap<string, readonly ActiveFilterEntry[]>;
	byTag: ReadonlyMap<string, readonly ActiveFilterEntry[]>;
	byPath: ReadonlyMap<string, readonly ActiveFilterEntry[]>;
	byFileTarget: readonly ActiveFilterEntry[];
	all: readonly ActiveFilterEntry[];
}

export interface OverlayProjectionIndexes {
	operations: OperationOverlayIndex;
	activeFilters: ActiveFilterOverlayIndex;
}

export interface OverlayProjectionIndexInput {
	operations?: readonly QueueChange[];
	activeFilters?: readonly ActiveFilterEntry[];
}

export interface OverlayLayerProjectionInput<TNode extends NodeBase = NodeBase> {
	node: TNode;
	label: string;
	context?: unknown;
	operations?: OperationOverlayIndex | readonly QueueChange[];
	activeFilters?: ActiveFilterOverlayIndex | readonly ActiveFilterEntry[];
	showMatchedFilterDecorations?: boolean;
}

export function createOverlayProjectionIndexes(
	input: OverlayProjectionIndexInput = {},
): OverlayProjectionIndexes {
	return {
		operations: createOperationOverlayIndex(input.operations),
		activeFilters: createActiveFilterOverlayIndex(input.activeFilters),
	};
}

export function createOperationOverlayIndex(
	operations: readonly QueueChange[] | undefined,
): OperationOverlayIndex {
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

export function createActiveFilterOverlayIndex(
	filters: readonly ActiveFilterEntry[] | undefined,
): ActiveFilterOverlayIndex {
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

export function projectOverlayLayers<TNode extends NodeBase>(
	input: OverlayLayerProjectionInput<TNode>,
): ViewLayers {
	const operations = isOperationOverlayIndex(input.operations)
		? input.operations
		: createOperationOverlayIndex(input.operations);
	const activeFilters = isActiveFilterOverlayIndex(input.activeFilters)
		? input.activeFilters
		: createActiveFilterOverlayIndex(input.activeFilters);
	const context = input.context;
	const kind = (context as { kind?: string } | undefined)?.kind;

	if (kind === 'operation' || isQueueChange(input.node)) return operationLayersFor(input.node);
	if (kind === 'filter' || isActiveFilterEntry(input.node)) {
		return filterLayersFor(input.node, input.label);
	}

	const operationLayers = matchedOperationLayersFor(input.node, context, operations);
	if (!input.showMatchedFilterDecorations) return operationLayers;
	return mergeViewLayers(
		operationLayers,
		matchedActiveFilterLayersFor(input.node, context, input.label, activeFilters),
	);
}

export function mergeViewLayers(primary: ViewLayers, secondary: ViewLayers): ViewLayers {
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

function operationLayersFor(node: NodeBase): ViewLayers {
	if (!isQueueChange(node)) return {};
	const intent = queueChangeIntent(node);
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
	opIndex: OperationOverlayIndex,
): ViewLayers {
	if (opIndex.all.length === 0) return {};
	const target = semanticTargetFor(node, context);

	let candidates: readonly QueueChange[] = [];
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
		const intent = queueChangeIntent(operation);
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
	const hasDelete = matches.some((operation) => queueChangeIntent(operation).label === 'delete');

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
	filterIndex: ActiveFilterOverlayIndex,
): ViewLayers {
	if (filterIndex.all.length === 0) return {};
	const target = semanticTargetFor(node, context);

	let candidates: readonly ActiveFilterEntry[] = [];
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

function isOperationOverlayIndex(value: unknown): value is OperationOverlayIndex {
	return Boolean(
		value &&
			typeof value === 'object' &&
			'byProp' in value &&
			'byTag' in value &&
			'byFile' in value &&
			'all' in value,
	);
}

function isActiveFilterOverlayIndex(value: unknown): value is ActiveFilterOverlayIndex {
	return Boolean(
		value &&
			typeof value === 'object' &&
			'byProp' in value &&
			'byTag' in value &&
			'byPath' in value &&
			'byFileTarget' in value &&
			'all' in value,
	);
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
