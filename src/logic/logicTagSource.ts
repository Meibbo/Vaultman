/**
 * Where a tag was written. Obsidian accepts a tag in two places — the
 * frontmatter `tags` key and the body — and treats them as the same tag
 * afterwards, so the vault-wide index the explorer builds has no memory of
 * which one it came from. This module keeps that memory.
 *
 * The two facts it produces are independent of the structure dimension
 * (`nested` / `simple`): a tag can be nested and inline at once, so the type
 * filter intersects the two groups rather than choosing between them.
 */

export type TagSource = 'inline' | 'frontmatter';

/** Menu and comparator order: written first, read first. */
export const TAG_SOURCE_ORDER = ['frontmatter', 'inline'] as const;

export interface TagOccurrence {
	/** Tag path without the leading `#`, matching the node ids the tree uses. */
	tagPath: string;
	source: TagSource;
	/**
	 * Where the occurrence sits in the note. Frontmatter has no offsets of its
	 * own, so its entries are numbered from the declaration order — always
	 * ahead of the body, which is where the frontmatter block physically is.
	 */
	order: number;
}

/** The shape this module needs from `metadataCache.getFileCache`. */
export interface TagCacheLike {
	frontmatter?: Record<string, unknown> | null;
	tags?: readonly {
		tag: string;
		position?: { start?: { offset?: number } };
	}[];
}

function cleanTag(raw: unknown): string {
	// A tag is written as text. A map or a list in the `tags` key is not a tag
	// Obsidian reads either, and stringifying it would invent `[object Object]`
	// as a tag path.
	if (typeof raw !== 'string' && typeof raw !== 'number') return '';
	return `${raw}`.trim().replace(/^#/, '');
}

function frontmatterTagList(
	frontmatter: Record<string, unknown> | null,
): string[] {
	const raw = frontmatter?.tags ?? frontmatter?.tag;
	if (Array.isArray(raw)) return raw.map(cleanTag).filter(Boolean);
	if (typeof raw === 'string') {
		// A scalar `tags:` line is comma or space separated, which is how
		// Obsidian reads it too.
		return raw
			.split(/[,\s]+/)
			.map(cleanTag)
			.filter(Boolean);
	}
	return [];
}

/**
 * Every tag the note writes, in the order the note writes it: the frontmatter
 * block first, in declaration order, then the body in offset order.
 *
 * Duplicates are kept. The caller decides whether repeating a tag means a
 * bigger count (reveal) or nothing at all (the source index).
 */
export function tagOccurrences(cache: TagCacheLike | null): TagOccurrence[] {
	if (!cache) return [];
	const occurrences: TagOccurrence[] = [];

	frontmatterTagList(cache.frontmatter ?? null).forEach((tagPath, index) => {
		occurrences.push({ tagPath, source: 'frontmatter', order: index });
	});

	const inline = [...(cache.tags ?? [])]
		.map((entry, index) => ({
			tagPath: cleanTag(entry.tag),
			offset: entry.position?.start?.offset ?? index,
		}))
		.filter((entry) => entry.tagPath.length > 0)
		.sort((left, right) => left.offset - right.offset);

	// The body always follows the frontmatter, so its ordinals continue from
	// the end of the frontmatter's rather than restarting.
	const base = occurrences.length;
	inline.forEach((entry, index) => {
		occurrences.push({
			tagPath: entry.tagPath,
			source: 'inline',
			order: base + index,
		});
	});

	return occurrences;
}

/**
 * The sources of one tag, as a set that keeps its own order. A tag written in
 * both places belongs to both groups — the filter is a membership test, not a
 * classification into one bucket.
 */
export function tagSourcesFrom(
	occurrences: readonly TagOccurrence[],
): Set<TagSource> {
	const sources = new Set<TagSource>();
	for (const occurrence of occurrences) sources.add(occurrence.source);
	return sources;
}

export function matchesTagSource(
	sources: ReadonlySet<TagSource> | undefined,
	selected: readonly TagSource[],
): boolean {
	if (selected.length === 0) return true;
	if (!sources) return false;
	return selected.some((source) => sources.has(source));
}

/**
 * Ranks a tag by where it is written, frontmatter first. A tag that is written
 * in both places ranks with the first of them: it is a member of that group,
 * and sorting it after the pure-frontmatter tags would split a group the
 * filter treats as one.
 */
export function tagSourceRank(
	sources: ReadonlySet<TagSource> | undefined,
): number {
	if (!sources) return TAG_SOURCE_ORDER.length;
	const rank = TAG_SOURCE_ORDER.findIndex((source) => sources.has(source));
	return rank === -1 ? TAG_SOURCE_ORDER.length : rank;
}

/**
 * The `type` cell's text. Both sources read as both, rather than as whichever
 * one happens to rank first — the cell answers "where is this written", and
 * for those tags the honest answer is "in both places".
 */
export function tagSourceLabelKey(
	sources: ReadonlySet<TagSource> | undefined,
): string | undefined {
	if (!sources || sources.size === 0) return undefined;
	if (sources.size > 1) return 'tags.source.both';
	return sources.has('frontmatter')
		? 'tags.source.frontmatter'
		: 'tags.source.inline';
}
