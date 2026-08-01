import { describe, expect, it } from 'vitest';

import {
	PANEL_WIDGET_HOST_ID,
	resolvePanelWidgetProjection,
} from '../../src/logic/logicPanelWidgetProjection';
import type { PanelWidgetNode } from '../../src/types/typePanelWidget';

const nodes: PanelWidgetNode[] = [
	{
		id: 'files.view',
		nodeKind: 'action',
		cellKind: 'action',
		presentation: 'menu',
		label: 'View',
		icon: 'lucide-layout-grid',
		order: 10,
		available: true,
		action: { id: 'files.view.open' },
	},
	{
		id: 'files.sort',
		nodeKind: 'action',
		cellKind: 'action',
		presentation: 'menu',
		label: 'Sort',
		icon: 'lucide-arrow-up-down',
		order: 20,
		available: true,
		action: { id: 'files.sort.open' },
	},
	{
		id: 'files.reveal',
		nodeKind: 'action',
		cellKind: 'action',
		presentation: 'button',
		label: 'Reveal active file',
		icon: 'lucide-gallery-vertical',
		order: 30,
		available: false,
		action: { id: 'files.reveal-active' },
	},
];

describe('Scene-owned Navbar panelWidget projection', () => {
	it('keeps one host identity while provider projections change', () => {
		const files = resolvePanelWidgetProjection({
			providerId: 'files',
			nodes,
			config: {},
		});
		const statistics = resolvePanelWidgetProjection({
			providerId: 'statistics',
			nodes: [
				{
					...nodes[0],
					id: 'statistics.scope',
					action: { id: 'statistics.scope.open' },
				},
			],
			config: {},
		});

		expect(files.hostId).toBe(PANEL_WIDGET_HOST_ID);
		expect(statistics.hostId).toBe(PANEL_WIDGET_HOST_ID);
		expect(files.providerId).toBe('files');
		expect(statistics.providerId).toBe('statistics');
	});

	it('resolves PVPUI order and visibility without embedding handlers', () => {
		const projection = resolvePanelWidgetProjection({
			providerId: 'files',
			nodes,
			config: {
				nodeOrder: ['files.sort', 'files.view', 'files.reveal'],
				hiddenNodeIds: ['files.view'],
			},
		});

		expect(projection.nodes.map((node) => node.id)).toEqual([
			'files.sort',
			'files.reveal',
		]);
		expect(projection.nodes[1]?.available).toBe(false);
		expect(projection.nodes.every((node) => !('invoke' in node))).toBe(true);
		expect(projection.nodes[0]?.action).toEqual({ id: 'files.sort.open' });
	});

	it('rejects duplicate node identities before they can corrupt focus or routing', () => {
		expect(() =>
			resolvePanelWidgetProjection({
				providerId: 'files',
				nodes: [nodes[0], { ...nodes[1], id: nodes[0].id }],
				config: {},
			}),
		).toThrow(/duplicate panelWidget node id/i);
	});
});
