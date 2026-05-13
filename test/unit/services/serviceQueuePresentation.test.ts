import { describe, expect, it } from 'vitest';
import {
	presentQueueModel,
	queueActionIcon,
	queueActionLabel,
	queueActionTone,
	queueChildLabel,
} from '../../../src/services/serviceQueuePresentation';
import type { ExplorerRenderModel, ViewRow } from '../../../src/types/typeViews';
import type { PendingChange } from '../../../src/types/typeOps';
import type { NodeBase, QueueChange } from '../../../src/types/typeContracts';

function change(partial: Partial<PendingChange> & { type: PendingChange['type'] }): PendingChange {
	return {
		id: 'op',
		files: [],
		action: partial.action ?? 'set',
		details: partial.details ?? 'queued change',
		logicFunc: () => null,
		customLogic: true,
		...partial,
	} as PendingChange;
}

describe('serviceQueuePresentation', () => {
	it('maps queue action keys to stable parent labels and icons', () => {
		expect(queueActionLabel('delete')).toBe('delete');
		expect(queueActionIcon('delete')).toBe('lucide-trash-2');
		expect(queueActionTone('delete')).toBe('danger');
		expect(queueActionLabel('content_replace')).toBe('replace');
		expect(queueActionIcon('content_replace')).toBe('lucide-replace');
		expect(queueActionTone('content_replace')).toBe('warning');
		expect(queueActionLabel('apply_template')).toBe('template');
		expect(queueActionIcon('apply_template')).toBe('lucide-book-marked');
		expect(queueActionTone('apply_template')).toBe('accent');
	});

	it('labels queue child rows by object kind instead of operation wording', () => {
		expect(
			queueChildLabel(
				change({
					type: 'property',
					action: 'delete',
					property: 'status',
					oldValue: 'draft',
				}),
			),
		).toBe('value');
		expect(
			queueChildLabel(
				change({
					type: 'property',
					action: 'delete',
					property: 'status',
				}),
			),
		).toBe('property');
		expect(queueChildLabel(change({ type: 'tag', action: 'delete', tag: '#idea' }))).toBe('tag');
		expect(queueChildLabel(change({ type: 'file_delete', action: 'delete' }))).toBe('file');
		expect(queueChildLabel(change({ type: 'content_replace', action: 'replace' }))).toBe('content');
		expect(
			queueChildLabel(
				change({
					type: 'template',
					action: 'apply',
					templateFileStr: 'Template.md',
					templateContent: '',
				}),
			),
		).toBe('template');
	});

	it('presents grouped queue rows with parent counts and stripped child operation badges', () => {
		const child = {
			id: 'op-1',
			group: 'delete_prop',
			change: change({
				id: 'op-1',
				type: 'property',
				action: 'delete',
				property: 'status',
				oldValue: 'draft',
			}),
			depth: 1,
		} satisfies QueueChange & { depth: number };
		const model = modelWithRows([
			{
				id: 'queue-action:delete',
				node: {
					id: 'queue-action:delete',
					kind: 'group',
					groupKey: 'delete',
					count: 2,
					label: 'delete',
					depth: 0,
				},
				label: 'delete',
				icon: undefined,
				cells: [],
				layers: {},
				actions: [],
			},
			{
				id: child.id,
				node: child,
				label: 'delete',
				icon: 'lucide-trash-2',
				cells: [],
				cls: 'existing',
				layers: {
					icons: [{ id: 'op-icon', icon: 'lucide-trash-2', source: 'operation' }],
					badges: { ops: [{ id: 'op-badge', label: 'delete' }] },
					state: { pending: true, deleted: true },
				},
				actions: [],
			},
		]);

		const presented = presentQueueModel(model);

		expect(presented.rows[0]).toMatchObject({
			label: 'delete',
			icon: 'lucide-trash-2',
			cls: 'is-queue-parent',
		});
		expect(presented.rows[0].layers.badges?.counts?.[0]).toMatchObject({
			id: 'queue-action:delete:count',
			label: '2',
			tone: 'neutral',
		});
		expect(presented.rows[1]).toMatchObject({
			label: 'value',
			icon: undefined,
			cls: 'existing is-queue-child',
		});
		expect(presented.rows[1].layers.icons).toBeUndefined();
		expect(presented.rows[1].layers.badges?.ops).toBeUndefined();
		expect(presented.rows[1].layers.state?.pending).toBeUndefined();
		expect(presented.rows[1].layers.state?.deleted).toBeUndefined();
	});
});

function modelWithRows<TNode extends NodeBase>(
	rows: ViewRow<TNode>[],
): ExplorerRenderModel<TNode> {
	return {
		explorerId: 'queue',
		mode: 'list',
		rows,
		columns: [],
		groups: [],
		selection: { ids: new Set() },
		focus: { id: null },
		sort: { id: 'manual', direction: 'asc' },
		search: { query: '' },
		virtualization: { rowHeight: 32, overscan: 5 },
		capabilities: {},
	};
}
