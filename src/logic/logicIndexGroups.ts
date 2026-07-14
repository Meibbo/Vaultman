/**
 * Pure derivation of the floating TOC index groups.
 *
 * The rail is a faithful projection of the explorer's CURRENT visible order:
 * groups are keyed by the literal first glyph of each node's label (letters
 * upper-cased so 'a'/'A' merge; digits and symbols kept as-is, so "_x", "+x"
 * and "1x" index under '_', '+' and '1'), emitted in first-encounter order
 * with no re-sorting. Because the caller passes nodes already in explorer-sort
 * order, the rail scrolls monotonically with the list and reacts to sort
 * axis/direction changes for free. Unnamed nodes are skipped.
 */

export interface IndexNodeRef {
	id: string;
	label: string;
}

export interface IndexGroup {
	key: string;
	label: string;
	firstId: string;
	count: number;
}

function indexKeyFor(label: string): string | null {
	const [ch] = Array.from((label ?? '').trim());
	if (!ch) return null;
	const [upper] = Array.from(ch.toLocaleUpperCase());
	return upper ?? ch;
}

export function buildIndexGroups(
	nodes: readonly IndexNodeRef[] | null | undefined,
): IndexGroup[] {
	const order: string[] = [];
	const groups = new Map<string, IndexGroup>();
	for (const node of nodes ?? []) {
		const key = indexKeyFor(node.label);
		if (key === null) continue;
		const existing = groups.get(key);
		if (existing) {
			existing.count += 1;
		} else {
			groups.set(key, { key, label: key, firstId: node.id, count: 1 });
			order.push(key);
		}
	}
	return order.map((key) => groups.get(key)!);
}
