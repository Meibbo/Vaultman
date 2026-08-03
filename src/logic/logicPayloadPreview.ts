import { normalizeExplorerViewMode } from './logicExplorerViewModes';
import { normalizeInteractionMode } from './logicInteractionMode';
import {
	normalizeNodeTypeFilters,
	nodeTypeFilterPatch,
} from './logicNodeTypeFilters';
import { activeScopeSort, normalizeExplorerSortState } from './logicScopedSort';
import { normalizeExplorerSortBy } from './logicSort';
import { SORT_MENU_OPTIONS } from './logicSortMenu';
import type { ExplorerTabId, SortScopeKey } from '../types/typeUI';

export type PayloadPreviewKind = 'filter' | 'queue' | 'layout';
export type PayloadPreviewStatus = 'default' | 'warning';
export type PayloadPreviewNote =
	| 'default-applied'
	| 'generated-on-load'
	| 'ignored-field'
	| 'invalid-shape'
	| 'migration-applied'
	| 'missing-field'
	| 'resolved-on-load'
	| 'unchanged'
	| 'unknown-field'
	| 'unknown-value';

export interface PayloadPreviewRow {
	key: string;
	value: string;
	status?: PayloadPreviewStatus;
	note?: PayloadPreviewNote;
}

export interface PayloadPreviewSection {
	id: string;
	title: string;
	rows: PayloadPreviewRow[];
}

export interface PayloadPreview {
	kind: PayloadPreviewKind;
	name: string;
	sections: PayloadPreviewSection[];
	warningCount: number;
}

const FILTER_TYPES = new Set([
	'has_property',
	'missing_property',
	'specific_value',
	'multiple_values',
	'folder',
	'folder_exclude',
	'file_name',
	'file_name_exclude',
	'file_folder',
	'content_search',
	'has_tag',
]);
const GROUP_LOGIC = new Set(['all', 'any', 'none']);
const QUEUE_CHANGE_TYPES = new Set([
	'property',
	'content_replace',
	'template',
	'tag',
]);
const PROPERTY_ACTIONS = new Set([
	'set',
	'rename',
	'delete',
	'clean_empty',
	'change_type',
	'add',
]);
const TAG_ACTIONS = new Set(['add', 'delete']);
const LAYOUT_TABS = [
	'files',
	'props',
	'tags',
	'snippets',
	'plugins',
] as const satisfies readonly ExplorerTabId[];
const CORE_TABS = new Set<ExplorerTabId>(['files', 'props', 'tags']);
const KNOWN_VIEW_MODES = new Set(['tree', 'grid', 'cards', 'table', 'dnd']);
const KNOWN_VISIBLE_CELLS: Record<ExplorerTabId, ReadonlySet<string>> = {
	files: new Set([
		'icon',
		'name',
		'count',
		'text',
		'ext',
		'words',
		'tasks',
		'mtime',
		'ctime',
		'nested',
	]),
	props: new Set(['icon', 'text', 'count', 'type', 'nested']),
	tags: new Set(['icon', 'text', 'count', 'nested']),
	snippets: new Set(['icon', 'text', 'state', 'installed', 'updated']),
	plugins: new Set(['icon', 'text', 'state', 'config', 'installed', 'updated']),
};

