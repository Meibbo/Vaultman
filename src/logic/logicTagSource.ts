/**
 * Where a tag was written. Obsidian accepts a tag in two places — the
 * frontmatter `tags` key and the body — and treats them as the same tag
 * afterwards, so the vault-wide index the explorer builds has no memory of
 * which one it came from. This module keeps that memory.
 *
 * The two facts it produces are independent of the structure dimension
 * (`nested` / `simple`): a tag can be nested and inline at once. Structure can
 * combine with one source, while inline and frontmatter are one exclusive
 * source choice in the UI.
 */

export type TagSource = 'inline' | 'frontmatter';

/** Menu and comparator order: written first, read first. */
export const TAG_SOURCE_ORDER = ['frontmatter', 'inline'] as const;

export interface TagOccurrence {
	/** Tag path without the leading `#`, matching the node ids the tree uses. */
	tagPath: string;
	source: TagSource;
	/**
	 * Where the occurrence sits in the note. Frontmatter normally has no offsets
	 * of its own, but newer caches sometimes expose the position in `tags`; when
	 * they do, preserving it lets reveal focus the actual YAML token.
	 */
	order: number;
	/**
	 * File offset for jumping straight to the occurrence. Undefined when the
	 * cache carries no position, which is normal for frontmatter entries.
	 */
	offset?: number;
	/** End of the metadata range when Obsidian exposes it. */
	endOffset?: number;
}

/** The shape this module needs from `metadataCache.getFileCache`. */
export interface TagCacheLike {
	frontmatter?: Record<string, unknown> | null;
	tags?: readonly {
		tag: string;
		position?: {
			start?: { offset?: number };
			end?: { offset?: number };
		};
	}[];
	frontmatterPosition?: {
		start?: { offset?: number };
		end?: { offset?: number };
	} | null;
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
	const fmEnd = cache.frontmatterPosition?.end?.offset;
	const frontmatterOffsets = new Map<
		string,
		{ offset: number; endOffset?: number }[]
	>();
	if (typeof fmEnd === 'number') {
		for (const entry of cache.tags ?? []) {
			const tagPath = cleanTag(entry.tag);
			const offset = entry.position?.start?.offset;
			const endOffset = entry.position?.end?.offset;
			if (tagPath && typeof offset === 'number' && offset < fmEnd) {
				const offsets = frontmatterOffsets.get(tagPath) ?? [];
				offsets.push({
					offset,
					...(typeof endOffset === 'number' ? { endOffset } : {}),
				});
				frontmatterOffsets.set(tagPath, offsets);
			}
		}
	}
	const consumedFrontmatterOffsets = new Map<string, number>();

	frontmatterTagList(cache.frontmatter ?? null).forEach((tagPath, index) => {
		const offsets = frontmatterOffsets.get(tagPath);
		const offsetIndex = consumedFrontmatterOffsets.get(tagPath) ?? 0;
		const position = offsets?.[offsetIndex];
		consumedFrontmatterOffsets.set(tagPath, offsetIndex + 1);
		occurrences.push({
			tagPath,
			source: 'frontmatter',
			order: index,
			...(position ? position : {}),
		});
	});

	// End of the frontmatter block: `tags` entries positioned before it are
	// the frontmatter pass's own rows coming back through the cache.
	const inline = [...(cache.tags ?? [])]
		.map((entry, index) => ({
			tagPath: cleanTag(entry.tag),
			offset: entry.position?.start?.offset,
			endOffset: entry.position?.end?.offset,
			index,
		}))
		.filter((entry) => entry.tagPath.length > 0)
		// Obsidian's `tags` array already contains the frontmatter entries,
		// with positions inside the frontmatter block. The frontmatter pass
		// above owns that range: without this, a frontmatter-only tag counted
		// twice (once per pass) and every single-source tag read `both` — in
		// reveal and in the vault-wide index alike. Entries without a known
		// position cannot be placed, so they keep the old path.
		.filter(
			(entry) =>
				typeof fmEnd !== 'number' ||
				typeof entry.offset !== 'number' ||
				entry.offset >= fmEnd,
		)
		.sort((left, right) => {
			if (typeof left.offset === 'number' && typeof right.offset === 'number') {
				return left.offset - right.offset;
			}
			if (typeof left.offset === 'number') return -1;
			if (typeof right.offset === 'number') return 1;
			return left.index - right.index;
		});

	// The body always follows the frontmatter, so its ordinals continue from
	// the end of the frontmatter's rather than restarting.
	const base = occurrences.length;
	inline.forEach((entry, index) => {
		occurrences.push({
			tagPath: entry.tagPath,
			source: 'inline',
			order: base + index,
			...(typeof entry.offset === 'number' ? { offset: entry.offset } : {}),
			...(typeof entry.endOffset === 'number'
				? { endOffset: entry.endOffset }
				: {}),
		});
	});

	return occurrences;
}

export type TagOccurrenceDirection = 'asc' | 'desc';

/** Occurrences owned by a row, including descendants for structural parents. */
export function tagOccurrencesForPath(
	occurrences: readonly TagOccurrence[],
	tagPath: string,
	selectedSources: readonly TagSource[] = [],
): TagOccurrence[] {
	return occurrences.filter(
		(occurrence) =>
			(selectedSources.length === 0 ||
				selectedSources.includes(occurrence.source)) &&
			(occurrence.tagPath === tagPath ||
				occurrence.tagPath.startsWith(`${tagPath}/`)),
	);
}

