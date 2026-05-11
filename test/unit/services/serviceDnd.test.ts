import { describe, expect, it } from 'vitest';
import { createDndService, type DndDropTarget } from '../../../src/services/serviceDnd';

const SOURCE = {
	explorerId: 'files',
	kind: 'node',
	id: 'file:a',
	label: 'A.md',
} as const;

const TARGET: DndDropTarget = {
	explorerId: 'files',
	kind: 'node',
	id: 'file:b',
	label: 'B.md',
};

describe('serviceDnd', () => {
	it('starts a semantic drag snapshot with selected ids preserved', () => {
		const dnd = createDndService();

		const snapshot = dnd.beginDrag({
			...SOURCE,
			selectedIds: ['file:a', 'file:c'],
		});

		expect(snapshot.phase).toBe('dragging');
		expect(snapshot.source?.id).toBe('file:a');
		expect(snapshot.draggingIds).toEqual(['file:a', 'file:c']);
		expect(snapshot.candidate).toBeNull();
	});

	it('accepts same-explorer node reordering and returns a semantic drop result', () => {
		const dnd = createDndService();

		dnd.beginDrag(SOURCE);
		const snapshot = dnd.updateTarget(TARGET, 'before');
		const result = dnd.endDrag();

		expect(snapshot.candidate).toMatchObject({
			allowed: true,
			operation: 'reorder',
			position: 'before',
			target: { id: 'file:b' },
		});
		expect(result).toMatchObject({
			operation: 'reorder',
			sourceIds: ['file:a'],
			targetId: 'file:b',
			position: 'before',
		});
		expect(dnd.snapshot().phase).toBe('idle');
	});

	it('rejects self-drops and clears rejected candidates without returning a result', () => {
		const dnd = createDndService();

		dnd.beginDrag(SOURCE);
		const snapshot = dnd.updateTarget({ ...TARGET, id: 'file:a' }, 'after');

		expect(snapshot.candidate).toMatchObject({
			allowed: false,
			reason: 'self-drop',
		});
		expect(dnd.endDrag()).toBeNull();
		expect(dnd.snapshot().phase).toBe('idle');
	});

	it('uses explicit target operation support for cross-kind drops', () => {
		const dnd = createDndService();

		dnd.beginDrag(SOURCE);
		const snapshot = dnd.updateTarget(
			{
				explorerId: 'files',
				kind: 'group',
				id: 'folder:projects',
				label: 'Projects',
				accepts: ['move'],
			},
			'inside',
		);

		expect(snapshot.candidate).toMatchObject({
			allowed: true,
			operation: 'move',
			position: 'inside',
			target: { id: 'folder:projects' },
		});
	});

	it('rejects inside drops when a target only supports reordering', () => {
		const dnd = createDndService();

		dnd.beginDrag(SOURCE);
		const snapshot = dnd.updateTarget(
			{
				...TARGET,
				accepts: ['reorder'],
			},
			'inside',
		);

		expect(snapshot.candidate).toMatchObject({
			allowed: false,
			operation: null,
			reason: 'no-compatible-operation',
			position: 'inside',
		});
		expect(dnd.endDrag()).toBeNull();
	});

	it('uses explicit target support to detach a tab into the workspace', () => {
		const dnd = createDndService();

		dnd.beginDrag({
			explorerId: 'layout',
			kind: 'tab',
			id: 'explorer-files',
			label: 'Files',
			data: { surface: 'dock' },
		});
		dnd.updateTarget(
			{
				explorerId: 'layout',
				kind: 'group',
				id: 'workspace',
				label: 'Workspace',
				accepts: ['detach-tab'],
			},
			'inside',
		);
		const result = dnd.endDrag();

		expect(result).toMatchObject({
			operation: 'detach-tab',
			targetId: 'workspace',
			source: { id: 'explorer-files' },
		});
	});

	it('prefers explicit layout operations over generic move support', () => {
		const dnd = createDndService();

		dnd.beginDrag({
			explorerId: 'layout',
			kind: 'tab',
			id: 'page-tools',
			label: 'Tools',
			data: { surface: 'dock' },
		});
		dnd.updateTarget(
			{
				explorerId: 'layout',
				kind: 'group',
				id: 'workspace',
				label: 'Workspace',
				accepts: ['move', 'detach-tab'],
			},
			'inside',
		);

		expect(dnd.endDrag()).toMatchObject({
			operation: 'detach-tab',
			source: { id: 'page-tools' },
		});
	});

	it('uses explicit target support to attach a workspace tab back to the dock', () => {
		const dnd = createDndService();

		dnd.beginDrag({
			explorerId: 'layout',
			kind: 'tab',
			id: 'explorer-files',
			label: 'Files',
			data: { surface: 'workspace' },
		});
		dnd.updateTarget(
			{
				explorerId: 'layout',
				kind: 'group',
				id: 'dock',
				label: 'Dock',
				accepts: ['attach-tab'],
			},
			'inside',
		);
		const result = dnd.endDrag();

		expect(result).toMatchObject({
			operation: 'attach-tab',
			targetId: 'dock',
			source: { id: 'explorer-files' },
		});
	});

	it('can be cancelled without emitting a drop result', () => {
		const dnd = createDndService();

		dnd.beginDrag(SOURCE);
		dnd.updateTarget(TARGET, 'before');

		expect(dnd.cancel().phase).toBe('idle');
		expect(dnd.endDrag()).toBeNull();
	});

	it('projects dragging and drop-target state tokens for views', () => {
		const dnd = createDndService();

		dnd.beginDrag({ ...SOURCE, selectedIds: ['file:a', 'file:c'] });
		dnd.updateTarget(TARGET, 'after');

		expect(dnd.stateFor('file:a')).toEqual({ dragging: true });
		expect(dnd.stateFor('file:c')).toEqual({ dragging: true });
		expect(dnd.stateFor('file:b')).toEqual({ dropTarget: true });
		expect(dnd.stateFor('file:z')).toEqual({});
	});

	it('returns snapshots whose arrays cannot mutate internal drag state', () => {
		const dnd = createDndService();
		const snapshot = dnd.beginDrag({ ...SOURCE, selectedIds: ['file:a', 'file:c'] });

		(snapshot.draggingIds as string[]).push('external');
		snapshot.source?.selectedIds?.push('external-source');

		expect(dnd.snapshot().draggingIds).toEqual(['file:a', 'file:c']);
		expect(dnd.snapshot().source?.selectedIds).toEqual(['file:a', 'file:c']);
	});
});
