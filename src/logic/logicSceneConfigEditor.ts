import type { SceneConfig, SceneDefinitionId } from '../types/typeInstance';
import type { ExplorerTabId, ExplorerViewMode } from '../types/typeUI';
import {
	interactionModesForTab,
} from './logicInteractionMode';
import {
	normalizeVisibleCellIds,
} from './logicCellRegistry';
import { normalizeExplorerSortState } from './logicScopedSort';
import { selectableViewModesForDataSurface } from './logicExplorerViewModes';
import {
	GROUP_PRESETS_BY_TAB,
	ALL_GROUP_PRESET_KINDS,
	normalizeGroupPreset,
	normalizeCounterRanges,
	type GroupPresetKind,
} from '../types/typeGroupPreset';
import {
	isNativeCompatMode,
	NATIVE_COMPAT_BOUNDARIES,
	normalizeNativeCompatPolicy,
} from './logicNativeTreeCompat';
import {
	isTextCaseOption,
	normalizeTextCaseMap,
	type TextCaseOption,
} from './logicTextCaseProjection';
import { parseMembershipUrn } from './logicMembershipUrn';

export type SceneConfigEditableField = keyof SceneConfig;
export type SceneConfigEditorKind = 'boolean' | 'enum' | 'string-list' | 'json';

const BOOLEAN_FIELDS = new Set<SceneConfigEditableField>([
	'stickyRows',
	'compactFolders',
	'indent',
	'tooltips',
]);

const STRING_LIST_FIELDS = new Set<SceneConfigEditableField>([
	'visibleCells',
	'hiddenGroupIds',
	'hiddenToolbarNodes',
	'toolbarCommandActions',
	'toolbarNodeOrder',
]);

const JSON_FIELDS = new Set<SceneConfigEditableField>([
	'sortState',
	'groupPreset',
	'toolbarNodeIcons',
	'toolbarNodeLabels',
	'groupMemberships',
	'textCase',
	'nativeCompat',
]);

const CONFIG_FIELDS: readonly SceneConfigEditableField[] = [
	'viewMode',
	'interactionMode',
	'visibleCells',
	'taskCellDisplayMode',
	'sortState',
	'stickyRows',
	'compactFolders',
	'indent',
	'tooltips',
	'groupPreset',
	'hiddenGroupIds',
	'sceneLabelMode',
	'autoRevealMode',
	'hiddenToolbarNodes',
	'toolbarNodeIcons',
	'toolbarNodeLabels',
	'toolbarCommandActions',
	'createActionsPlacement',
	'toolbarNodeOrder',
	'groupMemberships',
	'showOptionsOverride',
	'textCase',
	'nativeCompat',
];

export function sceneConfigEditableFields(): readonly SceneConfigEditableField[] {
	return CONFIG_FIELDS;
}

export function sceneConfigEditorKind(
	field: SceneConfigEditableField,
): SceneConfigEditorKind {
	if (BOOLEAN_FIELDS.has(field)) return 'boolean';
	if (STRING_LIST_FIELDS.has(field)) return 'string-list';
	if (JSON_FIELDS.has(field)) return 'json';
	return 'enum';
}

export function sceneConfigEditorOptions(
	field: SceneConfigEditableField,
	tab?: SceneDefinitionId,
): readonly string[] {
	switch (field) {
		case 'viewMode': {
			if (!tab) return ['tree', 'table', 'dnd', 'grid', 'cards'];
			return [...selectableViewModesForDataSurface(tab)];
		}
		case 'interactionMode': {
			if (!tab) return ['open', 'filter', 'add', 'select', 'input'];
			return interactionModesForTab(tab);
		}
		case 'taskCellDisplayMode':
			return ['auto', 'pending', 'done-total'];
		case 'sceneLabelMode':
		case 'autoRevealMode':
			return ['auto', 'on', 'off'];
		case 'createActionsPlacement':
			return ['auto', 'searchbox', 'toolbar'];
		case 'showOptionsOverride':
			return ['inherit', 'show', 'plugins-only'];
		default:
			return [];
	}
}

export type SceneConfigInputResult =
	| { ok: true; value: unknown }
	| { ok: false; reason: 'invalid-json' | 'incompatible-value' };