/**
 * Orders reveal targets by the note's physical order. The explorer's displayed
 * `desc` direction is the forward document walk; `asc` walks it backwards.
 */
export function orderedTagOccurrences(
	occurrences: readonly TagOccurrence[],
	tagPath: string,
	direction: TagOccurrenceDirection,
	selectedSources: readonly TagSource[] = [],
): TagOccurrence[] {
	const candidates = tagOccurrencesForPath(
		occurrences,
		tagPath,
		selectedSources,
	);
	return [...candidates].sort((left, right) => {
		const order = left.order - right.order;
		return direction === 'desc' ? order : -order;
	});
}

/** A stable identity for one occurrence across freshly-read metadata caches. */
export function tagOccurrenceKey(occurrence: TagOccurrence): string {
	return [
		occurrence.tagPath,
		occurrence.source,
		occurrence.order,
		occurrence.offset ?? '',
		occurrence.endOffset ?? '',
	].join(':');
}

function escapedRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findTagRanges(
	content: string,
	tagPath: string,
	from: number,
	to: number,
): Array<[number, number]> {
	if (!tagPath || from >= to) return [];
	const expression = new RegExp(
		`(^|[^\\p{L}\\p{N}_/-])(#?${escapedRegExp(tagPath)})(?=$|[^\\p{L}\\p{N}_/-])`,
		'gu',
	);
	const ranges: Array<[number, number]> = [];
	let match: RegExpExecArray | null;
	while ((match = expression.exec(content)) !== null) {
		const token = match[2];
		const start = match.index + match[0].length - token.length;
		const end = start + token.length;
		if (start >= to) break;
		if (start >= from && end <= to) ranges.push([start, end]);
		if (match[0].length === 0) expression.lastIndex += 1;
	}
	return ranges;
}

function rangeAtKnownOffset(
	content: string,
	occurrence: TagOccurrence,
): [number, number] | undefined {
	const start = occurrence.offset;
	if (typeof start !== 'number' || start < 0 || start >= content.length) {
		return undefined;
	}
	const end = occurrence.endOffset;
	if (
		typeof end === 'number' &&
		end > start &&
		end <= content.length &&
		content.slice(start, end).replace(/^#/, '') === occurrence.tagPath
	) {
		return [start, end];
	}
	for (const token of [`#${occurrence.tagPath}`, occurrence.tagPath]) {
		if (content.startsWith(token, start)) {
			return [start, start + token.length];
		}
	}
	if (
		start > 0 &&
		content[start - 1] === '#' &&
		content.startsWith(occurrence.tagPath, start)
	) {
		return [start - 1, start + occurrence.tagPath.length];
	}
	return findTagRanges(
		content,
		occurrence.tagPath,
		Math.max(0, start - 1),
		Math.min(content.length, start + occurrence.tagPath.length + 2),
	).sort(
		(left, right) => Math.abs(left[0] - start) - Math.abs(right[0] - start),
	)[0];
}

export interface TagOccurrenceRangeOptions {
	frontmatterStartOffset?: number;
	frontmatterEndOffset?: number;
	/** Ordinal among occurrences of this path and source. */
	occurrenceIndex?: number;
}

/**
 * Resolves the exact text range to pass to Core's match decoration. Metadata
 * positions are preferred; frontmatter entries without positions are located in
 * the loaded document instead of silently falling back to offset zero.
 */
export function tagOccurrenceRange(
	occurrence: TagOccurrence,
	content: string,
	options: TagOccurrenceRangeOptions = {},
): [number, number] | undefined {
	const known = rangeAtKnownOffset(content, occurrence);
	if (known) return known;
	const from =
		occurrence.source === 'frontmatter'
			? Math.max(0, options.frontmatterStartOffset ?? 0)
			: Math.max(0, options.frontmatterEndOffset ?? 0);
	const to =
		occurrence.source === 'frontmatter' &&
		typeof options.frontmatterEndOffset === 'number'
			? Math.min(content.length, options.frontmatterEndOffset)
			: content.length;
	return findTagRanges(content, occurrence.tagPath, from, to)[
		options.occurrenceIndex ?? 0
	];
}

/**
 * The sources of one tag, as a set that keeps its own order. A tag written in
 * both places belongs to both groups; the UI can still ask for either source
 * independently.
 */
export function tagSourcesFrom(
	occurrences: readonly TagOccurrence[],
): Set<TagSource> {
	const sources = new Set<TagSource>();
	for (const occurrence of occurrences) sources.add(occurrence.source);
	return sources;
}

/**
 * Selects the first direct occurrence a row should open. Descendants are the
 * fallback for structural rows; reveal cycling uses all of them in order.
 */
export function firstTagOccurrence(
	occurrences: readonly TagOccurrence[],
	tagPath: string,
	selectedSources: readonly TagSource[] = [],
): TagOccurrence | undefined {
	const candidates = tagOccurrencesForPath(
		occurrences,
		tagPath,
		selectedSources,
	);
	const exact = candidates.filter(
		(occurrence) => occurrence.tagPath === tagPath,
	);
	return [...(exact.length > 0 ? exact : candidates)].sort(
		(left, right) => left.order - right.order,
	)[0];
}

/** The source membership still visible after an inline/frontmatter filter. */
export function visibleTagSources(
	sources: ReadonlySet<TagSource> | undefined,
	selected: readonly TagSource[],
): ReadonlySet<TagSource> | undefined {
	if (!sources || selected.length === 0) return sources;
	return new Set(selected.filter((source) => sources.has(source)));
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
