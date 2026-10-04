/**
 * U130 native polish: text-cell case projection.
 *
 * `provided` preserves the supplied spelling (including custom group names);
 * the other modes are explicit user-chosen display transforms. Case affects
 * displayed text only — never identities, URNs, memberships, search/sort
 * values or rename inputs — so every helper here takes and returns strings
 * and never touches nodes.
 */

/** Per text cell case, global default or per-instance per-scene override. */
export type TextCaseOption = 'provided' | 'lowercase' | 'titlecase' | 'uppercase';

const VALID_CASES: readonly TextCaseOption[] = [
	'provided',
	'lowercase',
	'titlecase',
	'uppercase',
];

export function isTextCaseOption(value: unknown): value is TextCaseOption {
	return (
		typeof value === 'string' &&
		(VALID_CASES as readonly string[]).includes(value)
	);
}

/** Sparse normalize: unknown values fall back to `provided`, never throw. */
export function normalizeTextCaseOption(value: unknown): TextCaseOption {
	return isTextCaseOption(value) ? value : 'provided';
}

/**
 * Titlecase: lowercase the remainder of each word, uppercase its first
 * letter, with locale-aware operations. Word starts follow whitespace and
 * common intra-label separators so `my-note_name` reads `My-Note_Name`.
 */
export function toTitleCase(value: string, locale?: string): string {
	const lowered = value.toLocaleLowerCase(locale);
	return lowered.replace(
		/(^|[\s\-_/–—([{«"'“‘>`~|:.])([\p{L}\p{N}])/gu,
		(_match, boundary: string, ch: string) =>
			`${boundary}${ch.toLocaleUpperCase(locale)}`,
	);
}

/** Display transform for one text value. Pure string in, string out. */
export function applyTextCase(
	value: string,
	mode: TextCaseOption,
	locale?: string,
): string {
	switch (mode) {
		case 'lowercase':
			return value.toLocaleLowerCase(locale);
		case 'uppercase':
			return value.toLocaleUpperCase(locale);
		case 'titlecase':
			return toTitleCase(value, locale);
		case 'provided':
		default:
			return value;
	}
}

export type TextCaseMap = Readonly<Record<string, TextCaseOption>>;

/**
 * Resolve the effective case for one cell: the scene override wins when it
 * names the cell, otherwise the global map, otherwise `provided`. Either map
 * may be absent; absent entries inherit.
 */
export function resolveTextCase(
	cellId: string,
	globalMap?: TextCaseMap | null,
	sceneMap?: TextCaseMap | null,
): TextCaseOption {
	const scene = sceneMap?.[cellId];
	if (scene !== undefined) return normalizeTextCaseOption(scene);
	const global = globalMap?.[cellId];
	if (global !== undefined) return normalizeTextCaseOption(global);
	// Files calls its label `name`, other projections call it `text` or
	// `path`. The global label setting is a fallback, not an ext/value rule.
	if (cellId === 'name' || cellId === 'path') {
		const labelDefault = sceneMap?.text ?? globalMap?.text;
		if (labelDefault !== undefined) return normalizeTextCaseOption(labelDefault);
	}
	return 'provided';
}

/** Normalize a sparse persisted map (drops unknown modes, keeps sparseness). */
export function normalizeTextCaseMap(value: unknown): Record<string, TextCaseOption> {
	if (typeof value !== 'object' || value === null) return {};
	const out: Record<string, TextCaseOption> = {};
	for (const [cellId, mode] of Object.entries(value as Record<string, unknown>)) {
		if (!cellId || !isTextCaseOption(mode)) continue;
		out[cellId] = mode;
	}
	return out;
}

/**
 * Merge global + scene maps into the resolved per-cell table the tree reads.
 * Scene wins per cell. Explicit `provided` is retained so a label alias can
 * opt out of the global text default rather than silently inheriting it.
 */
export function mergeTextCaseMaps(
	globalMap?: TextCaseMap | null,
	sceneMap?: TextCaseMap | null,
): Record<string, TextCaseOption> {
	return { ...normalizeTextCaseMap(globalMap), ...normalizeTextCaseMap(sceneMap) };
}

/** Shallow equality for sparse maps (key order independent). */
export function sameTextCaseMap(
	a: TextCaseMap | undefined,
	b: TextCaseMap | undefined,
): boolean {
	const left = a ?? {};
	const right = b ?? {};
	const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
	for (const key of keys) {
		if (left[key] !== right[key]) return false;
	}
	return true;
}

/**
 * Display-only DOM projection: rewrite text nodes under `root` except inside
 * editable/form regions (inputs, textareas, contenteditables, the counter
 * range editor and explicit `data-text-case="off"` subtrees). Markup and
 * actions survive because only `Text` node values change.
 */
export function projectTextCaseElement(
	root: HTMLElement,
	mode: TextCaseOption,
	locale?: string,
): void {
	if (mode === 'provided') return;
	const skip = 'input, textarea, select, [contenteditable], [data-text-case="off"]';
	const walker = root.ownerDocument.createTreeWalker(
		root,
		NodeFilter.SHOW_TEXT,
		{
			acceptNode(node) {
				const parent = node.parentElement;
				if (!parent) return NodeFilter.FILTER_REJECT;
				if (parent.closest(skip)) return NodeFilter.FILTER_REJECT;
				if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_SKIP;
				return NodeFilter.FILTER_ACCEPT;
			},
		},
	);
	const targets: Text[] = [];
	while (walker.nextNode()) targets.push(walker.currentNode as Text);
	for (const text of targets) {
		text.nodeValue = applyTextCase(text.nodeValue ?? '', mode, locale);
	}
}
