import { describe, expect, it } from 'vitest';

import {
	coercePropertyValueForWidget,
	replaceMatchingPropertyValue,
	resolveCorePropertyWidget,
} from '../../src/logic/propertyValueCoercion';
import propsExplorerSource from '../../src/components/containers/explorerProps.ts?raw';

// U121-003 defect, reported by the dev on 2026-08-02: toggling the `cell_format`
// checkbox queued a rename that changed the property's TYPE. Every inline value
// edit reached the vault through `String(newValue)`, so a boolean property was
// handed the string `"true"` and Obsidian re-inferred its type from the data.
// The flip was available on `number` and `date` too; only text and list survived
// by accident. What the widget produces is always a string, so the coercion back
// to the property's own runtime type belongs on the way in.
describe('U121-003 inline value edits keep the property type', () => {
	it('gives a checkbox widget a real boolean', () => {
		expect(coercePropertyValueForWidget('true', 'checkbox')).toBe(true);
		expect(coercePropertyValueForWidget('false', 'checkbox')).toBe(false);
	});

	it('gives a checkbox alias the same boolean', () => {
		expect(coercePropertyValueForWidget('true', 'boolean')).toBe(true);
		expect(coercePropertyValueForWidget('false', 'toggle')).toBe(false);
	});

	it('gives a number widget a real number', () => {
		expect(coercePropertyValueForWidget('42', 'number')).toBe(42);
		expect(coercePropertyValueForWidget('3.5', 'number')).toBe(3.5);
	});

	it('keeps date and datetime as the exact string the input produced', () => {
		expect(coercePropertyValueForWidget('2026-08-02', 'date')).toBe(
			'2026-08-02',
		);
		expect(coercePropertyValueForWidget('2026-08-02T10:15', 'datetime')).toBe(
			'2026-08-02T10:15',
		);
	});

	// A value node under a list property is ONE element of that list, not the
	// list. Parsing it as a list would nest an array inside the array on write.
	it('keeps a list element a string instead of splitting it into a list', () => {
		for (const widget of ['multitext', 'list', 'tags', 'aliases']) {
			expect(coercePropertyValueForWidget('alpha, beta', widget)).toBe(
				'alpha, beta',
			);
		}
	});

	it('treats an unclassifiable type as text rather than dropping the value', () => {
		expect(coercePropertyValueForWidget('anything', undefined)).toBe(
			'anything',
		);
		expect(coercePropertyValueForWidget('anything', 'not-a-widget')).toBe(
			'anything',
		);
	});

	it('resolves the widget through the same vocabulary the renderer uses', () => {
		expect(resolveCorePropertyWidget('boolean')).toBe('checkbox');
		expect(resolveCorePropertyWidget('list')).toBe('multitext');
		expect(resolveCorePropertyWidget('unknown')).toBe('unknown');
	});
});

// The coerced value has to survive the write itself: the queued operation
// replaces the matching element inside the frontmatter, and that is where the
// runtime type either lands or is lost.
describe('U121-003 the queued replacement carries the runtime type', () => {
	it('writes a boolean over a boolean, not the string "true"', () => {
		const coerced = coercePropertyValueForWidget('true', 'checkbox');
		const result = replaceMatchingPropertyValue(false, 'false', coerced);

		expect(result.changed).toBe(true);
		expect(result.value).toBe(true);
		expect(typeof result.value).toBe('boolean');
	});

	it('writes a number over a number, not the string "42"', () => {
		const coerced = coercePropertyValueForWidget('42', 'number');
		const result = replaceMatchingPropertyValue(7, '7', coerced);

		expect(result.value).toBe(42);
		expect(typeof result.value).toBe('number');
	});

	it('replaces one element of a list and leaves the rest untouched', () => {
		const coerced = coercePropertyValueForWidget('gamma', 'multitext');
		const result = replaceMatchingPropertyValue(
			['alpha', 'beta'],
			'alpha',
			coerced,
		);

		expect(result.value).toEqual(['gamma', 'beta']);
	});
});

// The renderer reports a committed edit as a string and cannot know the
// property's type discipline; the Props adapter is the one place that does.
describe('U121-003 the Props adapter coerces before it queues', () => {
	// The context menu's Rename modal writes through the same vault path, so it
	// carried the same flip: renaming a number's value through the modal wrote
	// the string back.
	it('coerces the modal rename as well as the inline edit', () => {
		expect(propsExplorerSource).toMatch(
			/private async _renameValue\([\s\S]{0,500}coercePropertyValueForWidget/,
		);
	});

	it('routes the inline edit through the widget coercion', () => {
		expect(propsExplorerSource).toContain('coercePropertyValueForWidget');
		expect(propsExplorerSource).not.toMatch(
			/onRenameValue:\s*\(next\)\s*=>\s*\{\s*[^}]*_replaceValueInVault\(\s*node\.meta\.propName,\s*rawValue,\s*next,?\s*\)/,
		);
	});
});
