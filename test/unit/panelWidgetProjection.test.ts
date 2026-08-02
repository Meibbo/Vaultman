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

	it.each([
		{ providerId: 'files', expectedNodes: ['files.view', 'files.sort', 'files.reveal'] },
		{ providerId: 'props', expectedNodes: ['props.sort', 'props.filter'] },
		{ providerId: 'tags', expectedNodes: ['tags.sort'] },
		{ providerId: 'content', expectedNodes: ['content.case', 'content.regex'] },
		{ providerId: 'snippets', expectedNodes: ['snippets.new'] },
		{ providerId: 'plugins', expectedNodes: ['plugins.filter'] },
		{ providerId: 'statistics', expectedNodes: ['statistics.scope'] },
	])('resolves projection for $providerId correctly', ({ providerId, expectedNodes }) => {
		const testNodes: PanelWidgetNode[] = expectedNodes.map((id, index) => ({
			id,
			nodeKind: 'action',
			cellKind: 'action',
			presentation: 'button',
			label: id,
			icon: 'lucide-box',
			order: (index + 1) * 10,
			available: true,
			action: { id: `${id}.exec` },
		}));

		const projection = resolvePanelWidgetProjection({
			providerId,
			nodes: testNodes,
			config: {},
		});

		expect(projection.hostId).toBe(PANEL_WIDGET_HOST_ID);
		expect(projection.providerId).toBe(providerId);
		expect(projection.nodes.map((n) => n.id)).toEqual(expectedNodes);
	});
});

describe('Scene-owned Controller instance isolation and teardown', () => {
	function mockProjection(providerId: string): import('../../src/types/typePanelWidget').NavbarPanelWidgetState {
		return {
			providerId,
			actionPort: { invoke: async () => true },
			activeTab: 'files',
			filtersSearch: '',
			filtersSearchCategory: { files: 0, props: 0, tags: 0 },
			icon: () => ({ update: () => {} }),
		};
	}

	it('prevents a late publication from instance A from altering instance B when providerId and generation coincide', async () => {
		const { ScenePanelWidgetController } = await import(
			'../../src/logic/logicScenePanelWidgetController'
		);
		const controllerA = new ScenePanelWidgetController('scene-instance-A');
		const controllerB = new ScenePanelWidgetController('scene-instance-B');

		const genA = controllerA.begin('files');
		const genB = controllerB.begin('files');
		expect(genA).toBe(genB); // Same generation number 1

		const pubB = {
			sceneInstanceId: 'scene-instance-B',
			providerId: 'files',
			generation: genB,
			projection: mockProjection('files'),
		};
		controllerB.publish(pubB);
		expect(controllerB.current()?.sceneInstanceId).toBe('scene-instance-B');

		// Late publication from instance A targeting controller B
		const latePubA = {
			sceneInstanceId: 'scene-instance-A',
			providerId: 'files',
			generation: genA,
			projection: mockProjection('files'),
		};
		expect(controllerB.publish(latePubA)).toBeNull();
		expect(controllerB.current()?.sceneInstanceId).toBe('scene-instance-B');
	});

	it('invalidates outstanding publication on destroy and rejects future publications on new instance C', async () => {
		const { ScenePanelWidgetController } = await import(
			'../../src/logic/logicScenePanelWidgetController'
		);
		const controllerA = new ScenePanelWidgetController('scene-instance-A');
		const genA = controllerA.begin('files');

		controllerA.destroy();
		expect(controllerA.current()).toBeNull();

		const latePubA = {
			sceneInstanceId: 'scene-instance-A',
			providerId: 'files',
			generation: genA,
			projection: mockProjection('files'),
		};
		expect(controllerA.publish(latePubA)).toBeNull();

		const controllerC = new ScenePanelWidgetController('scene-instance-C');
		expect(controllerC.publish(latePubA)).toBeNull();
	});
});
