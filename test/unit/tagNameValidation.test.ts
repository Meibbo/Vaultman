import { describe, expect, it } from 'vitest';

import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';
import { tagNameProblemKey, validateTagName } from '../../src/logic/logicTagName';
import explorerTagsSource from '../../src/components/containers/explorerTags.ts?raw';

describe('BT5-077 tag name validation', () => {
	it('rejects the space that soft-locked the Tags explorer', () => {
		// Obsidian stops parsing a tag at the first character it does not accept,
		// so `#foo bar` is the tag `foo` plus loose text. Writing it made the node
		// unreachable by its own path for every later operation.
		const check = validateTagName('foo bar');
		expect(check.valid).toBe(false);
		expect(check.reason).toBe('whitespace');
	});

	it('accepts what Obsidian accepts, including nesting and non-ASCII letters', () => {
		for (const name of ['release', 'Release', 'v1_2', 'a-b', 'parent/child', 'año']) {
			expect(validateTagName(name).valid, name).toBe(true);
		}
	});

	it('normalizes surrounding whitespace instead of rejecting it', () => {
		const check = validateTagName('  release  ');
		expect(check.valid).toBe(true);
		expect(check.name).toBe('release');
	});

	it('rejects empty, hash-bearing and purely numeric names', () => {
		expect(validateTagName('').reason).toBe('empty');
		expect(validateTagName('   ').reason).toBe('empty');
		expect(validateTagName('foo#bar').reason).toBe('invalid_char');
		expect(validateTagName('2026').reason).toBe('numeric');
	});

	it('rejects slash edges that would create an empty nesting level', () => {
		expect(validateTagName('/foo').reason).toBe('slash');
		expect(validateTagName('foo/').reason).toBe('slash');
		expect(validateTagName('foo//bar').reason).toBe('slash');
	});

	it('routes the space mistake to its own message and the rest to the generic one', () => {
		expect(tagNameProblemKey('whitespace')).toBe('tags.invalid_name.spaces');
		for (const reason of ['empty', 'invalid_char', 'numeric', 'slash'] as const) {
			expect(tagNameProblemKey(reason), reason).toBe('tags.invalid_name');
		}
	});

	it('guards both rename entry points, not just the inline editor', () => {
		// The inline editor and the programmatic drag-to-nest path both reach
		// `_renameTag`, so the check cannot live in the editor alone.
		expect(explorerTagsSource).toContain('validateTagName');
		expect(
			explorerTagsSource.match(/validateTagName\(/gu)?.length ?? 0,
		).toBeGreaterThanOrEqual(2);
	});

	it('localizes both rejection messages', () => {
		for (const key of ['tags.invalid_name', 'tags.invalid_name.spaces']) {
			expect(en[key], key).toBeTruthy();
			expect(es[key], key).toBeTruthy();
		}
	});
});
