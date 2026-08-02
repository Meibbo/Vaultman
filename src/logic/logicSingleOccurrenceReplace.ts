/**
 * U121-019 #51 — "replace this occurrence", from a match row's own menu.
 *
 * The queued content replace runs a global regex over the whole file, which is
 * right when the operation came from the Find/Replace row: it means every match.
 * A match row is one occurrence, so a menu on it has to mean that one, and the
 * offset the snippet already carries is what says which.
 *
 * Pure: the caller reads and writes the file.
 */

export interface SingleOccurrenceRule {
	pattern: string;
	replacement: string;
	isRegex: boolean;
	caseSensitive: boolean;
}

/**
 * The content with the occurrence at `offset` replaced, or `null` when nothing
 * should be written.
 *
 * `null` covers every case where acting would be a guess: the offset is past the
 * end, the pattern no longer matches *there* because the note was edited after
 * the search, or the pattern will not compile. Rewriting whatever happens to sit
 * at a stale offset is the one outcome nobody asked for.
 */
export function replaceSingleOccurrence(
	content: string,
	offset: number,
	rule: SingleOccurrenceRule,
): string | null {
	if (!Number.isInteger(offset) || offset < 0 || offset >= content.length) {
		return null;
	}

	const source = rule.isRegex
		? rule.pattern
		: rule.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

	let sticky: RegExp;
	try {
		// `y` anchors the match at `lastIndex`, so the pattern has to match *here*
		// rather than somewhere further on — otherwise the menu on one row would
		// quietly edit a different row's match.
		sticky = new RegExp(source, `y${rule.caseSensitive ? '' : 'i'}`);
	} catch {
		return null;
	}

	sticky.lastIndex = offset;
	const match = sticky.exec(content);
	if (!match) return null;

	const replaced = match[0].replace(
		new RegExp(source, rule.caseSensitive ? '' : 'i'),
		rule.replacement,
	);
	return content.slice(0, offset) + replaced + content.slice(offset + match[0].length);
}
