import { describe, expect, it, vi } from 'vitest';
import {
	applyManualNodeReorder,
	createManualDndService,
	manualWorkspacePayloadForNode,
	writeManualDndTransfer,
} from '../../../src/services/serviceManualDnd';
import { mockTFile } from '../../helpers/obsidian-mocks';
import type { TreeNode } from '../../../src/types/typeNode';

describe('serviceManualDnd', () => {
	it('toggles manual mode and notifies subscribers only on real changes', () => {
		const service = createManualDndService();
		const listener = vi.fn();
		service.subscribe(listener);

		service.setEnabled(true);
		service.setEnabled(true);
		service.toggle();

		expect(listener).toHaveBeenCalledTimes(2);
		expect(service.snapshot().enabled).toBe(false);
	});

	it('creates semantic drag sources from the clicked node and selected ids', () => {
		const service = createManualDndService({ enabled: true });
		const node = nodeOf('file:a', 'A.md');

		const source = service.sourceForNode('files', node, new Set(['file:a', 'file:c']));

		expect(source).toMatchObject({
			explorerId: 'files',
			kind: 'node',
			id: 'file:a',
			label: 'A.md',
			selectedIds: ['file:a', 'file:c'],
		});
	});

	it('builds workspace payloads for embeds, tags, props, and values', () => {
		const file = mockTFile('Notes/Alpha.md');

		expect(
			manualWorkspacePayloadForNode('files', {
				id: 'file:alpha',
				label: 'Alpha',
				depth: 0,
				meta: { file, isFolder: false, folderPath: 'Notes' },
			}),
		).toMatchObject({ kind: 'embed', text: '![[Notes/Alpha.md]]' });

		expect(
			manualWorkspacePayloadForNode('tags', {
				id: 'tag:project',
				label: 'project',
				depth: 0,
				meta: { tagPath: 'project' },
			}),
		).toMatchObject({ kind: 'tag', text: '#project' });

		expect(
			manualWorkspacePayloadForNode('props', {
				id: 'prop:status',
				label: 'status',
				depth: 0,
				meta: { propName: 'status', propType: 'text', isValueNode: false },
			}),
		).toMatchObject({ kind: 'property', text: 'status: ' });

		expect(
			manualWorkspacePayloadForNode('props', {
				id: 'value:status:done',
				label: 'done',
				depth: 1,
				meta: { propName: 'status', propType: 'text', isValueNode: true, rawValue: 'done' },
			}),
		).toMatchObject({ kind: 'value', text: 'status: done' });
	});

	it('writes markdown and vaultman metadata into a native DataTransfer', () => {
		const calls: Array<[string, string]> = [];
		const dataTransfer = {
			effectAllowed: 'none',
			setData: (type: string, value: string) => calls.push([type, value]),
		} as DataTransfer;

		writeManualDndTransfer(dataTransfer, {
			kind: 'tag',
			text: '#project',
			nodeId: 'tag:project',
			providerId: 'tags',
			label: 'project',
		});

		expect(dataTransfer.effectAllowed).toBe('copyMove');
		expect(calls).toContainEqual(['text/plain', '#project']);
		expect(calls).toContainEqual(['text/markdown', '#project']);
		expect(calls.some(([type]) => type === 'application/vnd.vaultman.node+json')).toBe(true);
	});

	it('reorders sibling nodes before or after a target while preserving multi-selection order', () => {
		const source = [nodeOf('a', 'A'), nodeOf('b', 'B'), nodeOf('c', 'C'), nodeOf('d', 'D')];

		expect(applyManualNodeReorder(source, ['a', 'c'], 'd', 'before').map((node) => node.id)).toEqual([
			'b',
			'a',
			'c',
			'd',
		]);
		expect(applyManualNodeReorder(source, ['a', 'c'], 'b', 'after').map((node) => node.id)).toEqual([
			'b',
			'a',
			'c',
			'd',
		]);
	});
});

function nodeOf(id: string, label: string): TreeNode {
	return { id, label, depth: 0, meta: {} };
}
