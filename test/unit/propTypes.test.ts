import { describe, expect, it } from 'vitest';

import { resolveNativePropType, toNativePropType } from '../../src/logic/propTypes';

describe('resolveNativePropType', () => {
	it('uses Obsidian typeInfo before getWidget unknown results', () => {
		const manager = {
			getWidget: () => ({
				type: 'unknown',
				icon: 'lucide-file-question',
			}),
			getTypeInfo: () => ({
				expected: {
					type: 'text',
					icon: 'lucide-text',
				},
			}),
			getPropertyInfo: () => ({ widget: 'text' }),
		};

		expect(resolveNativePropType('status', 'unknown', manager)).toEqual({
			type: 'text',
			icon: 'lucide-text',
		});
	});

	it('does not let getWidget override propertyInfo for inferred text dates', () => {
		const manager = {
			getWidget: () => ({
				type: 'date',
				icon: 'lucide-calendar',
			}),
			getTypeInfo: () => ({
				expected: {
					type: 'text',
					icon: 'lucide-text',
				},
			}),
			getPropertyInfo: () => ({ widget: 'text' }),
		};

		expect(resolveNativePropType('date', 'unknown', manager)).toEqual({
			type: 'text',
			icon: 'lucide-text',
		});
	});

	it('keeps reserved property icons stable', () => {
		expect(resolveNativePropType('tags', 'unknown', null)).toEqual({
			type: 'tags',
			icon: 'lucide-tags',
		});
		expect(resolveNativePropType('cssclasses', 'unknown', null)).toEqual({
			type: 'cssclasses',
			icon: 'lucide-palette',
		});
	});

	it('maps display list type to Obsidian native multitext widget id', () => {
		expect(toNativePropType('list')).toBe('multitext');
		expect(toNativePropType('text')).toBe('text');
	});
});
