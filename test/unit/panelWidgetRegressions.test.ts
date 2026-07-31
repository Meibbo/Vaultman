// eslint-disable-next-line import/no-nodejs-modules -- source guard reads the root CSS file in Vitest's Node environment.
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { resolveCondensedPanelWidgetOverflow } from '../../src/logic/logicPanelWidgetOverflow';
import navbarSource from '../../src/components/layout/navbarFilters.svelte?raw';

const stylesSource = readFileSync(
	new URL('../../styles.css', import.meta.url),
	'utf8',
);

/**
 * U121-029 — the regressions the dev found in the panelWidget refactor.
 *
 * Each case pins the *cause*, not the symptom, because every one of them was a
 * geometry assumption that stopped holding when the toolbar moved out of the
 * page and became a Scene-owned widget.
 */
describe('U121-029 panelWidget overflow regressions', () => {
	const nodes = [
		{ id: 'files:tabs', width: 40 },
		{ id: 'files:view', width: 40 },
		{ id: 'files:sort', width: 40 },
		{ id: 'files:search', width: 40 },
	];

	it('keeps every node visible when the bar cannot be measured', () => {
		// The flicker: a page mid-slide, a hidden toolbar (`height: 0`), a
		// collapsed sidebar or a deferred mobile drawer all report 0 here.
		// Treating that as "nothing fits" condensed the whole bar into Tools for
		// one frame and then restored it.
		for (const availableWidth of [0, -1, -320]) {
			const result = resolveCondensedPanelWidgetOverflow({
				availableWidth,
				nodes,
				gap: 4,
				toolsWidth: 30,
			});
			expect(result.overflowIds).toEqual([]);
			expect(result.visibleIds).toEqual(nodes.map((node) => node.id));
		}
	});

	it('still condenses normally once a real width arrives', () => {
		const result = resolveCondensedPanelWidgetOverflow({
			availableWidth: 120,
			nodes,
			gap: 4,
			toolsWidth: 30,
		});
		expect(result.overflowIds.length).toBeGreaterThan(0);
	});

	it('skips the measurement pass instead of packing a zero width', () => {
		expect(navbarSource).toContain('const availableWidth = actionsEl.clientWidth;');
		expect(navbarSource).toContain('if (availableWidth <= 0) return;');
		// And skips it when nothing has been laid out yet, which is the other
		// half of the flicker (a fully unmeasured bar reads as "it all fits").
		expect(navbarSource).toContain(
			'if (measuredNodes.every((node) => node.width <= 0)) return;',
		);
	});

	it('caches measured widths by node, not by the projecting provider', () => {
		// Node ids are `provider:local`, so keying the cache on the projected id
		// threw away every width on each provider switch — the bar expanded fully
		// for a frame and condensed again.
		expect(navbarSource).toContain('const measuredWidthKey = (nodeId: string)');
		expect(navbarSource).toContain(
			'measuredNodeWidths.set(measuredWidthKey(id), width)',
		);
		expect(navbarSource).toContain(
			'measuredNodeWidths.get(measuredWidthKey(node.id))',
		);
	});

	it('lets the measurement win over the count heuristic once it has run', () => {
		// The heuristic hides at least two nodes whatever the width is, so leaving
		// it in charge made the measured pipeline dead code and over-condensed a
		// roomy toolbar.
		expect(navbarSource).toContain('overflowMeasured');
		const forced =
			navbarSource.match(/const forcedOverflowIds = \$derived\.by\([\s\S]*?\n\t\}\);/)?.[0] ??
			'';
		expect(forced).not.toBe('');
		expect(forced).toContain('overflowMeasured');
	});
});

describe('U121-029 phone toolbar anchoring', () => {
	it('un-positions the widget host on phone so the action bar can reach the frame', () => {
		// The phone action bar is `position: absolute; bottom: 0`. Before the
		// refactor it anchored to `.vaultman-page`; the new host is a
		// `position: relative` flex item only as tall as the 4px collapsed
		// header, so the bar collapsed into that strip — "no toolbar on mobile".
		expect(stylesSource).toContain('.vaultman-panel-widget-host {');
		expect(stylesSource).toMatch(
			/\.is-phone[^{]*\.vaultman-panel-widget-host \{\s*position: static;/,
		);
		// The bar itself still anchors and still has its height.
		expect(stylesSource).toContain('.vaultman-pages-viewport {');
	});
});

describe('U121-029 labelled node click area', () => {
	it('widens a labelled node without shrinking its height', () => {
		const block =
			stylesSource.match(
				/\.vaultman-filters-header \.vaultman-header-action-with-label \{[\s\S]*?\n\}/,
			)?.[0] ?? '';
		expect(block).not.toBe('');
		// `padding: 0 8px` rewrote the shorthand and zeroed the block padding a
		// `.clickable-icon` relies on for its height, so the node — and its hover
		// rectangle — lost height instead of only gaining width. Comments are
		// stripped first: this one names the old declaration.
		const declarations = block.replace(/\/\*[\s\S]*?\*\//g, '');
		expect(declarations).not.toMatch(/padding:\s*0/);
		expect(block).toContain('padding-inline: 8px');
		expect(block).toContain('min-block-size: var(--clickable-icon-size)');
		expect(block).toContain('width: auto');
	});
});
