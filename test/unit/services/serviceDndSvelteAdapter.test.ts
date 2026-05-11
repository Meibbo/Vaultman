import { describe, expect, it, vi } from 'vitest';
import { createDndService, type DndSubject } from '../../../src/services/serviceDnd';
import {
	createDndKitDraggableInput,
	createDndKitDroppableInput,
	createDndKitProviderHandlers,
	dndKitId,
	type DndKitEntityData,
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
	it('builds stable @dnd-kit/svelte draggable input and starts semantic drag state', () => {
		const dnd = createDndService();
		const input = createDndKitDraggableInput(dnd, SOURCE, { disabled: true });
		const handlers = createDndKitProviderHandlers(dnd);

		handlers.onDragStart(kitEvent({ source: kitEntity(SOURCE, 'source') }));

		expect(input.id).toBe('files:node:file:a');
		expect(input.data).toEqual({ role: 'source', subject: SOURCE });
		expect(input.disabled).toBe(true);
		expect(dnd.snapshot()).toMatchObject({
			phase: 'dragging',
			source: { id: 'file:a' },
			draggingIds: ['file:a', 'file:c'],
		});
	});

	it('updates candidate state from @dnd-kit/svelte drag-over events', () => {
		const dnd = createDndService();
		const handlers = createDndKitProviderHandlers(dnd);
		const targetInput = createDndKitDroppableInput(dnd, TARGET, { position: 'after' });

		handlers.onDragStart(kitEvent({ source: kitEntity(SOURCE, 'source') }));
		handlers.onDragOver(
			kitEvent({
				source: kitEntity(SOURCE, 'source'),
				target: kitEntity(TARGET, 'target', targetInput.data),
			}),
		);

		expect(dnd.snapshot().candidate).toMatchObject({
			allowed: true,
			operation: 'reorder',
			position: 'after',
			target: { id: 'file:b' },
		});
	});

	it('maps missing @dnd-kit/svelte drop position to inside for container targets', () => {
		const dnd = createDndService();
		const handlers = createDndKitProviderHandlers(dnd);
		const folder = {
			explorerId: 'files',
			kind: 'group',
			id: 'folder:projects',
			label: 'Projects',
			accepts: ['move'],
		} as const;

		handlers.onDragStart(kitEvent({ source: kitEntity(SOURCE, 'source') }));
		handlers.onDragOver(
			kitEvent({
				source: kitEntity(SOURCE, 'source'),
				target: kitEntity(folder, 'target'),
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
		const handlers = createDndKitProviderHandlers(dnd, { onDropResult });

		handlers.onDragStart(kitEvent({ source: kitEntity(SOURCE, 'source') }));
		handlers.onDragOver(
			kitEvent({
				source: kitEntity(SOURCE, 'source'),
				target: kitEntity(TARGET, 'target', {
					role: 'target',
					subject: TARGET,
					position: 'before',
				}),
			}),
		);
		handlers.onDragEnd(
			kitEvent({
				source: kitEntity(SOURCE, 'source'),
				target: kitEntity(TARGET, 'target', {
					role: 'target',
					subject: TARGET,
					position: 'before',
				}),
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

	it('clears stale candidate on empty drag-over and cancels unfinished drags on drag end', () => {
		const dnd = createDndService();
		const handlers = createDndKitProviderHandlers(dnd);

		handlers.onDragStart(kitEvent({ source: kitEntity(SOURCE, 'source') }));
		handlers.onDragOver(
			kitEvent({
				source: kitEntity(SOURCE, 'source'),
				target: kitEntity(TARGET, 'target', {
					role: 'target',
					subject: TARGET,
					position: 'after',
				}),
			}),
		);
		handlers.onDragOver(kitEvent({ source: kitEntity(SOURCE, 'source'), target: null }));
		expect(dnd.snapshot().candidate).toBeNull();

		handlers.onDragEnd(kitEvent({ source: kitEntity(SOURCE, 'source'), target: null }));
		expect(dnd.snapshot().phase).toBe('idle');
	});
});

function kitEntity(
	subject: DndSubject,
	role: DndKitEntityData['role'],
	data: DndKitEntityData = { role, subject },
) {
	return {
		id: dndKitId(subject),
		data,
	};
}

function kitEvent({
	source,
	target = null,
	canceled = false,
}: {
	source: ReturnType<typeof kitEntity> | null;
	target?: ReturnType<typeof kitEntity> | null;
	canceled?: boolean;
}) {
	return {
		canceled,
		operation: {
			source,
			target,
		},
	} as never;
}
