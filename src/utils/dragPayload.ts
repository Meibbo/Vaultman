import type { FilterGroup, FilterNode } from '../types/typeFilter';

export type VaultmanDragNodePayload =
	| { kind: 'file'; path: string }
	| { kind: 'folder'; path: string }
	| { kind: 'tag'; tagPath: string }
	| { kind: 'property'; property: string }
	| {
			kind: 'property-value';
			property: string;
			value: string;
			mode: 'property-value' | 'value-only';
	  };

export type VaultmanDragPayload = VaultmanDragNodePayload & {
	selection?: VaultmanDragNodePayload[];
};

export const VAULTMAN_DRAG_MIME = 'application/x-vaultman-node';

export function setVaultmanDragPayload(
	event: DragEvent,
	payload: VaultmanDragPayload,
): void {
	if (!event.dataTransfer) return;
	event.dataTransfer.effectAllowed = 'copyMove';
	event.dataTransfer.setData(VAULTMAN_DRAG_MIME, JSON.stringify(payload));
	event.dataTransfer.setData('text/plain', fallbackText(payload));
}

export function readVaultmanDragPayload(
	event: DragEvent,
): VaultmanDragPayload | null {
	const raw = event.dataTransfer?.getData(VAULTMAN_DRAG_MIME);
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw) as VaultmanDragPayload;
		return isVaultmanDragPayload(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

function fallbackText(payload: VaultmanDragPayload): string {
	if (payload.kind === 'file') return wikilinkForPath(payload.path);
	if (payload.kind === 'folder') return payload.path;
	if (payload.kind === 'tag') return `#${payload.tagPath}`;
	if (payload.kind === 'property') return '';
	return '';
}

function wikilinkForPath(path: string): string {
	const withoutMarkdown = path.replace(/\.md$/i, '');
	return `[[${withoutMarkdown}]]`;
}

export function activeFilterDragSelection(
	filter: FilterGroup,
	surface: 'files' | 'props' | 'tags',
): VaultmanDragNodePayload[] {
	const selection: VaultmanDragNodePayload[] = [];
	const walk = (node: FilterNode): void => {
		if (node.enabled === false) return;
		if (node.type === 'group') {
			for (const child of node.children) walk(child);
			return;
		}
		if (surface === 'tags' && node.filterType === 'has_tag') {
			const tagPath = (node.values[0] ?? '').replace(/^#/, '');
			if (tagPath) selection.push({ kind: 'tag', tagPath });
			return;
		}
		if (surface === 'props') {
			if (node.filterType === 'has_property' && node.property) {
				selection.push({ kind: 'property', property: node.property });
				return;
			}
			if (
				(node.filterType === 'specific_value' ||
					node.filterType === 'multiple_values') &&
				node.property
			) {
				for (const value of node.values) {
					selection.push({
						kind: 'property-value',
						property: node.property,
						value,
						mode: 'property-value',
					});
				}
				return;
			}
		}
		if (
			surface === 'files' &&
			(node.filterType === 'folder' || node.filterType === 'file_folder')
		) {
			const path = node.values[0] ?? '';
			if (path) selection.push({ kind: 'folder', path });
		}
	};
	walk(filter);
	return selection;
}

export function withActiveFilterDragSelection(
	payload: VaultmanDragNodePayload,
	filter: FilterGroup,
	surface: 'files' | 'props' | 'tags',
): VaultmanDragPayload {
	const selection = activeFilterDragSelection(filter, surface);
	if (
		selection.length <= 1 ||
		!selection.some((selected) => sameDragNode(selected, payload))
	) {
		return payload;
	}
	return { ...payload, selection };
}

function sameDragNode(
	left: VaultmanDragNodePayload,
	right: VaultmanDragNodePayload,
): boolean {
	if (left.kind !== right.kind) return false;
	if (left.kind === 'file' && right.kind === 'file')
		return left.path === right.path;
	if (left.kind === 'folder' && right.kind === 'folder')
		return left.path === right.path;
	if (left.kind === 'tag' && right.kind === 'tag')
		return left.tagPath === right.tagPath;
	if (left.kind === 'property' && right.kind === 'property')
		return left.property === right.property;
	if (left.kind === 'property-value' && right.kind === 'property-value') {
		return left.property === right.property && left.value === right.value;
	}
	return false;
}

function isVaultmanDragPayload(value: unknown): value is VaultmanDragPayload {
	if (!value || typeof value !== 'object') return false;
	const record = value as Partial<VaultmanDragPayload>;
	if (record.kind === 'file' || record.kind === 'folder')
		return typeof record.path === 'string';
	if (record.kind === 'tag') return typeof record.tagPath === 'string';
	if (record.kind === 'property') return typeof record.property === 'string';
	if (record.kind === 'property-value') {
		return (
			typeof record.property === 'string' &&
			typeof record.value === 'string' &&
			(record.mode === 'property-value' || record.mode === 'value-only')
		);
	}
	return false;
}
