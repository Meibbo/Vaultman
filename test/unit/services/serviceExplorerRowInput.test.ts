import { describe, expect, it } from 'vitest';
import {
	buildRowInputIdIndex,
	resolveRowInputRevealIndex,
	rowInputCallbackId,
	rowInputFromSnapshotRow,
	rowInputFromTreeNode,
	rowInputFromViewRow,
	rowInputGroupKey,
	rowInputToTreeNode,
	rowInputVirtualKey,
} from '../../../src/services/serviceExplorerRowInput';
import type { QueueChange } from '../../../src/types/typeContracts';
import type { ExplorerRevealTarget, ExplorerSnapshotRow } from '../../../src/types/typeExplorerDataPlane';
import type { TreeNode } from '../../../src/types/typeNode';
import type { ViewLayers, ViewRow } from '../../../src/types/typeViews';

type FileMetaLite = {
	file: { path: string } | null;
	folderPath: string;
	isFolder: boolean;
	layers?: ViewLayers;
};

function fileNode(id: string, label: string, depth = 0): TreeNode<FileMetaLite> {
	return {
		id,
		label,
		depth,
		icon: 'lucide-file',
		cls: 'source-row',
		meta: {
			file: { path: id },
			folderPath: 'Projects',
			isFolder: false,
		},
	};
}

function snapshotRow(node: TreeNode<FileMetaLite>): ExplorerSnapshotRow<FileMetaLite> {
	return {
		id: node.id,
		label: node.label,
		depth: node.depth,
		parentId: 'folder:Projects',
		childrenIds: [],
		node,
		kind: 'file',
		domainKey: `file:${node.id}`,
		path: node.id,
	};
}

