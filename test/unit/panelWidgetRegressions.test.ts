// eslint-disable-next-line import/no-nodejs-modules -- source guard reads the root CSS file in Vitest's Node environment.
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
	MIN_INLINE_SEARCH_WIDTH,
	resolveCondensedPanelWidgetOverflow,
	searchNeedsOwnRow,
} from '../../src/logic/logicPanelWidgetOverflow';
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
		expect(navbarSource).toContain(
			'const availableWidth = availableToolbarWidth(actionsEl);',
		);
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
			'measuredNodeWidths.set(measuredPresentationKey(id), width)',
		);
		expect(navbarSource).toContain(
			'measuredNodeWidths.get(measuredPresentationKey(node.id))',
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

describe('U121-029 search field second row', () => {
	it('stays open until its search action toggles it closed', () => {
		expect(navbarSource).not.toContain('function handleSearchFocusOut');
		expect(navbarSource).not.toContain('onfocusout=');
		expect(navbarSource).not.toContain(
			'class:is-active={searchExpanded || filtersSearch.length > 0}',
		);
		const clearButton =
			navbarSource.match(
				/class="vaultman-filters-search-clear"[\s\S]*?<\/button>/,
			)?.[0] ?? '';
		expect(clearButton).not.toBe('');
		expect(clearButton).not.toContain('searchExpanded = false');
	});

	it('uses the same square desktop field in inline and second-row layouts', () => {
		expect(stylesSource).toMatch(
			/\.vaultman-filters-header-search-pill--inline,\s*\n\.vaultman-filters-header-search-pill--row\s*\{[^}]*border-radius:\s*0;/,
		);
	});

	it('keeps the field inline only while a usable width is left', () => {
		// Room for the nodes and a wide field: stays inline.
		expect(
			searchNeedsOwnRow({
				availableWidth: 600,
				nodeWidths: [30, 30, 30, 30],
				gap: 2,
				toolsWidth: 0,
			}),
		).toBe(false);
		// The same nodes in a sidebar: the leftover is not a usable field.
		expect(
			searchNeedsOwnRow({
				availableWidth: 260,
				nodeWidths: [30, 30, 30, 30],
				gap: 2,
				toolsWidth: 30,
			}),
		).toBe(true);
	});

	it('answers on the boundary, not on a breakpoint', () => {
		const base = { nodeWidths: [100], gap: 0, toolsWidth: 0 };
		expect(
			searchNeedsOwnRow({ ...base, availableWidth: 100 + MIN_INLINE_SEARCH_WIDTH }),
		).toBe(false);
		expect(
			searchNeedsOwnRow({
				...base,
				availableWidth: 100 + MIN_INLINE_SEARCH_WIDTH - 1,
			}),
		).toBe(true);
	});

	it('decides nothing when the bar cannot be measured', () => {
		expect(
			searchNeedsOwnRow({
				availableWidth: 0,
				nodeWidths: [30],
				gap: 2,
				toolsWidth: 0,
			}),
		).toBe(false);
	});

	it('renders the field as a sibling row, never as a wrapped flex item', () => {
		// Wrapping the action row is what let the Tools button be the thing that
		// wrapped while the field stayed inline.
		expect(navbarSource).toContain('searchNeedsOwnRow({');
		expect(navbarSource).toContain('searchOwnsRow');
		expect(navbarSource).toContain('{#if showSearchInput && !searchOwnsRow}');
		expect(navbarSource).toContain('class="vaultman-filters-search-row"');
		expect(navbarSource).toContain("searchControl('row')");
		expect(stylesSource).toContain('.vaultman-filters-search-row');
		// The 799px container query that fought the packer is gone. A historical
		// explanation may still mention it in a comment.
		expect(stylesSource).not.toMatch(/^\s*@container \(max-width: 799px\)/m);
		// And the decision is strategy-independent: it is computed before the
		// condensed-only early return.
		const measure =
			navbarSource.match(
				/function measurePanelWidgetOverflow\(\): void \{[\s\S]*?\n\t\}/,
			)?.[0] ?? '';
		expect(measure).not.toBe('');
		expect(measure.indexOf('searchNeedsOwnRow({')).toBeLessThan(
			measure.indexOf("toolbarOverflowStrategy !== 'condensed'"),
		);
	});

	it('measures the two search presentations separately', () => {
		// One cache key for the icon button and the expanded pill meant the pill's
		// ~220px was still on record after it closed, so the packer condensed a
		// 24px button into Tools with five nodes' worth of room to spare.
		expect(navbarSource).toContain('const measuredPresentationKey =');
		expect(navbarSource).toContain("'search:input'");
		expect(navbarSource).toContain("'search:button'");
		expect(navbarSource).toContain(
			'measuredNodeWidths.set(measuredPresentationKey(id), width)',
		);
	});

	it('moves search before condensing any action node', () => {
		const searchNode =
			navbarSource.match(
				/append\(\s*'search',[\s\S]*?'search',\s*false,\s*\);/,
			)?.[0] ?? '';
		expect(searchNode).not.toBe('');
		const measure =
			navbarSource.match(
				/function measurePanelWidgetOverflow\(\): void \{[\s\S]*?\n\t\}/,
			)?.[0] ?? '';
		const widths =
			measure.match(
				/const barNodeWidths =[\s\S]*?;\n\t\t\tconst nextSearchOwnsRow/,
			)?.[0] ?? '';
		expect(widths).not.toBe('');
		// Existing overflow is an output of the packer, not permission for search
		// to keep nodes hidden so it can remain inline.
		expect(widths).not.toContain('forcedOverflowIds');
	});

	it('remeasures when the overflow strategy or search presentation changes', () => {
		const effect =
			navbarSource.match(
				/\$effect\(\(\) => \{[\s\S]*?schedulePanelWidgetOverflowMeasure\(\);\n\t\}\);/,
			)?.[0] ?? '';
		expect(effect).not.toBe('');
		expect(effect).toContain('void toolbarOverflowStrategy;');
		expect(effect).toContain('void showSearchInput;');
	});
});

describe('U121-029 Tools menu follows the projection', () => {
	it('lists exactly the overflowed nodes, generically', () => {
		// The hand-written list only knew a fixed set of local ids, and some of
		// its entries carried narrower guards than the nodes themselves — so Text
		// lost `reveal` and `collapse` at min-width instead of finding them in
		// Tools.
		const menu =
			navbarSource.match(
				/function openToolsMenu\(event: MouseEvent\) \{[\s\S]*?\n\t\}/,
			)?.[0] ?? '';
		expect(menu).not.toBe('');
		expect(menu).toContain('for (const node of panelWidgetProjection.nodes)');
		expect(menu).toContain('if (!forcedOverflowIds.includes(node.id)) continue;');
		expect(menu).toContain('.setTitle(node.label)');
		// No per-id availability conditions may reappear in the menu.
		expect(menu).not.toContain('expansionActionAvailableForActiveTab');
		expect(menu).not.toContain("activeTab === 'files'");
		expect(menu).not.toContain('createActionsPlacement');
	});

	it('preserves disabled state in the projected node used by Tools', () => {
		expect(navbarSource).toContain('available = true');
		expect(navbarSource).toContain('available,\n\t\t\t\tcondensable');
		expect(navbarSource).toContain('action.disabled !== true');
		expect(navbarSource).toContain('command.available');
	});
});

describe('U121-029 themed toolbar width', () => {
	it('measures the line from its containing block, not the themed container', () => {
		// Velocity collapses `.nav-buttons-container` to `width: 48px; height: 0`
		// and reveals it on hover. Measuring the container fed the packer 48px, so
		// it condensed to its two-node minimum and our own `overflow: hidden`
		// clipped whatever the hover revealed.
		expect(navbarSource).toContain('function availableToolbarWidth(');
		expect(navbarSource).toContain('const parent = actions.parentElement;');
		expect(navbarSource).toContain('return Math.max(own, inner);');
		expect(navbarSource).toContain(
			'const availableWidth = availableToolbarWidth(actionsEl);',
		);
		expect(navbarSource).not.toContain('availableWidth: actionsEl.clientWidth');
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

	it('keeps the measured desktop search row out of the phone drawer', () => {
		expect(stylesSource).toMatch(
			/\.is-phone[^{]*\.vaultman-filters-search-row \{\s*display: none;/,
		);
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