/**
 * Validate values against the live SceneConfig contracts before the modal is
 * allowed to write them. For scene-local values the tab's own cell, view-mode,
 * interaction, and grouping capabilities are authoritative.
 */
export function validateSceneConfigInput(
	field: SceneConfigEditableField,
	value: unknown,
	tab?: SceneDefinitionId,
	viewMode?: ExplorerViewMode,
): SceneConfigInputResult {
	const options = sceneConfigEditorOptions(field, tab);
	if (options.length > 0) {
		return options.includes(String(value))
			? { ok: true, value }
			: { ok: false, reason: 'incompatible-value' };
	}

	if (BOOLEAN_FIELDS.has(field)) {
		return typeof value === 'boolean'
			? { ok: true, value }
			: { ok: false, reason: 'incompatible-value' };
	}

	if (STRING_LIST_FIELDS.has(field)) {
		if (!isStringArray(value)) return { ok: false, reason: 'incompatible-value' };
		if (field === 'visibleCells' && tab) {
			const normalized = normalizeVisibleCellIds(
				tab,
				value,
				viewMode,
			);
			if (!sameJson(normalized, value)) {
				return { ok: false, reason: 'incompatible-value' };
			}
		}
		return { ok: true, value: [...value] };
	}

	if (!isRecord(value)) return { ok: false, reason: 'incompatible-value' };
	switch (field) {
		case 'sortState': {
			const sortTab = (tab ?? 'files');
			if (!hasOnlyKeys(value, [
				'sorts', 'scopeState', 'activeScope', 'drillNodeId', 'hiddenScopes',
				'nodeTypeFilter', 'nodeTypeFilters', 'parentsFirst', 'addPropertyFirst',
				'fixedFolders', 'filtered', 'revealAnchor', 'revealAnchorPath',
			])) return { ok: false, reason: 'incompatible-value' };
			const normalized = normalizeExplorerSortState(sortTab, value);
			return sameJson(normalized, value)
				? { ok: true, value: normalized }
				: { ok: false, reason: 'incompatible-value' };
		}
		case 'groupPreset': {
			const groupTab = (tab ?? 'files');
			if (!hasOnlyKeys(value, [
				'kind', 'direction', 'counterRanges', 'partitionPresentation',
			])) return { ok: false, reason: 'incompatible-value' };
			if (typeof value.kind !== 'string' || !ALL_GROUP_PRESET_KINDS.includes(value.kind as GroupPresetKind)) {
				return { ok: false, reason: 'incompatible-value' };
			}
			const availableKinds: readonly string[] = tab
				? GROUP_PRESETS_BY_TAB[groupTab]
				: ALL_GROUP_PRESET_KINDS;
			if (
				!availableKinds.includes(value.kind) &&
				!(value.kind === 'note' && (groupTab === 'props' || groupTab === 'tags'))
			) return { ok: false, reason: 'incompatible-value' };
			if (value.direction !== 'asc' && value.direction !== 'desc') {
				return { ok: false, reason: 'incompatible-value' };
			}
			if (
				value.partitionPresentation !== undefined &&
				value.partitionPresentation !== 'name-range' &&
				value.partitionPresentation !== 'name-only'
			) return { ok: false, reason: 'incompatible-value' };
			if (value.counterRanges !== undefined) {
				const ranges = normalizeCounterRanges(value.kind as GroupPresetKind, value.counterRanges);
				if (!ranges || !sameJson(ranges, value.counterRanges)) {
					return { ok: false, reason: 'incompatible-value' };
				}
			}
			const normalized = normalizeGroupPreset(groupTab, value, value.kind === 'note');
			return sameJson(normalized, value)
				? { ok: true, value: normalized }
				: { ok: false, reason: 'incompatible-value' };
		}
		case 'toolbarNodeIcons':
			return Object.entries(value).every(([key, icon]) => key.length > 0 && typeof icon === 'string' && icon.length > 0)
				? { ok: true, value: { ...value } }
				: { ok: false, reason: 'incompatible-value' };
		case 'toolbarNodeLabels':
			return Object.entries(value).every(([key, mode]) => key.length > 0 && (mode === 'on' || mode === 'off'))
				? { ok: true, value: { ...value } }
				: { ok: false, reason: 'incompatible-value' };
		case 'groupMemberships':
			return Object.entries(value).every(([groupId, urns]) =>
				groupId.length > 0 && isStringArray(urns) && urns.every((urn) => parseMembershipUrn(urn) !== null),
			)
				? { ok: true, value: Object.fromEntries(Object.entries(value).map(([id, urns]) => [id, [...(urns as string[])]])) }
				: { ok: false, reason: 'incompatible-value' };
		case 'textCase':
			return Object.entries(value).every(([cell, mode]) => cell.length > 0 && isTextCaseOption(mode)) &&
				sameJson(normalizeTextCaseMap(value), value)
				? { ok: true, value: { ...value } }
				: { ok: false, reason: 'incompatible-value' };
		case 'nativeCompat':
			return Object.entries(value).every(([boundary, mode]) =>
				NATIVE_COMPAT_BOUNDARIES.includes(boundary as (typeof NATIVE_COMPAT_BOUNDARIES)[number]) && isNativeCompatMode(mode),
			) && sameJson(normalizeNativeCompatPolicy(value), value)
				? { ok: true, value: { ...value } }
				: { ok: false, reason: 'incompatible-value' };
		default:
			return { ok: false, reason: 'incompatible-value' };
	}
}

