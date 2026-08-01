import { describe, expect, it } from 'vitest';

import {
	SNIPPET_CONTEXT_LEVELS,
	canShowLessContext,
	canShowMoreContext,
	lessContextLevel,
	moreContextLevel,
	snippetContextRadius,
} from '../../src/logic/logicSnippetContext';

/**
 * "Show more context" per node. Core exposes the same idea view-wide through
 * `SearchView.setExtraContext()` plus `onKeyShowMoreBefore` /
 * `onKeyShowMoreAfter`, over a boolean. Ours is per file row and stepped,
 * because the request was per node.
 *
 * The radius is a character count around the match. `buildSnippet` used a fixed
 * `CONTEXT = 40`, which is now level 0 rather than the only setting.
 */

describe('the context ladder', () => {
	it('starts at the slice the fixed CONTEXT used to cut', () => {
		expect(snippetContextRadius(0)).toBe(40);
	});

	it('widens with each level', () => {
		const radii = SNIPPET_CONTEXT_LEVELS.map((_, level) =>
			snippetContextRadius(level),
		);
		for (let i = 1; i < radii.length; i += 1) {
			expect(radii[i]).toBeGreaterThan(radii[i - 1]);
		}
	});

	it('clamps a level below the ladder to the narrowest slice', () => {
		expect(snippetContextRadius(-3)).toBe(snippetContextRadius(0));
	});

	it('clamps a level above the ladder to the widest slice', () => {
		const top = SNIPPET_CONTEXT_LEVELS.length - 1;
		expect(snippetContextRadius(top + 5)).toBe(snippetContextRadius(top));
	});
});

describe('moving along the ladder', () => {
	it('steps up until the widest slice, then stays', () => {
		const top = SNIPPET_CONTEXT_LEVELS.length - 1;
		expect(moreContextLevel(0)).toBe(1);
		expect(moreContextLevel(top)).toBe(top);
	});

	it('steps down until the narrowest slice, then stays', () => {
		expect(lessContextLevel(1)).toBe(0);
		expect(lessContextLevel(0)).toBe(0);
	});

	it('reports which way the node can still move', () => {
		// The control has to be able to say "no further" rather than sit there
		// looking live and doing nothing.
		const top = SNIPPET_CONTEXT_LEVELS.length - 1;
		expect(canShowMoreContext(0)).toBe(true);
		expect(canShowMoreContext(top)).toBe(false);
		expect(canShowLessContext(0)).toBe(false);
		expect(canShowLessContext(top)).toBe(true);
	});

	it('is reversible: up then down returns to where it started', () => {
		expect(lessContextLevel(moreContextLevel(1))).toBe(1);
	});
});
