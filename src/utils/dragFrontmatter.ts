import type {
	VaultmanDragNodePayload,
	VaultmanDragPayload,
} from './dragPayload';

export function propertyDragNodes(
	payload: VaultmanDragPayload,
): VaultmanDragNodePayload[] {
	const nodes = payload.selection?.length ? payload.selection : [payload];
	return nodes.filter(
		(node) => node.kind === 'property' || node.kind === 'property-value',
	);
}

export function applyPropertyDragNodesToFrontmatter(
	frontmatter: Record<string, unknown>,
	nodes: VaultmanDragNodePayload[],
): boolean {
	let changed = false;
	for (const node of nodes) {
		if (node.kind === 'property') {
			if (!(node.property in frontmatter)) {
				frontmatter[node.property] = '';
				changed = true;
			}
			continue;
		}
		if (node.kind !== 'property-value') continue;
		if (applyValue(frontmatter, node.property, node.value)) {
			changed = true;
		}
	}
	return changed;
}

function applyValue(
	frontmatter: Record<string, unknown>,
	property: string,
	value: string,
): boolean {
	const current = frontmatter[property];
	if (current === undefined || current === null || current === '') {
		frontmatter[property] = value;
		return true;
	}
	if (Array.isArray(current)) {
		const currentList: unknown[] = current;
		if (currentList.some((item) => scalarEquals(item, value))) return false;
		frontmatter[property] = [...currentList, value];
		return true;
	}
	if (scalarEquals(current, value)) return false;
	frontmatter[property] = [current, value];
	return true;
}

function scalarEquals(current: unknown, value: string): boolean {
	if (
		typeof current === 'string' ||
		typeof current === 'number' ||
		typeof current === 'boolean'
	) {
		return String(current) === value;
	}
	return false;
}
