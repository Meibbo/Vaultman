import { describe, expect, it } from 'vitest';

import { resolveCondensedPanelWidgetOverflow } from '../../src/logic/logicPanelWidgetOverflow';

describe('measured panelWidget overflow', () => {
	const nodes = [
		{ id: 'tabs', width: 40 },
		{ id: 'view', width: 50 },
		{ id: 'sort', width: 30 },
		{ id: 'reveal', width: 30 },
	] as const;

	it('keeps every node at the exact measured boundary', () => {
		expect(
			resolveCondensedPanelWidgetOverflow({
				availableWidth: 174,
				nodes,
				gap: 8,
				toolsWidth: 32,
			}),
		).toEqual({
			visibleIds: ['tabs', 'view', 'sort', 'reveal'],
			overflowIds: [],
		});
	});

	it('moves the two rightmost nodes first, then one more at a time', () => {
		expect(
			resolveCondensedPanelWidgetOverflow({
				availableWidth: 173,
				nodes,
				gap: 8,
				toolsWidth: 32,
			}),
		).toEqual({
			visibleIds: ['tabs', 'view'],
			overflowIds: ['sort', 'reveal'],
		});

		expect(
			resolveCondensedPanelWidgetOverflow({
				availableWidth: 120,
				nodes,
				gap: 8,
				toolsWidth: 32,
			}),
		).toEqual({
			visibleIds: ['tabs'],
			overflowIds: ['view', 'sort', 'reveal'],
		});
	});

	it('uses current projection order after reorder or dynamic insertion', () => {
		const reordered = [nodes[0], nodes[3], nodes[1], nodes[2]];
		expect(
			resolveCondensedPanelWidgetOverflow({
				availableWidth: 173,
				nodes: reordered,
				gap: 8,
				toolsWidth: 32,
			}),
		).toEqual({
			visibleIds: ['tabs', 'reveal'],
			overflowIds: ['view', 'sort'],
		});
	});

	it('never moves non-condensable nodes into Tools', () => {
		expect(
			resolveCondensedPanelWidgetOverflow({
				availableWidth: 80,
				nodes: [
					{ id: 'provider-tabs', width: 48, condensable: false },
					{ id: 'pause', width: 32 },
					{ id: 'has', width: 32 },
					{ id: 'sort', width: 32 },
				],
				gap: 4,
				toolsWidth: 28,
			}),
		).toEqual({
			visibleIds: ['provider-tabs'],
			overflowIds: ['pause', 'has', 'sort'],
		});
	});

	it('returns identical layout signature on repeated equal measurements to prevent ResizeObserver loops', () => {
		const input = {
			availableWidth: 173,
			nodes,
			gap: 8,
			toolsWidth: 32,
		};
		const run1 = resolveCondensedPanelWidgetOverflow(input);
		const run2 = resolveCondensedPanelWidgetOverflow(input);
		expect(run1).toEqual(run2);
		expect(JSON.stringify(run1)).toBe(JSON.stringify(run2));
	});
});
