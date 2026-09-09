import { describe, expect, it } from 'vitest';

import { shouldFaintRevealNode } from '../../src/logic/logicRevealFaint';

describe('shouldFaintRevealNode', () => {
	it('faints when the current file is outside a filtered scene list', () => {
		expect(
			shouldFaintRevealNode({
				filtered: true,
				currentPath: 'notes/outside.md',
				isListed: false,
				toggleActive: false,
			}),
		).toBe(true);
	});

	it('does not faint when the scene is not filtered', () => {
		expect(
			shouldFaintRevealNode({
				filtered: false,
				currentPath: 'notes/outside.md',
				isListed: false,
				toggleActive: false,
			}),
		).toBe(false);
	});

	it('does not faint when the current file is listed', () => {
		expect(
			shouldFaintRevealNode({
				filtered: true,
				currentPath: 'notes/inside.md',
				isListed: true,
				toggleActive: false,
			}),
		).toBe(false);
	});

	it('does not faint without an active file', () => {
		expect(
			shouldFaintRevealNode({
				filtered: true,
				currentPath: null,
				isListed: false,
				toggleActive: false,
			}),
		).toBe(false);
	});

	it('does not faint while the reveal-this-file toggle is held', () => {
		expect(
			shouldFaintRevealNode({
				filtered: true,
				currentPath: 'notes/outside.md',
				isListed: false,
				toggleActive: true,
			}),
		).toBe(false);
	});
});
