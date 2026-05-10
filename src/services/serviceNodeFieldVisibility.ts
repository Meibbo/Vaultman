import type { VaultmanSettings } from '../types/typeSettings';
import type { ExplorerViewMode } from '../types/typeViews';

export type NodeFieldId =
	| 'icon'
	| 'text'
	| 'count'
	| 'files'
	| 'nested'
	| 'date'
	| 'type'
	| 'values'
	| 'name'
	| 'ext'
	| 'tags'
	| 'path'
	| 'size';

export interface NodeFieldDefinition {
	id: NodeFieldId;
	labelKey: string;
	defaultOn: boolean;
	identity?: boolean;
}

export interface FieldVisibilityHost {
	settings: VaultmanSettings;
	saveSettings(): Promise<void>;
}

const COMMON_TAG_FIELDS: readonly NodeFieldDefinition[] = [
	{ id: 'icon', labelKey: 'viewmode.pill.icon', defaultOn: true, identity: true },
	{ id: 'text', labelKey: 'viewmode.pill.text', defaultOn: true, identity: true },
	{ id: 'count', labelKey: 'viewmode.pill.count', defaultOn: true },
	{ id: 'files', labelKey: 'viewmode.pill.files', defaultOn: false },
	{ id: 'nested', labelKey: 'viewmode.pill.nested', defaultOn: false },
	{ id: 'date', labelKey: 'viewmode.pill.date', defaultOn: false },
];

const COMMON_PROP_FIELDS: readonly NodeFieldDefinition[] = [
	{ id: 'icon', labelKey: 'viewmode.pill.icon', defaultOn: true, identity: true },
	{ id: 'text', labelKey: 'viewmode.pill.text', defaultOn: true, identity: true },
	{ id: 'count', labelKey: 'viewmode.pill.count', defaultOn: true },
	{ id: 'type', labelKey: 'viewmode.pill.type', defaultOn: false },
	{ id: 'values', labelKey: 'viewmode.pill.values', defaultOn: false },
	{ id: 'date', labelKey: 'viewmode.pill.date', defaultOn: false },
];

const FILE_CARD_FIELDS: readonly NodeFieldDefinition[] = [
	{ id: 'icon', labelKey: 'viewmode.pill.icon', defaultOn: true, identity: true },
	{ id: 'name', labelKey: 'viewmode.pill.name', defaultOn: true, identity: true },
	{ id: 'date', labelKey: 'viewmode.pill.date', defaultOn: true },
	{ id: 'tags', labelKey: 'viewmode.pill.tags', defaultOn: false },
	{ id: 'path', labelKey: 'viewmode.pill.path', defaultOn: false },
	{ id: 'size', labelKey: 'viewmode.pill.size', defaultOn: false },
];

const FILE_TREE_FIELDS: readonly NodeFieldDefinition[] = [
	{ id: 'name', labelKey: 'viewmode.pill.name', defaultOn: true, identity: true },
	{ id: 'ext', labelKey: 'viewmode.pill.ext', defaultOn: true },
	{ id: 'date', labelKey: 'viewmode.pill.date', defaultOn: false },
	{ id: 'tags', labelKey: 'viewmode.pill.tags', defaultOn: false },
	{ id: 'path', labelKey: 'viewmode.pill.path', defaultOn: false },
];

const CONTENT_FIELDS: readonly NodeFieldDefinition[] = [
	{ id: 'path', labelKey: 'viewmode.pill.path', defaultOn: true, identity: true },
	{ id: 'text', labelKey: 'viewmode.pill.text', defaultOn: true, identity: true },
	{ id: 'date', labelKey: 'viewmode.pill.date', defaultOn: false },
];

export function fieldVisibilityKey(providerId: string, viewMode: ExplorerViewMode): string {
	return `${providerId}:${viewMode}`;
}

export function fieldDefinitionsFor(
	providerId: string,
	viewMode: ExplorerViewMode,
): readonly NodeFieldDefinition[] {
	if (providerId === 'files') return viewMode === 'tree' ? FILE_TREE_FIELDS : FILE_CARD_FIELDS;
	if (providerId === 'tags') return COMMON_TAG_FIELDS;
	if (providerId === 'props') return COMMON_PROP_FIELDS;
	if (providerId === 'content') return CONTENT_FIELDS;
	return COMMON_TAG_FIELDS;
}

export function defaultVisibleFields(providerId: string, viewMode: ExplorerViewMode): string[] {
	return fieldDefinitionsFor(providerId, viewMode)
		.filter((field) => field.defaultOn)
		.map((field) => field.id);
}

export function normalizeVisibleFields(
	providerId: string,
	viewMode: ExplorerViewMode,
	raw: readonly string[] | undefined,
): string[] {
	const definitions = fieldDefinitionsFor(providerId, viewMode);
	const allowed = new Set(definitions.map((field) => field.id));
	const requested = raw === undefined ? defaultVisibleFields(providerId, viewMode) : raw;
	const requestedSet = new Set(requested.filter((id) => allowed.has(id as NodeFieldId)));
	const identity = definitions.filter((field) => field.identity);
	if (identity.length > 0 && !identity.some((field) => requestedSet.has(field.id))) {
		const fallback = identity.find((field) => field.defaultOn) ?? identity[0];
		requestedSet.add(fallback.id);
	}
	return definitions.filter((field) => requestedSet.has(field.id)).map((field) => field.id);
}

export function visibleFieldsFromSettings(
	settings: VaultmanSettings,
	providerId: string,
	viewMode: ExplorerViewMode,
): string[] {
	return normalizeVisibleFields(
		providerId,
		viewMode,
		settings.viewFieldVisibility?.[fieldVisibilityKey(providerId, viewMode)],
	);
}

export function toggleVisibleField(
	providerId: string,
	viewMode: ExplorerViewMode,
	current: readonly string[],
	fieldId: string,
): string[] {
	const next = new Set(current);
	if (next.has(fieldId)) next.delete(fieldId);
	else next.add(fieldId);
	return normalizeVisibleFields(providerId, viewMode, [...next]);
}

export async function setVisibleFieldsForSettings(
	host: FieldVisibilityHost,
	providerId: string,
	viewMode: ExplorerViewMode,
	fields: readonly string[],
): Promise<string[]> {
	const normalized = normalizeVisibleFields(providerId, viewMode, fields);
	host.settings.viewFieldVisibility = {
		...host.settings.viewFieldVisibility,
		[fieldVisibilityKey(providerId, viewMode)]: normalized,
	};
	await host.saveSettings();
	return normalized;
}
