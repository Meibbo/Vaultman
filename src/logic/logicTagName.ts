/**
 * BT5-077: validation for tag names, owned by the Tags provider.
 *
 * Obsidian stops parsing a tag at the first character it does not accept, so
 * `#foo bar` is not a tag containing a space — it is the tag `foo` followed by
 * loose text. Renaming a tag to such a name wrote it verbatim into the
 * frontmatter of every file carrying the tag, and from then on the node could
 * no longer be found by its own path, so every later operation on it silently
 * matched nothing until the vault was reloaded.
 *
 * Rejecting the name is therefore the fix, not sanitizing it: a silent repair
 * would still write a name the user did not ask for across many files.
 */

export type TagNameProblem =
	| 'empty'
	| 'whitespace'
	| 'invalid_char'
	| 'numeric'
	| 'slash';

export interface TagNameCheck {
	valid: boolean;
	/** The name to actually use: trimmed, and only set when valid. */
	name?: string;
	reason?: TagNameProblem;
}

/** Letters (any script), digits, underscore, hyphen, and `/` for nesting. */
const ALLOWED_TAG_NAME = /^[\p{L}\p{N}_\-/]+$/u;

/** Obsidian rejects a tag made only of digits, so it needs one of these. */
const HAS_NON_NUMERIC = /[\p{L}_-]/u;

export function validateTagName(raw: string): TagNameCheck {
	const name = raw.trim();
	if (!name) return { valid: false, reason: 'empty' };
	// Checked before the character class so the common mistake gets the
	// specific message instead of a generic "invalid character".
	if (/\s/u.test(name)) return { valid: false, reason: 'whitespace' };
	if (name.startsWith('/') || name.endsWith('/') || name.includes('//')) {
		return { valid: false, reason: 'slash' };
	}
	if (!ALLOWED_TAG_NAME.test(name)) {
		return { valid: false, reason: 'invalid_char' };
	}
	if (!HAS_NON_NUMERIC.test(name)) return { valid: false, reason: 'numeric' };
	return { valid: true, name };
}

export function isValidTagName(raw: string): boolean {
	return validateTagName(raw).valid;
}

/** The i18n key describing why a name was rejected. */
export function tagNameProblemKey(reason: TagNameProblem): string {
	return reason === 'whitespace'
		? 'tags.invalid_name.spaces'
		: 'tags.invalid_name';
}
