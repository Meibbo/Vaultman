import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import tabContentSource from '../../src/components/pages/tabContent.svelte?raw';

const stylesSource = readFileSync(
	new URL('../../styles.css', import.meta.url),
	'utf8',
);

/**
 * U121-019 #51 — visual parity with Obsidian's core search results.
 *
 * Parity is asserted against the real core view, probed live on 1.12.3, not
 * against a redesign. Where core shows nothing, we show nothing.
 */

const previewHeader =
	tabContentSource.match(
		/class="tree-item-self search-result-file-title[\s\S]*?<span class="tree-item-inner">/,
	)?.[0] ?? '';

describe('content preview header matches core', () => {
	it('reads the header it means to guard', () => {
		expect(previewHeader).not.toBe('');
		expect(previewHeader).toContain('vaultman-content-preview-header');
	});

	it('carries no collapse glyph on the match count', () => {
		// Core's global search prints its result count as plain text. It has
		// neither a triangle nor a caret there — the collapse affordance lives on
		// the per-file rows below, which is the one place we keep it.
		expect(previewHeader).not.toContain('▼');
		expect(previewHeader).not.toContain('▶');
		expect(previewHeader).not.toContain('collapse-icon');
	});
});

describe('per-file rows collapse the way core does', () => {
	it('draws core’s caret, not a filled text triangle', () => {
		// Probed on the live core search view, Obsidian 1.12.3:
		//   <div class="tree-item-icon collapse-icon">
		//     <svg class="svg-icon right-triangle"><path d="M3 8L12 17L21 8">
		// Core draws a stroked caret and rotates it. We were printing `▼`/`▶`,
		// which is a different shape at a different weight and does not follow
		// the icon colour or size the theme sets.
		expect(tabContentSource).not.toContain('▼');
		expect(tabContentSource).not.toContain('▶');
		expect(tabContentSource).toContain('svg-icon right-triangle');
		expect(tabContentSource).toContain('M3 8L12 17L21 8');
	});

	it('marks the collapsed state on the icon so it can be rotated', () => {
		expect(tabContentSource).toMatch(/class:is-collapsed=/);
	});

	it('lets core do the rotating instead of rotating it a second time', () => {
		// `app.css`, verbatim:
		//
		//   .collapse-icon.is-collapsed svg.svg-icon {
		//     transform: rotate(calc(var(--direction) * -1 * 90deg));
		//   }
		//
		// The row carries `collapse-icon` and `is-collapsed` on the same element,
		// so that selector already matches and already points the caret right. A
		// rule of our own on `.vaultman-preview-chevron.is-collapsed` does not
		// replace it — the two compose, span -90° over svg -90°, and the caret
		// ends up pointing straight up. Core owns this rotation. We do not
		// reimplement what we are already inheriting.
		// Same for colour, size, stroke and the transition: `.collapse-icon
		// svg.svg-icon` sets all of them. The end state is no rule at all, so an
		// empty match is the pass we want — the loop guards the regression, which
		// is someone re-adding one of these properties.
		const chevronRules =
			stylesSource.match(/\.vaultman-preview-chevron[^{]*\{[^}]*\}/g) ?? [];
		for (const rule of chevronRules) {
			expect(rule).not.toMatch(/\btransform\s*:\s*rotate/);
			expect(rule).not.toMatch(/\b(color|width|height|stroke-width)\s*:/);
			expect(rule).not.toMatch(/\btransition\s*:/);
		}
	});
});
