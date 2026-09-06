import { describe, expect, it } from 'vitest';
import { PropsExplorerPanel } from '../../src/components/containers/explorerProps';
import { buildTransactionTelemetry } from '../../src/logic/logicTransactionBar';
import type { TreeNode, PropMeta } from '../../src/types/typeTree';

describe('U130-04 moveTransactionNodes (Step 1)', () => {
	it('aplana jerarquicamente el arbol proyectado para la telemetria', () => {
		const mockChildren: TreeNode<PropMeta>[] = Array.from({ length: 10 }, (_, i) => ({
			id: `val:status:${i}`,
			label: `v${i}`,
			depth: 1,
			children: [],
			meta: {
				propName: 'status',
				rawValue: `v${i}`,
				isValueNode: true,
			} as PropMeta,
		}));

		const mockTree: TreeNode<PropMeta>[] = [
			{
				id: 'prop:status',
				label: 'status',
				depth: 0,
				children: mockChildren,
				meta: {
					propName: 'status',
					rawValue: '',
					isValueNode: false,
				} as PropMeta,
			},
			{
				id: 'prop:destination',
				label: 'destination',
				depth: 0,
				children: [],
				meta: {
					propName: 'destination',
					rawValue: '',
					isValueNode: false,
				} as PropMeta,
			},
		];

		const fakePanel = {
			logic: {
				getTree: () => mockTree,
			},
		};

		const barNodes = PropsExplorerPanel.prototype.moveTransactionNodes.call(fakePanel);

		// 1 prop con 10 values + 1 destino = 12 nodos
		expect(barNodes).toHaveLength(12);

		const propNode = barNodes.find((n) => n.id === 'prop:status');
		expect(propNode).toBeDefined();
		expect(propNode?.label).toBe('status');
		expect(propNode?.childIds).toHaveLength(10);
		expect(propNode?.childIds[0]).toBe('val:status:0');

		// Telemetria jerarquica: seleccionar 'prop:status' debe dar 11 nodos
		const telemetry = buildTransactionTelemetry({
			originIds: ['prop:status'],
			destinationIds: ['prop:destination'],
			nodes: barNodes,
			rejection: null,
		});

		expect(telemetry.originCount).toBe(11);
		expect(telemetry.originLabels).toHaveLength(11);
		expect(telemetry.destinationCount).toBe(1);
		expect(telemetry.destinationLabels).toEqual(['destination']);
	});
});
