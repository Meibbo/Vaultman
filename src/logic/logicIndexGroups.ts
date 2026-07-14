/**
 * Pure derivation of the floating TOC index groups (FTC-001).
 *
 * Groups top-level explorer nodes by the first character of their human label
 * (glyph letter mode). Non-alphanumeric or empty labels fall into the '#'
 * bucket, which always sorts last. Group order otherwise follows
 * locale-aware numeric compare; `firstId` preserves the caller's node order
 * (= current sort), which is the jump target contract for FTC-002.
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

export const INDEX_FALLBACK_KEY = '#';

function indexKeyFor(label: string): string {
	// Skip leading sigils (e.g. "+maps", "_templates") and index by the first
	// real letter/digit; only labels with no alphanumeric glyph fall back to '#'.
	for (const ch of Array.from((label ?? '').trim())) {
		if (!/[\p{L}\p{N}]/u.test(ch)) continue;
		const [upperGlyph] = Array.from(ch.toLocaleUpperCase());
		return upperGlyph ?? INDEX_FALLBACK_KEY;
	}
	return INDEX_FALLBACK_KEY;
}

export function buildIndexGroups(
	nodes: readonly IndexNodeRef[] | null | undefined,
): IndexGroup[] {
	const groups = new Map<string, IndexGroup>();
	for (const node of nodes ?? []) {
		const key = indexKeyFor(node.label);
		const existing = groups.get(key);
		if (existing) {
			existing.count += 1;
		} else {
			groups.set(key, { key, label: key, firstId: node.id, count: 1 });
		}
	}
	return [...groups.values()].sort((a, b) => {
		if (a.key === b.key) return 0;
		if (a.key === INDEX_FALLBACK_KEY) return 1;
		if (b.key === INDEX_FALLBACK_KEY) return -1;
		return a.key.localeCompare(b.key, undefined, { numeric: true });
	});
}
