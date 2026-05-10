import { describe, expect, it, vi } from 'vitest';
import { createDndService } from '../../../src/services/serviceDnd';
import {
	createSvelteDndDraggableOptions,
	createSvelteDndDroppableOptions,
	dndContainerId,
	type SvelteDndState,
} from '../../../src/services/serviceDndSvelteAdapter';

const SOURCE = {
	explorerId: 'files',
	kind: 'node',
	id: 'file:a',
	label: 'A.md',
	selectedIds: ['file:a', 'file:c'],
} as const;

const TARGET = {
	explorerId: 'files',
	kind: 'node',
	id: 'file:b',
	label: 'B.md',
} as const;

describe('serviceDndSvelteAdapter', () => {
	it('builds stable sveltednd draggable options and starts semantic drag state', () => {
		const dnd = createDndService();
		const options = createSvelteDndDraggableOptions(dnd, SOURCE, {
			handle: '.vm-dnd-handle',
			interactive: ['.vm-badge'],
		});

		options.callbacks?.onDragStart?.(state({ draggedItem: SOURCE }));

		expect(options.container).toBe('files:node:file:a');
		expect(options.dragData).toEqual(SOURCE);
		expect(options.handle).toBe('.vm-dnd-handle');
		expect(options.interactive).toEqual(['.vm-badge']);
		expect(dnd.snapshot()).toMatchObject({
			phase: 'dragging',
			source: { id: 'file:a' },
			draggingIds: ['file:a', 'file:c'],
		});
	});

	it('updates candidate state from sveltednd drag-over callbacks', () => {
		const dnd = createDndService();
		createSvelteDndDraggableOptions(dnd, SOURCE).callbacks?.onDragStart?.(
			state({ draggedItem: SOURCE }),
		);
		const options = createSvelteDndDroppableOptions(dnd, TARGET);

		options.callbacks?.onDragOver?.(
			state({
				draggedItem: SOURCE,
				targetContainer: dndContainerId(TARGET),
				dropPosition: 'after',
			}),
		);

		expect(dnd.snapshot().candidate).toMatchObject({
			allowed: true,
			operation: 'reorder',
			position: 'after',
			target: { id: 'file:b' },
		});
	});

	it('maps null library drop position to inside for container targets', () => {
		const dnd = createDndService();
		const folder = {
			explorerId: 'files',
			kind: 'group',
			id: 'folder:projects',
			label: 'Projects',
			accepts: ['move'],
		} as const;

		createSvelteDndDraggableOptions(dnd, SOURCE).callbacks?.onDragStart?.(
			state({ draggedItem: SOURCE }),
		);
		createSvelteDndDroppableOptions(dnd, folder).callbacks?.onDragOver?.(
			state({
				draggedItem: SOURCE,
				targetContainer: dndContainerId(folder),
				dropPosition: null,
			}),
		);

		expect(dnd.snapshot().candidate).toMatchObject({
			allowed: true,
			operation: 'move',
			position: 'inside',
			target: { id: 'folder:projects' },
		});
	});

	it('emits the semantic drop result on drop and clears drag state', () => {
		const dnd = createDndService();
		const onDropResult = vi.fn();

		createSvelteDndDraggableOptions(dnd, SOURCE).callbacks?.onDragStart?.(
			state({ draggedItem: SOURCE }),
		);
		createSvelteDndDroppableOptions(dnd, TARGET, { onDropResult }).callbacks?.onDrop?.(
			state({
				draggedItem: SOURCE,
				targetContainer: dndContainerId(TARGET),
				dropPosition: 'before',
			}),
		);

		expect(onDropResult).toHaveBeenCalledWith(
			expect.objectContaining({
				operation: 'reorder',
				sourceIds: ['file:a', 'file:c'],
				targetId: 'file:b',
				position: 'before',
			}),
		);
		expect(dnd.snapshot().phase).toBe('idle');
	});

	it('clears stale candidate on drag leave and cancels unfinished drags on drag end', () => {
		const dnd = createDndService();
		const draggable = createSvelteDndDraggableOptions(dnd, SOURCE);
		const droppable = createSvelteDndDroppableOptions(dnd, TARGET);

		draggable.callbacks?.onDragStart?.(state({ draggedItem: SOURCE }));
		droppable.callbacks?.onDragOver?.(
			state({
				draggedItem: SOURCE,
				targetContainer: dndContainerId(TARGET),
				dropPosition: 'after',
			}),
		);
		droppable.callbacks?.onDragLeave?.(state({ draggedItem: SOURCE }));
		expect(dnd.snapshot().candidate).toBeNull();

		draggable.callbacks?.onDragEnd?.(state({ draggedItem: SOURCE }));
		expect(dnd.snapshot().phase).toBe('idle');
	});
});

function state<T>(partial: Partial<SvelteDndState<T>> & { draggedItem: T }): SvelteDndState<T> {
	return {
		isDragging: true,
		draggedItem: partial.draggedItem,
		sourceContainer: partial.sourceContainer ?? 'source',
		targetContainer: partial.targetContainer ?? null,
		targetElement: partial.targetElement ?? null,
		dropPosition: partial.dropPosition ?? null,
		invalidDrop: partial.invalidDrop,
	};
}
