import { describe, expect, it } from 'vitest';

import { applyPropertyDragNodesToFrontmatter } from '../../src/utils/dragFrontmatter';

describe('applyPropertyDragNodesToFrontmatter', () => {
	it('adds property names without overwriting existing frontmatter', () => {
		const fm: Record<string, unknown> = { status: 'active' };

		const changed = applyPropertyDragNodesToFrontmatter(fm, [
			{ kind: 'property', property: 'status' },
			{ kind: 'property', property: 'Birthday' },
		]);

		expect(changed).toBe(true);
		expect(fm).toEqual({ status: 'active', Birthday: '' });
	});

	it('adds property value nodes as prop plus value', () => {
		const fm: Record<string, unknown> = {};

		const changed = applyPropertyDragNodesToFrontmatter(fm, [
			{
				kind: 'property-value',
				property: 'Birthday',
				value: '1990-01-01',
				mode: 'property-value',
			},
		]);

		expect(changed).toBe(true);
		expect(fm).toEqual({ Birthday: '1990-01-01' });
	});

	it('preserves scalar values by promoting conflicting additions to a list', () => {
		const fm: Record<string, unknown> = { project: 'alpha' };

		const changed = applyPropertyDragNodesToFrontmatter(fm, [
			{
				kind: 'property-value',
				property: 'project',
				value: 'beta',
				mode: 'property-value',
			},
		]);

		expect(changed).toBe(true);
		expect(fm).toEqual({ project: ['alpha', 'beta'] });
	});
});