const SCOPES_BY_TAB: Record<ExplorerTabId, readonly SortScopeKey[]> = {
	files: ['all', 'drill'],
	props: ['properties', 'values'],
	tags: ['all', 'drill'],
	snippets: ['all'],
	plugins: ['all'],
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stableSerializable(
	value: unknown,
	seen = new WeakSet<object>(),
): unknown {
	if (Array.isArray(value)) {
		if (seen.has(value)) return '[Circular]';
		seen.add(value);
		return value.map((entry) => stableSerializable(entry, seen));
	}
	if (isRecord(value)) {
		if (seen.has(value)) return '[Circular]';
		seen.add(value);
		return Object.fromEntries(
			Object.keys(value)
				.sort((left, right) => left.localeCompare(right))
				.map((key) => [key, stableSerializable(value[key], seen)]),
		);
	}
	if (value === undefined) return '(not set)';
	if (typeof value === 'bigint') return value.toString();
	if (typeof value === 'function' || typeof value === 'symbol') {
		return String(value);
	}
	return value;
}

export function formatPayloadPreviewValue(value: unknown): string {
	if (typeof value === 'string') return value === '' ? '""' : value;
	if (value === undefined) return '(not set)';
	if (value === null) return 'null';
	if (typeof value === 'number' || typeof value === 'boolean') {
		return String(value);
	}
	return JSON.stringify(stableSerializable(value));
}

function row(
	key: string,
	value: unknown,
	options: Pick<PayloadPreviewRow, 'status' | 'note'> = {},
): PayloadPreviewRow {
	return { key, value: formatPayloadPreviewValue(value), ...options };
}

function unknownRows(
	value: Record<string, unknown>,
	knownKeys: ReadonlySet<string>,
	prefix = '',
): PayloadPreviewRow[] {
	return Object.keys(value)
		.filter((key) => !knownKeys.has(key))
		.sort((left, right) => left.localeCompare(right))
		.map((key) =>
			row(`${prefix}${key}`, value[key], {
				status: 'warning',
				note: 'unknown-field',
			}),
		);
}

function finalize(
	kind: PayloadPreviewKind,
	name: string,
	sections: PayloadPreviewSection[],
): PayloadPreview {
	return {
		kind,
		name,
		sections,
		warningCount: sections.reduce(
			(total, section) =>
				total +
				section.rows.filter((entry) => entry.status === 'warning').length,
			0,
		),
	};
}

function countFilterNodes(value: unknown): number {
	if (!isRecord(value)) return 0;
	const children: unknown[] = Array.isArray(value.children)
		? (value.children as unknown[])
		: [];
	return (
		1 +
		children.reduce<number>(
			(total, child) => total + countFilterNodes(child),
			0,
		)
	);
}

function stringField(value: unknown): string {
	return typeof value === 'string' ? value : '';
}

function metaRows(value: Record<string, unknown>): PayloadPreviewRow[] {
	return [
		value.enabled == null
			? row('enabled', true, {
					status: 'default',
					note: 'default-applied',
				})
			: row('enabled', value.enabled),
		value.id == null
			? row('id', '(generated on load)', {
					status: 'default',
					note: 'generated-on-load',
				})
			: row('id', value.id),
	];
}

function filterSections(
	value: unknown,
	path: string,
	title: string,
): PayloadPreviewSection[] {
	if (!isRecord(value)) {
		return [
			{
				id: `filter:${path}`,
				title,
				rows: [
					row('result', value, {
						status: 'warning',
						note: 'invalid-shape',
					}),
				],
			},
		];
	}

	const type = value.type;
	if (type === 'group') {
		const validChildren = Array.isArray(value.children);
		const children: unknown[] = validChildren
			? (value.children as unknown[])
			: [];
		const rows: PayloadPreviewRow[] = [row('type', type)];
		rows.push(
			GROUP_LOGIC.has(String(value.logic))
				? row('logic', value.logic)
				: row('logic', value.logic, {
						status: 'warning',
						note: 'unknown-value',
					}),
			...metaRows(value),
			validChildren
				? row('children', children.length)
				: row('children', value.children ?? '(missing)', {
						status: 'warning',
						note: 'invalid-shape',
					}),
			...unknownRows(
				value,
				new Set(['type', 'logic', 'children', 'id', 'enabled']),
			),
		);
		return [
			{ id: `filter:${path}`, title, rows },
			...children.flatMap((child, index) =>
				filterSections(
					child,
					`${path}.${index + 1}`,
					`Filter ${path}.${index + 1}`,
				),
			),
		];
	}

	if (type === 'rule') {
		const filterType = stringField(value.filterType);
		return [
			{
				id: `filter:${path}`,
				title,
				rows: [
					row('type', type),
					FILTER_TYPES.has(filterType)
						? row('filterType', filterType)
						: row('filterType', filterType || '(missing)', {
								status: 'warning',
								note: filterType ? 'unknown-value' : 'missing-field',
							}),
					row('property', value.property),
					row('values', value.values),
					...metaRows(value),
					...unknownRows(
						value,
						new Set([
							'type',
							'filterType',
							'property',
							'values',
							'id',
							'enabled',
						]),
					),
				],
			},
		];
	}

	return [
		{
			id: `filter:${path}`,
			title,
			rows: [
				row('type', type ?? '(missing)', {
					status: 'warning',
					note: type === undefined ? 'missing-field' : 'unknown-value',
				}),
				...unknownRows(value, new Set(['type'])),
			],
		},
	];
}

export function buildFilterTemplatePreview(value: unknown): PayloadPreview {
	const template = isRecord(value) ? value : {};
	const name = typeof template.name === 'string' ? template.name : '(unnamed)';
	const overview: PayloadPreviewSection = {
		id: 'overview',
		title: 'Overview',
		rows: [
			row('kind', 'filter-template'),
			row('name', name),
			row('nodes', countFilterNodes(template.root)),
			...unknownRows(template, new Set(['name', 'root'])),
		],
	};
	return finalize('filter', name, [
		overview,
		...filterSections(template.root, 'root', 'Root filter'),
	]);
}

function requiredRow(
	value: Record<string, unknown>,
	key: string,
): PayloadPreviewRow {
	return value[key] === undefined
		? row(key, '(missing)', { status: 'warning', note: 'missing-field' })
		: row(key, value[key]);
}

function optionalRow(
	value: Record<string, unknown>,
	key: string,
): PayloadPreviewRow {
	return value[key] === undefined
		? row(key, '(not set)', { status: 'default', note: 'default-applied' })
		: row(key, value[key]);
}

function effectivePropertyValueRow(
	value: Record<string, unknown>,
	action: string,
): PayloadPreviewRow {
	if (value.value != null) return row('value', value.value);
	if (action === 'change_type') {
		return row('value', 'text', {
			status: 'default',
			note: 'default-applied',
		});
	}
	if (action === 'set' || action === 'add' || action === 'rename') {
		return row('value', '', {
			status: 'default',
			note: 'default-applied',
		});
	}
	return optionalRow(value, 'value');
}

function booleanDefaultRow(
	value: Record<string, unknown>,
	key: string,
): PayloadPreviewRow {
	return value[key] === undefined
		? row(key, false, { status: 'default', note: 'default-applied' })
		: row(key, value[key]);
}

function queueOperationRows(value: unknown): PayloadPreviewRow[] {
	if (!isRecord(value)) {
		return [row('result', value, { status: 'warning', note: 'invalid-shape' })];
	}
	const type = stringField(value.type);
	const typeRow = QUEUE_CHANGE_TYPES.has(type)
		? row('type', type)
		: row('type', type || '(missing)', {
				status: 'warning',
				note: type ? 'unknown-value' : 'missing-field',
			});
	if (type === 'property') {
		const action = stringField(value.action);
		return [
			typeRow,
			PROPERTY_ACTIONS.has(action)
				? row('action', action)
				: row('action', action || '(missing)', {
						status: 'warning',
						note: action ? 'unknown-value' : 'missing-field',
					}),
			requiredRow(value, 'property'),
			effectivePropertyValueRow(value, action),
			optionalRow(value, 'oldValue'),
			requiredRow(value, 'details'),
			...unknownRows(
				value,
				new Set(['type', 'action', 'property', 'value', 'oldValue', 'details']),
			),
		];
	}
	if (type === 'content_replace') {
		return [
			typeRow,
			requiredRow(value, 'find'),
			requiredRow(value, 'replace'),
			booleanDefaultRow(value, 'isRegex'),
			booleanDefaultRow(value, 'caseSensitive'),
			requiredRow(value, 'details'),
			...unknownRows(
				value,
				new Set([
					'type',
					'find',
					'replace',
					'isRegex',
					'caseSensitive',
					'details',
				]),
			),
		];
	}
	if (type === 'template') {
		return [
			typeRow,
			requiredRow(value, 'templateFileStr'),
			requiredRow(value, 'details'),
			...unknownRows(value, new Set(['type', 'templateFileStr', 'details'])),
		];
	}
	if (type === 'tag') {
		const action = stringField(value.action);
		return [
			typeRow,
			TAG_ACTIONS.has(action)
				? row('action', action)
				: row('action', action || '(missing)', {
						status: 'warning',
						note: action ? 'unknown-value' : 'missing-field',
					}),
			requiredRow(value, 'tag'),
			requiredRow(value, 'details'),
			...unknownRows(value, new Set(['type', 'action', 'tag', 'details'])),
		];
	}
	return [typeRow, ...unknownRows(value, new Set(['type']))];
}

export function buildQueueTemplatePreview(value: unknown): PayloadPreview {
	const template = isRecord(value) ? value : {};
	const name = typeof template.name === 'string' ? template.name : '(unnamed)';
	const validChanges = Array.isArray(template.changes);
	const changes: unknown[] = validChanges
		? (template.changes as unknown[])
		: [];
	const sections: PayloadPreviewSection[] = [
		{
			id: 'overview',
			title: 'Overview',
			rows: [
				row('kind', 'operation-preset'),
				row('name', name),
				validChanges
					? row('operations', changes.length)
					: row('operations', template.changes ?? '(missing)', {
							status: 'warning',
							note: 'invalid-shape',
						}),
				row('target', '(resolved when loaded)', {
					status: 'default',
					note: 'resolved-on-load',
				}),
				...unknownRows(template, new Set(['name', 'changes'])),
			],
		},
		...changes.map((change, index) => ({
			id: `operation:${index + 1}`,
			title: `Operation ${index + 1}`,
			rows: queueOperationRows(change),
		})),
	];
	return finalize('queue', name, sections);
}

function normalizeEffectiveSortBy(sortBy: string): string {
	return normalizeExplorerSortBy(sortBy);
}

function layoutSortRows(
	tab: ExplorerTabId,
	rawValue: unknown,
): PayloadPreviewRow[] {
	const normalizedBase = normalizeExplorerSortState(tab, rawValue);
	const normalized = {
		...normalizedBase,
		...nodeTypeFilterPatch(
			normalizeNodeTypeFilters(
				normalizedBase.nodeTypeFilters ?? normalizedBase.nodeTypeFilter,
			),
		),
	};
	const raw = isRecord(rawValue) ? rawValue : {};
	const rows: PayloadPreviewRow[] = [
		row('sortState.activeScope', normalized.activeScope),
	];
	if ('drillNodeId' in normalized) {
		rows.push(row('sortState.drillNodeId', normalized.drillNodeId));
	}

	for (const scope of SCOPES_BY_TAB[tab]) {
		const savedSort = normalized.sorts[scope];
		const effective = activeScopeSort(tab, normalized, scope);
		const rawScopeSort =
			isRecord(raw.sorts) && isRecord(raw.sorts[scope])
				? raw.sorts[scope]
				: scope === normalized.activeScope && 'sortBy' in raw
					? raw
					: null;
		const rawSortBy = stringField(rawScopeSort?.sortBy);
		const rawDirection = stringField(rawScopeSort?.direction);
		const normalizedSortBy = normalizeEffectiveSortBy(effective.sortBy);
		const allowedSortIds = new Set(
			SORT_MENU_OPTIONS[tab]
				.map((option) => option.id)
				.filter(
					(id) =>
						!(
							tab === 'props' &&
							scope === 'values' &&
							(id === 'type' || id === 'sub')
						),
				),
		);
		const unknownSort =
			Boolean(rawSortBy) &&
			!allowedSortIds.has(normalizeEffectiveSortBy(rawSortBy));
		const effectiveSortBy = unknownSort ? 'name' : normalizedSortBy;
		const migrated =
			Boolean(rawSortBy) && effectiveSortBy !== rawSortBy && !unknownSort;
		const defaulted = savedSort === undefined && rawScopeSort === null;
		const invalidDirection =
			Boolean(rawDirection) &&
			rawDirection !== 'asc' &&
			rawDirection !== 'desc';
		rows.push(
			row(
				`sortState.sorts.${scope}.sortBy`,
				unknownSort ? `${rawSortBy} → ${effectiveSortBy}` : effectiveSortBy,
				{
					...(unknownSort
						? { status: 'warning' as const }
						: migrated || defaulted
							? { status: 'default' as const }
							: {}),
					...(unknownSort
						? { note: 'unknown-value' as const }
						: migrated
							? { note: 'migration-applied' as const }
							: defaulted
								? { note: 'default-applied' as const }
								: {}),
				},
			),
			row(
				`sortState.sorts.${scope}.direction`,
				invalidDirection
					? `${rawDirection} → ${effective.direction}`
					: effective.direction,
				{
					...(invalidDirection
						? {
								status: 'warning' as const,
								note: 'unknown-value' as const,
							}
						: defaulted
							? {
									status: 'default' as const,
									note: 'default-applied' as const,
								}
							: {}),
				},
			),
		);
	}

	rows.push(row('sortState.nodeTypeFilters', normalized.nodeTypeFilters ?? []));
	if (tab === 'files') {
		rows.push(
			row('sortState.parentsFirst', normalized.parentsFirst),
			row('sortState.fixedFolders', normalized.fixedFolders),
		);
	}

	const knownStateKeys = new Set([
		'sorts',
		'activeScope',
		'drillNodeId',
		'nodeTypeFilter',
		'nodeTypeFilters',
		'parentsFirst',
		'fixedFolders',
		'sortBy',
		'direction',
		'childLevel',
	]);
	rows.push(...unknownRows(raw, knownStateKeys, 'sortState.'));
	if (isRecord(raw.sorts)) {
		for (const scope of Object.keys(raw.sorts).sort((a, b) =>
			a.localeCompare(b),
		)) {
			if (!SCOPES_BY_TAB[tab].includes(scope as SortScopeKey)) {
				rows.push(
					row(`sortState.sorts.${scope}`, raw.sorts[scope], {
						status: 'warning',
						note: 'unknown-field',
					}),
				);
				continue;
			}
			const scopeSort = raw.sorts[scope];
			if (isRecord(scopeSort)) {
				rows.push(
					...unknownRows(
						scopeSort,
						new Set(['sortBy', 'direction']),
						`sortState.sorts.${scope}.`,
					),
				);
			}
		}
	}
	return rows;
}

function knownLayoutSection(
	tab: ExplorerTabId,
	value: unknown,
): PayloadPreviewSection {
	if (!value) {
		return {
			id: `layout:${tab}`,
			title: tab,
			rows: [
				row('result', '(current value remains unchanged)', {
					status: 'default',
					note: 'unchanged',
				}),
			],
		};
	}
	if (!isRecord(value)) {
		return {
			id: `layout:${tab}`,
			title: tab,
			rows: [
				row('result', value, {
					status: 'warning',
					note: 'invalid-shape',
				}),
			],
		};
	}

	const rawViewMode = value.viewMode;
	const normalizedViewMode = normalizeExplorerViewMode(rawViewMode, tab);
	const viewMigrated = normalizedViewMode !== rawViewMode;
	const unknownViewMode =
		rawViewMode !== undefined &&
		(typeof rawViewMode !== 'string' || !KNOWN_VIEW_MODES.has(rawViewMode));
	const rows: PayloadPreviewRow[] = [
		row(
			'viewMode',
			unknownViewMode
				? `${formatPayloadPreviewValue(rawViewMode)} → ${normalizedViewMode}`
				: normalizedViewMode,
			{
				...(unknownViewMode
					? { status: 'warning' as const }
					: viewMigrated
						? { status: 'default' as const }
						: {}),
				...(unknownViewMode
					? { note: 'unknown-value' as const }
					: viewMigrated
						? {
								note:
									rawViewMode === undefined
										? ('default-applied' as const)
										: ('migration-applied' as const),
							}
						: {}),
			},
		),
		Array.isArray(value.visibleCells)
			? row('visibleCells', value.visibleCells, {
					...(value.visibleCells.some(
						(cell) =>
							typeof cell !== 'string' || !KNOWN_VISIBLE_CELLS[tab].has(cell),
					)
						? {
								status: 'warning' as const,
								note: 'unknown-value' as const,
							}
						: {}),
				})
			: row('visibleCells', value.visibleCells ?? '(missing)', {
					status: 'warning',
					note: 'invalid-shape',
				}),
	];

	if (CORE_TABS.has(tab)) {
		const interactionMode = normalizeInteractionMode(
			tab,
			typeof value.interactionMode === 'string'
				? value.interactionMode
				: undefined,
		);
		const defaulted = interactionMode !== value.interactionMode;
		const unknownInteraction = value.interactionMode !== undefined && defaulted;
		rows.push(
			row(
				'interactionMode',
				unknownInteraction
					? `${formatPayloadPreviewValue(value.interactionMode)} → ${interactionMode}`
					: interactionMode,
				{
					...(unknownInteraction
						? {
								status: 'warning' as const,
								note: 'unknown-value' as const,
							}
						: defaulted
							? {
									status: 'default' as const,
									note: 'default-applied' as const,
								}
							: {}),
				},
			),
		);
	} else if (value.interactionMode !== undefined) {
		rows.push(
			row('interactionMode', value.interactionMode, {
				status: 'warning',
				note: 'ignored-field',
			}),
		);
	}

	rows.push(
		...layoutSortRows(tab, value.sortState),
		...unknownRows(
			value,
			new Set(['viewMode', 'visibleCells', 'sortState', 'interactionMode']),
		),
	);
	return { id: `layout:${tab}`, title: tab, rows };
}

function floatingTocSection(value: unknown): PayloadPreviewSection {
	if (!isRecord(value)) {
		return {
			id: 'floating-toc',
			title: 'Floating index',
			rows: [
				row('result', '(current value remains unchanged)', {
					status: 'default',
					note: 'unchanged',
				}),
			],
		};
	}
	const enabled = value.enabled === true;
	const kind = value.kind === 'files' ? 'files' : 'folders';
	const migratedKind = kind !== value.kind;
	const unknownKind =
		value.kind !== undefined &&
		value.kind !== 'files' &&
		value.kind !== 'folders';
	return {
		id: 'floating-toc',
		title: 'Floating index',
		rows: [
			row('enabled', enabled, {
				...(value.enabled === undefined
					? {
							status: 'default' as const,
							note: 'default-applied' as const,
						}
					: {}),
			}),
			row(
				'kind',
				unknownKind
					? `${formatPayloadPreviewValue(value.kind)} → ${kind}`
					: kind,
				{
					...(unknownKind
						? {
								status: 'warning' as const,
								note: 'unknown-value' as const,
							}
						: migratedKind
							? {
									status: 'default' as const,
									note: 'migration-applied' as const,
								}
							: {}),
				},
			),
			row('rootId', value.rootId || null, {
				...(value.rootId === undefined
					? {
							status: 'default' as const,
							note: 'default-applied' as const,
						}
					: {}),
			}),
			...unknownRows(value, new Set(['enabled', 'kind', 'rootId'])),
		],
	};
}

export function buildSavedLayoutPreview(value: unknown): PayloadPreview {
	const layout = isRecord(value) ? value : {};
	const name = typeof layout.name === 'string' ? layout.name : '(unnamed)';
	const validConfig = isRecord(layout.config);
	const config: Record<string, unknown> = validConfig
		? (layout.config as Record<string, unknown>)
		: {};
	const sections: PayloadPreviewSection[] = [
		{
			id: 'overview',
			title: 'Overview',
			rows: [
				row('kind', 'view-config'),
				row('name', name),
				row('summary', layout.summary),
				...(validConfig
					? []
					: [
							row('config', layout.config ?? '(missing)', {
								status: 'warning',
								note: 'invalid-shape',
							}),
						]),
				...unknownRows(
					layout,
					new Set(['name', 'summary', 'config', 'floatingToc']),
				),
			],
		},
		floatingTocSection(layout.floatingToc),
		...LAYOUT_TABS.map((tab) => knownLayoutSection(tab, config[tab])),
	];

	const knownTabs = new Set<string>(LAYOUT_TABS);
	for (const tab of Object.keys(config)
		.filter((key) => !knownTabs.has(key))
		.sort((left, right) => left.localeCompare(right))) {
		const tabValue = isRecord(config[tab])
			? config[tab]
			: { value: config[tab] };
		sections.push({
			id: `layout:${tab}`,
			title: tab,
			rows: unknownRows(tabValue, new Set()),
		});
	}

	return finalize('layout', name, sections);
}