export function parseSceneConfigEditorInput(
	field: SceneConfigEditableField,
	input: string,
	tab?: SceneDefinitionId,
	viewMode?: ExplorerViewMode,
): SceneConfigInputResult {
	const kind = sceneConfigEditorKind(field);
	if (kind === 'boolean') {
		return input === 'true' || input === 'false'
			? validateSceneConfigInput(field, input === 'true', tab, viewMode)
			: { ok: false, reason: 'incompatible-value' };
	}
	if (kind === 'enum') return validateSceneConfigInput(field, input, tab, viewMode);
	let parsed: unknown;
	try {
		parsed = JSON.parse(input);
	} catch {
		return { ok: false, reason: 'invalid-json' };
	}
	return validateSceneConfigInput(field, parsed, tab, viewMode);
}

export function applySceneConfigPath(
	config: SceneConfig,
	path: readonly string[],
	value: unknown,
): SceneConfig {
	if (path.length === 0) return config;
	const root = cloneJsonRecord(config as Record<string, unknown>);
	let cursor = root;
	for (const key of path.slice(0, -1)) {
		const child = cursor[key];
		if (!isRecord(child)) cursor[key] = {};
		cursor = cursor[key] as Record<string, unknown>;
	}
	const leaf = path[path.length - 1];
	if (value === undefined) delete cursor[leaf];
	else cursor[leaf] = cloneJsonValue(value);
	for (let index = path.length - 2; index >= 0; index -= 1) {
		const key = path[index];
		const child = cursorAt(root, path.slice(0, index + 1));
		if (isRecord(child) && Object.keys(child).length === 0) {
			const parent = cursorAt(root, path.slice(0, index));
			if (parent) delete parent[key];
		}
	}
	return root;
}

export function formatSceneConfigFieldLabel(field: string): string {
	return field
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replace(/^./, (first) => first.toLocaleUpperCase());
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
	const allowed = new Set(keys);
	return Object.keys(value).every((key) => allowed.has(key));
}

function cloneJsonValue(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(cloneJsonValue);
	if (!isRecord(value)) return value;
	return cloneJsonRecord(value);
}

function cloneJsonRecord(value: Record<string, unknown>): Record<string, unknown> {
	return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, cloneJsonValue(child)]));
}

function cursorAt(
	root: Record<string, unknown>,
	path: readonly string[],
): Record<string, unknown> | null {
	let cursor = root;
	for (const key of path) {
		const child = cursor[key];
		if (!isRecord(child)) return null;
		cursor = child;
	}
	return cursor;
}

function sameJson(left: unknown, right: unknown): boolean {
	return stableJson(left) === stableJson(right);
}

function stableJson(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
	if (!isRecord(value)) return JSON.stringify(value);
	const entries = Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`);
	return `{${entries.join(',')}}`;
}
