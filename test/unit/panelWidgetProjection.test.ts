import { describe, expect, it } from 'vitest';

import {
	PANEL_WIDGET_HOST_ID,
	dropIndexForPointer,
	reorderLocalIds,
	reorderLocalIdsToSlot,
	resolvePanelWidgetProjection,
	resolveToolbarDropMarker,
	resolveToolbarDropSlot,
	resolveToolbarNodeOrder,
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

describe('U130 panelWidget_bar drag reorder (Gv-faithful)', () => {
	it('resolveToolbarNodeOrder pone la scene primero y conserva el resto global', () => {
		expect(resolveToolbarNodeOrder(['p:a', 'p:b'], ['b', 'c'], 'p')).toEqual([
			'p:b',
			'p:c',
			'p:a',
		]);
		expect(resolveToolbarNodeOrder(['p:a'], [], 'p')).toEqual(['p:a']);
		expect(resolveToolbarNodeOrder(undefined, undefined, 'p')).toEqual([]);
	});

	it('dropIndexForPointer usa el punto medio del fantasma como Gv', () => {
		// Hermanos de 100px: bordes en 100/200/300; fantasma de 100 agarrado a 30.
		expect(dropIndexForPointer([100, 200, 300], 0, 30, 100)).toBe(0);
		expect(dropIndexForPointer([100, 200, 300], 120, 30, 100)).toBe(1);
		expect(dropIndexForPointer([100, 200, 300], 500, 30, 100)).toBe(3);
		expect(dropIndexForPointer([], 500, 30, 100)).toBe(0);
	});

	it('reorderLocalIds mueve delante del ancla y conserva guardados invisibles', () => {
		expect(reorderLocalIds(['a', 'b', 'c'], [], 'c', 'a')).toEqual([
			'c',
			'a',
			'b',
		]);
		expect(reorderLocalIds(['a', 'b', 'c'], [], 'a', null)).toEqual([
			'b',
			'c',
			'a',
		]);
		expect(reorderLocalIds(['a', 'b'], ['z'], 'b', 'a')).toEqual([
			'b',
			'a',
			'z',
		]);
		// Ancla desconocida = al final, sin duplicar.
		expect(reorderLocalIds(['a', 'b'], [], 'a', 'zzz')).toEqual(['b', 'a']);
	});

	it('resolveToolbarDropSlot resuelve slot N (después del último) al arrastrar el primero más allá del último', () => {
		// Visible: ['a', 'b', 'c']. Arrastrando 'a'. Hermanos: 'b' (50..100) y 'c' (100..150).
		const siblings = [
			{ localId: 'b', left: 50, right: 100 },
			{ localId: 'c', left: 100, right: 150 },
		];
		// Puntero más allá del último (x = 180 > c.mid 125)
		const res = resolveToolbarDropSlot(siblings, 180);
		expect(res).toEqual({
			slotIndex: 2,
			anchorLocalId: 'c',
			placement: 'after',
		});
		// Reorden resultante sitúa 'a' al final (slot 2)
		expect(reorderLocalIds(['a', 'b', 'c'], [], 'a', res.anchorLocalId, res.placement)).toEqual([
			'b',
			'c',
			'a',
		]);
	});

	it('resolveToolbarDropSlot resuelve slot 0 (antes del primero) al arrastrar el último antes del primero', () => {
		// Visible: ['a', 'b', 'c']. Arrastrando 'c'. Hermanos: 'a' (0..50) y 'b' (50..100).
		const siblings = [
			{ localId: 'a', left: 0, right: 50 },
			{ localId: 'b', left: 50, right: 100 },
		];
		// Puntero antes del primero (x = 10 < a.mid 25)
		const res = resolveToolbarDropSlot(siblings, 10);
		expect(res).toEqual({
			slotIndex: 0,
			anchorLocalId: 'a',
			placement: 'before',
		});
		// Reorden resultante sitúa 'c' al principio (slot 0)
		expect(reorderLocalIds(['a', 'b', 'c'], [], 'c', res.anchorLocalId, res.placement)).toEqual([
			'c',
			'a',
			'b',
		]);
	});

	it('resolveToolbarDropSlot discrimina mitad izquierda y derecha con destinos de anchura variable', () => {
		// Hermanos con anchuras variables: nodeA (100px: 0..100, mid 50), nodeB (40px: 110..150, mid 130)
		const siblings = [
			{ localId: 'nodeA', left: 0, right: 100 },
			{ localId: 'nodeB', left: 110, right: 150 },
		];

		// Mitad izquierda de nodeA (x = 30 < 50): antes de nodeA (slot 0)
		const leftA = resolveToolbarDropSlot(siblings, 30);
		expect(leftA).toEqual({ slotIndex: 0, anchorLocalId: 'nodeA', placement: 'before' });

		// Mitad derecha de nodeA (x = 75 >= 50, < 130): después de nodeA (slot 1)
		const rightA = resolveToolbarDropSlot(siblings, 75);
		expect(rightA).toEqual({ slotIndex: 1, anchorLocalId: 'nodeA', placement: 'after' });

		// Mitad izquierda de nodeB (x = 120 < 130): antes de nodeB (slot 1)
		const leftB = resolveToolbarDropSlot(siblings, 120);
		expect(leftB).toEqual({ slotIndex: 1, anchorLocalId: 'nodeB', placement: 'before' });

		// Mitad derecha de nodeB (x = 140 >= 130): después de nodeB (slot 2)
		const rightB = resolveToolbarDropSlot(siblings, 140);
		expect(rightB).toEqual({ slotIndex: 2, anchorLocalId: 'nodeB', placement: 'after' });
	});

	it('reorderLocalIdsToSlot y reorderLocalIds con placement ubican con exactitud', () => {
		const visible = ['a', 'b', 'c', 'd'];
		expect(reorderLocalIdsToSlot(visible, [], 'a', 0)).toEqual(['a', 'b', 'c', 'd']);
		expect(reorderLocalIdsToSlot(visible, [], 'a', 1)).toEqual(['b', 'a', 'c', 'd']);
		expect(reorderLocalIdsToSlot(visible, [], 'a', 3)).toEqual(['b', 'c', 'd', 'a']);
		expect(reorderLocalIds(visible, [], 'a', 'b', 'after')).toEqual(['b', 'a', 'c', 'd']);
		expect(reorderLocalIds(visible, [], 'a', 'd', 'after')).toEqual(['b', 'c', 'd', 'a']);
		expect(reorderLocalIds(visible, [], 'd', 'a', 'before')).toEqual(['d', 'a', 'b', 'c']);
	});

	it('resolveToolbarDropMarker no muestra nada si el ítem está sobre su slot original', () => {
		const visible = ['a', 'b', 'c'];
		// 'b' está originalmente en índice 1 y su preview está en índice 1
		expect(resolveToolbarDropMarker(visible, ['a', 'b', 'c'], 'b')).toBeNull();
		// 'a' está en índice 0
		expect(resolveToolbarDropMarker(visible, ['a', 'b', 'c'], 'a')).toBeNull();
		// 'c' está en índice 2
		expect(resolveToolbarDropMarker(visible, ['a', 'b', 'c'], 'c')).toBeNull();
	});

	it('resolveToolbarDropMarker muestra en el lado derecho apuntando a la derecha si está a la izquierda del original', () => {
		const visible = ['a', 'b', 'c'];
		// 'c' originalmente en índice 2, movido al slot 0 (izquierda del original):
		// preview: ['c', 'a', 'b'] -> currentSlotIndex = 0, originalSlotIndex = 2.
		// Debe colocarse en el lado derecho de 'c' (order 2) y apuntar a la derecha (hacia el original).
		const resC = resolveToolbarDropMarker(visible, ['c', 'a', 'b'], 'c');
		expect(resC).toEqual({
			show: true,
			side: 'right',
			direction: 'right',
			order: 2, // currentSlotIndex (0) * 2 + 2 = 2
			currentSlotIndex: 0,
			originalSlotIndex: 2,
		});

		// 'c' movido al slot 1:
		// preview: ['a', 'c', 'b'] -> currentSlotIndex = 1, originalSlotIndex = 2.
		// Lado derecho de 'c' (order 4) apuntando a la derecha.
		expect(resolveToolbarDropMarker(visible, ['a', 'c', 'b'], 'c')).toEqual({
			show: true,
			side: 'right',
			direction: 'right',
			order: 4, // 1 * 2 + 2 = 4
			currentSlotIndex: 1,
			originalSlotIndex: 2,
		});
	});

	it('resolveToolbarDropMarker muestra en el lado izquierdo apuntando a la izquierda si está a la derecha del original', () => {
		const visible = ['a', 'b', 'c'];
		// 'a' originalmente en índice 0, movido al slot 2 (derecha del original):
		// preview: ['b', 'c', 'a'] -> currentSlotIndex = 2, originalSlotIndex = 0.
		// Debe colocarse en el lado izquierdo de 'a' (order 4) y apuntar a la izquierda (hacia el original).
		const resA = resolveToolbarDropMarker(visible, ['b', 'c', 'a'], 'a');
		expect(resA).toEqual({
			show: true,
			side: 'left',
			direction: 'left',
			order: 4, // currentSlotIndex (2) * 2 = 4
			currentSlotIndex: 2,
			originalSlotIndex: 0,
		});

		// 'a' movido al slot 1:
		// preview: ['b', 'a', 'c'] -> currentSlotIndex = 1, originalSlotIndex = 0.
		// Lado izquierdo de 'a' (order 2) apuntando a la izquierda.
		expect(resolveToolbarDropMarker(visible, ['b', 'a', 'c'], 'a')).toEqual({
			show: true,
			side: 'left',
			direction: 'left',
			order: 2, // 1 * 2 = 2
			currentSlotIndex: 1,
			originalSlotIndex: 0,
		});
	});

	it('resolveToolbarDropMarker soporta las 4 direcciones (arriba/abajo/izquierda/derecha)', () => {
		const visible = ['a', 'b', 'c'];
		// Vertical: 'c' (index 2) movido arriba a index 0 -> lado inferior (bottom) apuntando hacia abajo (down)
		expect(
			resolveToolbarDropMarker(visible, ['c', 'a', 'b'], 'c', { orientation: 'vertical' }),
		).toEqual({
			show: true,
			side: 'bottom',
			direction: 'down',
			order: 2,
			currentSlotIndex: 0,
			originalSlotIndex: 2,
		});

		// Vertical: 'a' (index 0) movido abajo a index 2 -> lado superior (top) apuntando hacia arriba (up)
		expect(
			resolveToolbarDropMarker(visible, ['b', 'c', 'a'], 'a', { orientation: 'vertical' }),
		).toEqual({
			show: true,
			side: 'top',
			direction: 'up',
			order: 4,
			currentSlotIndex: 2,
			originalSlotIndex: 0,
		});

		// 2D con filas: originalRow 1, currentRow 0 (arriba) -> apunta hacia abajo (down)
		expect(
			resolveToolbarDropMarker(visible, ['c', 'a', 'b'], 'c', { originalRow: 1, currentRow: 0 }),
		).toEqual({
			show: true,
			side: 'bottom',
			direction: 'down',
			order: 2,
			currentSlotIndex: 0,
			originalSlotIndex: 2,
		});

		// 2D con filas: originalRow 0, currentRow 1 (abajo) -> apunta hacia arriba (up)
		expect(
			resolveToolbarDropMarker(visible, ['b', 'c', 'a'], 'a', { originalRow: 0, currentRow: 1 }),
		).toEqual({
			show: true,
			side: 'top',
			direction: 'up',
			order: 4,
			currentSlotIndex: 2,
			originalSlotIndex: 0,
		});
	});
});