describe('serviceExplorerRowInput', () => {
	it('keeps snapshot, TreeNode, and ViewRow row ids stable for adapter keys', () => {
		const node = fileNode('Projects/Alpha.md', 'Alpha');
		const snapshotInput = rowInputFromSnapshotRow(snapshotRow(node));
		const treeInput = rowInputFromTreeNode({ ...node, label: 'Alpha renamed' });
		const viewInput = rowInputFromViewRow({
			id: node.id,
			node,
			label: 'Alpha table row',
			cells: [],
			layers: {},
			actions: [],
		});

		expect(snapshotInput).toMatchObject({
			id: 'Projects/Alpha.md',
			callbackId: 'Projects/Alpha.md',
			source: 'snapshot',
			parentId: 'folder:Projects',
			domainKey: 'file:Projects/Alpha.md',
			path: 'Projects/Alpha.md',
		});
		expect(treeInput.id).toBe('Projects/Alpha.md');
		expect(viewInput.id).toBe('Projects/Alpha.md');
		expect(rowInputVirtualKey([snapshotInput, treeInput, viewInput], 0)).toBe('Projects/Alpha.md');
		expect(rowInputVirtualKey([snapshotInput], 9)).toBe(9);
	});

	it('bridges ViewLayers back to legacy TreeNode decorations for compatibility adapters', () => {
		const node = fileNode('Projects/Alpha.md', 'Alpha');
		const layers: ViewLayers = {
			badges: {
				ops: [
					{
						id: 'remove-badge',
						label: 'Delete queued',
						icon: 'lucide-trash-2',
						tone: 'danger',
						solid: true,
						actionId: 'remove',
						sourceId: 'op-delete-alpha',
					},
				],
			},
			highlights: {
				query: [{ start: 0, end: 5 }],
			},
			state: {
				activeFilter: true,
				selected: true,
				focused: true,
				deleted: true,
				warning: true,
			},
		};
		const operation = {
			id: 'op-delete-alpha',
			group: 'delete_file',
			change: { id: 'op-delete-alpha' },
		} as unknown as QueueChange;

		const bridged = rowInputToTreeNode(rowInputFromSnapshotRow(snapshotRow(node), { layers }), {
			deletedClass: 'is-deleted',
			operations: [operation],
		});

		expect(bridged).not.toBe(node);
		expect(bridged.id).toBe(node.id);
		expect(bridged.badges).toEqual([
			expect.objectContaining({
				text: 'Delete queued',
				icon: 'lucide-trash-2',
				color: 'red',
				solid: true,
				queueIndex: 0,
			}),
		]);
		expect(bridged.highlights).toEqual([{ start: 0, end: 5 }]);
		expect(bridged.cls?.split(/\s+/)).toEqual(
			expect.arrayContaining([
				'source-row',
				'is-active-filter',
				'is-selected',
				'is-focused',
				'is-deleted',
				'vm-badge-warning',
			]),
		);
		expect(bridged.meta.layers).toBe(layers);
	});

	it('uses semantic row ids for callbacks rather than visual group keys', () => {
		const alpha = rowInputFromTreeNode(fileNode('Projects/Alpha.md', 'Alpha'));
		const beta = rowInputFromTreeNode(fileNode('Projects/Beta.md', 'Beta'));

		expect(rowInputCallbackId(alpha)).toBe('Projects/Alpha.md');
		expect(rowInputCallbackId(beta)).toBe('Projects/Beta.md');
		expect(rowInputGroupKey([alpha, beta], 0)).toBe('Projects/Alpha.md\u0000Projects/Beta.md');
	});

	it('resolves reveal targets through revision-aware row lookup inputs', () => {
		const rows = [
			rowInputFromTreeNode(fileNode('Projects/Alpha.md', 'Alpha')),
			rowInputFromTreeNode(fileNode('Projects/Beta.md', 'Beta')),
		];
		const target: ExplorerRevealTarget = {
			id: 'Projects/Beta.md',
			serial: 2,
			minSnapshotRevision: 7,
			reason: 'selection',
			align: 'center',
		};

		expect(
			resolveRowInputRevealIndex({
				rows,
				target,
				snapshotRevision: 6,
				idToIndex: buildRowInputIdIndex(rows),
			}),
		).toBe(-1);
		expect(
			resolveRowInputRevealIndex({
				rows,
				target,
				snapshotRevision: 7,
				idToIndex: new Map([['Projects/Beta.md', 0]]),
			}),
		).toBe(1);
		expect(
			resolveRowInputRevealIndex({
				rows,
				target: { id: 'Projects/Alpha.md', serial: 3 },
				snapshotRevision: null,
			}),
		).toBe(0);
	});

	it('keeps virtualizer boundaries adapter-local by exposing only row and row-group keys', () => {
		const rows = [
			rowInputFromTreeNode(fileNode('Projects/Alpha.md', 'Alpha')),
			rowInputFromTreeNode(fileNode('Projects/Beta.md', 'Beta')),
			rowInputFromTreeNode(fileNode('Projects/Gamma.md', 'Gamma')),
		];

		expect(rowInputVirtualKey(rows, 2)).toBe('Projects/Gamma.md');
		expect(rowInputVirtualKey(rows, 20)).toBe(20);
		expect(rowInputGroupKey(rows.slice(0, 2), 0)).toBe(
			'Projects/Alpha.md\u0000Projects/Beta.md',
		);
		expect(rowInputGroupKey([], 4)).toBe(4);
	});

	it('preserves table/card Polish row payloads when adapting existing ViewRows', () => {
		const node = fileNode('Projects/Alpha.md', 'Alpha');
		const viewRow: ViewRow<TreeNode<FileMetaLite>> = {
			id: node.id,
			node,
			label: 'Alpha table row',
			detail: 'Projects/Alpha.md',
			icon: 'lucide-file-text',
			depth: 1,
			cls: 'table-polish',
			cells: [{ id: `${node.id}:label`, columnId: 'label', value: 'Alpha', display: 'Alpha' }],
			layers: { state: { activeFilter: true } },
			actions: [{ id: 'open', label: 'Open' }],
			disabled: true,
		};

		expect(rowInputFromViewRow(viewRow)).toMatchObject({
			id: node.id,
			callbackId: node.id,
			source: 'view-row',
			label: 'Alpha table row',
			detail: 'Projects/Alpha.md',
			icon: 'lucide-file-text',
			depth: 1,
			cls: 'table-polish',
			cells: viewRow.cells,
			actions: viewRow.actions,
			disabled: true,
		});
	});
});
