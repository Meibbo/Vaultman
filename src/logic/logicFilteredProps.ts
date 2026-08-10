import type { PropMeta, TreeNode } from '../types/typeTree';

/**
 * `Filtered` narrows the Props explorer to what the active filter leaves
 * standing: only the properties and values the surviving files actually carry,
 * counted over that set rather than over the vault.
 *
 * Like reveal, it is a **projection filter over the index that already exists**,
 * not a second index. The vault-wide property index keeps its own lifecycle;
 * this module never scans the vault and never rebuilds anything. It takes the
 * snapshot and the surviving files' frontmatter in, and returns nodes out.
 *
 * "Global" is this being off. There is no separate global projection to build,
 * which is why the switch has no counterpart: off simply means the snapshot
 * passes through untouched.
 *
 * Node identity is preserved on purpose. A property that survives the filter
 * keeps its ID, so selection, expansion, badges and pending operations survive
 * toggling the switch in both directions.
 */

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

interface FilteredTally {
	/** How many of the surviving files carry the property. */
	files: number;
	/** How often each value occurs across them. */
	values: Map<string, number>;
}

function tally(
	frontmatters: readonly (Record<string, unknown> | null | undefined)[],
): Map<string, FilteredTally> {
	const byProperty = new Map<string, FilteredTally>();

	for (const frontmatter of frontmatters) {
		if (!frontmatter) continue;
		for (const [propName, raw] of Object.entries(frontmatter)) {
			if (NOT_A_PROPERTY.has(propName)) continue;

			let entry = byProperty.get(propName);
			if (!entry) {
				entry = { files: 0, values: new Map() };
				byProperty.set(propName, entry);
			}
			// One file counts once for the property however many values it holds,
			// which is what the vault-wide count means too.
			entry.files += 1;
			for (const rawValue of valuesOf(raw)) {
				entry.values.set(rawValue, (entry.values.get(rawValue) ?? 0) + 1);
			}
		}
	}

	return byProperty;
}

function valueNode(
	source: TreeNode<PropMeta> | undefined,
	propName: string,
	propType: string,
	rawValue: string,
	count: number,
): TreeNode<PropMeta> {
	const existing = source?.children?.find(
		(child) => child.meta.rawValue === rawValue,
	);
	// Reuse the vault-wide node when there is one, so the ID, the badges and
	// every other projected fact come from one place — only the count is the
	// filtered set's own.
	if (existing) return { ...existing, count };

	return {
		id: `${propName}::${rawValue}`,
		label: rawValue === '' ? 'empty' : rawValue,
		count,
		depth: 1,
		coreCls: 'tree-item-self tappable is-clickable',
		children: [],
		meta: { propName, propType, isValueNode: true, rawValue },
	};
}

/**
 * The properties and values the surviving files carry, in the snapshot's own
 * order — the vault-wide order, narrowed. Unlike reveal there is no single note
 * whose order could stand in for it, so the ordering the user already sees is
 * the one that stays.
 *
 * An empty file set produces the canonical empty state rather than falling back
 * to the vault-wide set: showing properties no surviving file has, while
 * claiming to show the filter's result, is worse than showing nothing.
 */
export function projectFilteredProps(
	snapshot: readonly TreeNode<PropMeta>[],
	frontmatters: readonly (Record<string, unknown> | null | undefined)[],
): TreeNode<PropMeta>[] {
	const byProperty = tally(frontmatters);
	if (byProperty.size === 0) return [];

	const nodes: TreeNode<PropMeta>[] = [];
	const seen = new Set<string>();

	for (const node of snapshot) {
		if (node.meta.isValueNode) continue;
		const propName = node.meta.propName;
		const entry = byProperty.get(propName);
		if (!entry) continue;

		seen.add(propName);
		const propType = node.meta.propType;
		const children = [...entry.values.entries()].map(([rawValue, count]) =>
			valueNode(node, propName, propType, rawValue, count),
		);
		nodes.push({ ...node, children, count: entry.files });
	}

	// A property the surviving files carry that the snapshot has not seen yet:
	// the metadata cache can lag a just-typed key, and dropping it would make
	// the filter look like it excluded a file it kept.
	for (const [propName, entry] of byProperty) {
		if (seen.has(propName)) continue;
		const children = [...entry.values.entries()].map(([rawValue, count]) =>
			valueNode(undefined, propName, 'text', rawValue, count),
		);
		nodes.push({
			id: propName,
			label: propName,
			count: entry.files,
			depth: 0,
			coreCls: 'tree-item-self tappable is-clickable',
			children,
			meta: { propName, propType: 'text', isValueNode: false },
		});
	}

	return nodes;
}
