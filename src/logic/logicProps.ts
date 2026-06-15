/**
 * logicProps — PURE props-domain logic (Q4 lane A, slice 2).
 *
 * Projection / value-sort / type-incompatibility for the Props explorer.
 * ZERO `obsidian`, DOM, or Svelte imports (spec AC#1). The provider is the only
 * place that touches `app`/`metadataCache`; it reads `getAllPropertyInfos()` and
 * passes the resulting `Record<prop, type>` (`propTypeByName`) into `buildPropTree`,
 * and supplies the plain `PropTreeSource[]` (the `PropNode` rows of `IPropsIndex`).
 *
 * Namespaced ids (D6): prop nodes -> `note.<prop>`, value nodes ->
 * `note.<prop>::<rawValue>`. The RAW prop name and value are preserved in
 * `meta.propName` / `meta.rawValue` (and re-derived as the snapshot `domainKey`)
 * so filter toggles and reveal keep keying off raw, un-namespaced values.
 *
 * Honest casing (ledger C-3 parity): prop keys are looked up case-sensitively
 * against `propTypeByName`; there is NO lowercase merge of distinct keys.
 */
import type { TreeNode } from '../types/typeTreeNode';

/** Structural meta carried by prop/value nodes (compatible with `PropMeta`). */
export interface PropNodeMeta {
	propName: string;
	propType: string;
	isValueNode: boolean;
	rawValue?: string;
	isTypeIncompatible?: boolean;
}

/**
 * App-free description of one property the provider supplies — the `PropNode`
 * shape of `IPropsIndex`, narrowed to exactly what the pure builder reads.
 */
export interface PropTreeSource {
	property: string;
	valueFrequencies: Record<string, number>;
	fileCount: number;
}

export const PROP_ID_PREFIX = 'note.';
const VALUE_ID_SEP = '::';
const DEFAULT_PROP_TYPE = 'text';

export function propNodeId(propName: string): string {
	return `${PROP_ID_PREFIX}${propName}`;
}

export function propValueNodeId(propName: string, rawValue: string): string {
	return `${PROP_ID_PREFIX}${propName}${VALUE_ID_SEP}${rawValue}`;
}

/** Raw (un-namespaced) domain key used by the snapshot for filter toggles / reveal. */
export function propDomainKey(meta: PropNodeMeta): string {
	if (!meta.isValueNode) return meta.propName;
	return `${meta.propName}${VALUE_ID_SEP}${meta.rawValue ?? ''}`;
}

const COMPATIBLE_TYPES: Record<string, (v: unknown) => boolean> = {
	checkbox: (v) => v === true || v === false || v === 'true' || v === 'false',
	number: (v) => !isNaN(Number(v)),
	date: (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v),
	datetime: (v) => typeof v === 'string' && !isNaN(Date.parse(v)),
};

/** Pure type-compatibility eval: text/list/multitext (and unknown) are always compatible. */
export function isCompatible(value: unknown, type: string): boolean {
	const check = COMPATIBLE_TYPES[type];
	return check ? check(value) : true;
}

/**
 * Pure value-frequency sort: highest `count` first, stable for equal counts.
 * Does not mutate input.
 */
export function sortPropValuesByFrequency<TMeta>(
	values: readonly TreeNode<TMeta>[],
): TreeNode<TMeta>[] {
	return [...values].sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
}

/**
 * Build the 2-level prop/value tree from the index rows + a `prop -> type` map.
 *
 * - Prop nodes keep their RAW (case-sensitive) key as label and `meta.propName`;
 *   the type is looked up case-sensitively in `propTypeByName`, falling back to
 *   `'text'`. No lowercase merge (honest casing, ledger C-3).
 * - Value nodes carry the RAW value in `label` + `meta.rawValue`, are sorted by
 *   frequency, and flag `isTypeIncompatible` when the raw value does not satisfy
 *   the declared prop type.
 * - Top-level props are returned sorted by `fileCount` (desc), mirroring the
 *   legacy `PropsLogic` order. Does not mutate input.
 */
export function buildPropTree(
	indexNodes: readonly PropTreeSource[],
	propTypeByName: Record<string, { type: string }>,
): TreeNode<PropNodeMeta>[] {
	const nodes: TreeNode<PropNodeMeta>[] = indexNodes.map((propNode) => {
		const propName = propNode.property;
		const propType = propTypeByName[propName]?.type ?? DEFAULT_PROP_TYPE;

		const valueNodes: TreeNode<PropNodeMeta>[] = Object.entries(propNode.valueFrequencies).map(
			([rawValue, cnt]) => ({
				id: propValueNodeId(propName, rawValue),
				label: rawValue,
				count: cnt,
				depth: 1,
				children: [],
				relation: 'holarchy' as const,
				meta: {
					propName,
					propType,
					isValueNode: true,
					rawValue,
					isTypeIncompatible: !isCompatible(rawValue, propType),
				},
			}),
		);

		return {
			id: propNodeId(propName),
			label: propName,
			count: propNode.fileCount,
			depth: 0,
			children: sortPropValuesByFrequency(valueNodes),
			relation: 'holarchy' as const,
			meta: { propName, propType, isValueNode: false },
		};
	});

	return nodes.sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
}

/** Props search mode: 0 = match property names, 1 = match values. */
export type PropFilterMode = 0 | 1;

/** Pure case-insensitive substring matcher (replaces obsidian `prepareSimpleSearch`). */
function matches(term: string, text: string): boolean {
	return text.toLowerCase().includes(term.toLowerCase());
}

/**
 * Pure tree filter. Mode 0 (Property name) keeps ALL child values when the parent
 * prop matches so the user can explore them; mode 1 (Value) keeps only matching
 * value children. Returns the original reference when `term` is empty. Does not
 * mutate input.
 */
export function filterPropTree(
	nodes: readonly TreeNode<PropNodeMeta>[],
	term: string,
	mode: PropFilterMode = 0,
): TreeNode<PropNodeMeta>[] {
	if (!term) return nodes as TreeNode<PropNodeMeta>[];
	return filterNodes(nodes, term, mode);
}

function filterNodes(
	nodes: readonly TreeNode<PropNodeMeta>[],
	term: string,
	mode: PropFilterMode,
): TreeNode<PropNodeMeta>[] {
	const result: TreeNode<PropNodeMeta>[] = [];
	for (const node of nodes) {
		const isMatch = matches(term, node.label);
		const currentMatches =
			(mode === 0 && !node.meta.isValueNode && isMatch) ||
			(mode === 1 && node.meta.isValueNode && isMatch);

		// Property-name mode: a matching parent keeps ALL its value children.
		const filteredChildren =
			mode === 0 && currentMatches
				? (node.children ?? [])
				: node.children
					? filterNodes(node.children, term, mode)
					: [];

		if (currentMatches || filteredChildren.length > 0) {
			result.push({ ...node, children: filteredChildren });
		}
	}
	return result;
}
