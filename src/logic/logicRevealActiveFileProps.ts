import type { PropMeta, TreeNode } from '../types/typeTree';

/**
 * `reveal this file` narrows the Props explorer to the active file's own
 * properties. It is a **projection filter over the index that already exists**,
 * not a second explorer and not a second index.
 *
 * That is the cost contract the developer asked for: reverting the toggle costs
 * nothing because nothing was torn down. The vault-wide property index keeps its
 * own lifecycle; this module never reads the vault, never sweeps the metadata
 * cache and never rebuilds anything. It takes the snapshot in and returns nodes
 * out.
 *
 * Node identity is preserved on purpose. A property present in both projections
 * keeps its ID, so selection, expansion, badges and pending operations survive
 * the toggle in both directions.
 */

/**
 * Entry points that would rebuild the vault-wide index. Named explicitly so the
 * guard fails loudly if one is ever added to the toggle path, rather than
 * silently turning a filter into a scan.
 */
export const REVEAL_FORBIDDEN_REBUILD_SYMBOLS: readonly string[] = [
	'_buildTree',
	'getAllPropertyInfos',
	'getMarkdownFiles',
	'servicePropertyIndex',
	'logic.invalidate',
];

/** Obsidian injects `position` into frontmatter; it is not a property. */
const NOT_A_PROPERTY = new Set(['position']);

/**
 * The text a value node shows. A nested map is serialized rather than
 * stringified, because `[object Object]` is not the value the user wrote and
 * would never match the ID the vault-wide projection built.
 */
function textOf(value: unknown): string {
	if (value == null) return '';
	if (typeof value === 'object') return JSON.stringify(value) ?? '';
	return `${value as string | number | boolean}`;
}

function valuesOf(raw: unknown): string[] {
	if (Array.isArray(raw)) {
		const items: unknown[] = raw;
		return items.length > 0 ? items.map(textOf) : [''];
	}
	return [textOf(raw)];
}

function valueNode(
	source: TreeNode<PropMeta> | undefined,
	propName: string,
	propType: string,
	rawValue: string,
): TreeNode<PropMeta> {
	const existing = source?.children?.find(
		(child) => child.meta.rawValue === rawValue,
	);
	// Reuse the vault-wide node when there is one, so the ID, the badges and
	// every other projected fact come from one place.
	if (existing) return existing;

	return {
		id: `${propName}::${rawValue}`,
		label: rawValue === '' ? 'empty' : rawValue,
		count: 1,
		depth: 1,
		coreCls: 'tree-item-self tappable is-clickable',
		children: [],
		meta: { propName, propType, isValueNode: true, rawValue },
	};
}

/**
 * The active file's properties as node_props and node_values, in the order the
 * file's frontmatter declares them.
 *
 * `frontmatter` is `null` when there is no active file. Both that and an empty
 * frontmatter produce the canonical empty state rather than falling back to the
 * vault-wide set: showing properties the file does not have, while claiming to
 * show the file, is worse than showing nothing.
 */
export function projectActiveFileProps(
	snapshot: readonly TreeNode<PropMeta>[],
	frontmatter: Record<string, unknown> | null,
): TreeNode<PropMeta>[] {
	if (!frontmatter) return [];

	const byProperty = new Map(snapshot.map((node) => [node.meta.propName, node]));
	const nodes: TreeNode<PropMeta>[] = [];

	for (const [propName, raw] of Object.entries(frontmatter)) {
		if (NOT_A_PROPERTY.has(propName)) continue;

		const source = byProperty.get(propName);
		const propType = source?.meta.propType ?? 'text';
		const children = valuesOf(raw).map((rawValue) =>
			valueNode(source, propName, propType, rawValue),
		);

		nodes.push({
			id: source?.id ?? propName,
			label: source?.label ?? propName,
			// The count is this file's values, not the vault's. The vault-wide
			// `count` Cell resolves unavailable in reveal for the same reason.
			count: children.length,
			depth: 0,
			coreCls: source?.coreCls ?? 'tree-item-self tappable is-clickable',
			children,
			meta: source?.meta ?? { propName, propType, isValueNode: false },
		});
	}

	return nodes;
}
