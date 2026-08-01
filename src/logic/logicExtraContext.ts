/**
 * U121-019 #51 — "show more context", in core's shape.
 *
 * Core does this with `SearchView.setExtraContext(boolean)`: a flag on the
 * result DOM, and every match re-renders through `getMatchExtraPositions`. It is
 * **structural**, not a character radius — the match grows to the thing it is
 * inside — and it is one switch for the view, not a control per row.
 *
 * Transcribed from `Desktop/obsidian-web-lab/obsidian/app.js` (Obsidian 1.12.3):
 *
 *   1. the list item containing the match, extended through the items that
 *      follow under the same parent, starting at the item's own indentation
 *      (`start.offset - start.col`) rather than at its bullet
 *   2. otherwise the section containing the match, whole
 *   3. otherwise the match's line — walk to the newline in each direction,
 *      each walk clamped to 1000 characters
 *
 * An earlier version of this was a ladder of character radii applied per node.
 * That reinvented something core already ships; this does not.
 */

/** The slice of Obsidian's file cache this needs. Kept structural on purpose. */
export interface ExtraContextCache {
	sections?: { position: { start: { offset: number }; end: { offset: number } } }[];
	listItems?: {
		position: { start: { offset: number; col: number }; end: { offset: number } };
		parent: number;
	}[];
}

/** Core's own budget for the line walk, in characters, each way. */
const LINE_CLAMP = 1000;

/**
 * Core's budget for the **default** slice, which is a different walk entirely.
 *
 * `getMatchExtraPositions` is only reached when extra context is on. Off, core
 * renders each match through `Ry(content, match, 100)`: step out from the match
 * until a newline or a hundred characters, whichever comes first. Measured
 * against core's own pane, its rows ran 11 to 122 characters; a first attempt
 * that reused the 1000-character clamp above produced 477.
 */
const DEFAULT_CONTEXT_BUDGET = 100;

const NEWLINE = 10;

function containing<T extends { position: { start: { offset: number }; end: { offset: number } } }>(
	entries: T[] | undefined,
	match: readonly [number, number],
): { entry: T; index: number } | null {
	if (!entries) return null;
	for (let index = 0; index < entries.length; index += 1) {
		const entry = entries[index];
		if (!entry) continue;
		if (
			match[0] >= entry.position.start.offset &&
			match[1] <= entry.position.end.offset
		) {
			return { entry, index };
		}
	}
	return null;
}

/**
 * The range of `content` to show for `match` when extra context is on.
 *
 * Returns `[from, to]` character offsets.
 */
export function extraContextRange(
	content: string,
	match: readonly [number, number],
	cache: ExtraContextCache,
): [number, number] {
	const item = containing(cache.listItems, match);
	if (item) {
		// Absorb the items that follow while they hang off a parent already
		// collected — core keeps the sub-tree together rather than cutting a
		// list in half.
		const items = cache.listItems ?? [];
		const collectedParents = new Set<number>([item.entry.position.start.offset]);
		let last = item.entry;
		for (let i = item.index + 1; i < items.length; i += 1) {
			const next = items[i];
			if (!next || !collectedParents.has(next.parent)) break;
			collectedParents.add(next.position.start.offset);
			last = next;
		}
		return [
			item.entry.position.start.offset - item.entry.position.start.col,
			last.position.end.offset,
		];
	}

	const section = containing(cache.sections, match);
	if (section) {
		return [section.entry.position.start.offset, section.entry.position.end.offset];
	}

	let from = match[0];
	const backStop = from - LINE_CLAMP;
	while (from > 0 && from > backStop && content.charCodeAt(from - 1) !== NEWLINE) {
		from -= 1;
	}

	let to = match[0];
	const forwardStop = to + LINE_CLAMP;
	while (to < content.length && to < forwardStop && content.charCodeAt(to) !== NEWLINE) {
		to += 1;
	}

	return [from, Math.max(to, match[1])];
}

/**
 * Walk `range` one structural unit further back — core's `showMoreBefore`.
 *
 * Core steps the start outward and asks `getPrevPos` where the previous unit
 * begins, taking whichever is further out. The end is untouched: the two hover
 * chevrons open a match in one direction each.
 *
 * Returns the same bounds when there is nowhere further to go, so a control can
 * report that rather than look live and do nothing.
 */
export function showMoreBefore(
	content: string,
	range: readonly [number, number],
	cache: ExtraContextCache,
): [number, number] {
	const [from, to] = range;
	if (from <= 0) return [from, to];
	const probe = from - 1;
	const [structural] = extraContextRange(content, [probe, probe], cache);
	return [Math.min(structural, probe), to];
}

/** Walk `range` one structural unit further forward — core's `showMoreAfter`. */
export function showMoreAfter(
	content: string,
	range: readonly [number, number],
	cache: ExtraContextCache,
): [number, number] {
	const [from, to] = range;
	if (to >= content.length) return [from, to];
	const probe = to + 1;
	const [, structural] = extraContextRange(content, [probe, probe], cache);
	return [from, Math.max(structural, probe)];
}

/**
 * The slice core shows when extra context is off — its `Ry`, transcribed.
 *
 * Returns `[from, to, truncatedBefore, truncatedAfter]`. The two flags say
 * whether the walk stopped on the budget rather than on a line break, which is
 * what tells a renderer to mark the row as clipped.
 */
export function defaultContextRange(
	content: string,
	match: readonly [number, number],
	budget: number = DEFAULT_CONTEXT_BUDGET,
): [number, number, boolean, boolean] {
	let from = match[0] - 1;
	let back = 0;
	while (back < budget && from >= 0) {
		if (content.charCodeAt(from) === NEWLINE) break;
		from -= 1;
		back += 1;
	}
	from += 1;

	let to = match[1];
	let forward = 0;
	while (forward < budget && to < content.length) {
		if (content.charCodeAt(to) === NEWLINE) break;
		to += 1;
		forward += 1;
	}

	return [from, to, back === budget, forward === budget];
}
