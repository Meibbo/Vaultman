import type {
	CreateDraggableInput,
	CreateDroppableInput,
	DragDropEventHandlers,
} from '@dnd-kit/svelte';
import {
	stageMoveBlockIntoChains,
	type MoveBlockQueue,
	type DndDragSource,
	type DndDropPosition,
	type DndDropResult,
	type DndDropTarget,
	type DndService,
	type DndSubject,
} from './serviceDnd';
import type { ImmutableVirtualFileState } from '../types/typeVfsImmutable';

export interface DndKitEntityData extends Record<string, unknown> {
	role: 'source' | 'target';
	subject: DndSubject;
	position?: DndDropPosition;
}

export interface DndKitDraggableOptions {
	disabled?: boolean;
}

export interface DndKitDroppableOptions {
	disabled?: boolean;
	position?: DndDropPosition;
}

export interface DndKitProviderOptions {
	onDropResult?: (result: DndDropResult) => void;
	moveBlockQueue?: MoveBlockQueue;
	onMoveBlockStaged?: (result: DndMoveBlockStageResult) => void;
}

export type DndMoveBlockStageResult = ReturnType<typeof stageMoveBlockIntoChains>;

export interface DndMoveBlockSourcePayload {
	kind: 'adopted-block';
	fromVfs: ImmutableVirtualFileState;
	blockId: string;
	blockLine?: number;
}

export interface DndMoveBlockTargetPayload {
	kind: 'note';
	toVfs: ImmutableVirtualFileState;
}

type DndKitHandlers = DragDropEventHandlers<DndKitEntityData>;
type DndKitDragEvent =
	| Parameters<NonNullable<DndKitHandlers['onDragStart']>>[0]
	| Parameters<NonNullable<DndKitHandlers['onDragOver']>>[0]
	| Parameters<NonNullable<DndKitHandlers['onDragEnd']>>[0];

export function dndKitId(subject: DndSubject): string {
	return `${subject.explorerId}:${subject.kind}:${subject.id}`;
}

export function createDndKitDraggableInput(
	dnd: DndService,
	source: DndDragSource,
	options: DndKitDraggableOptions = {},
): CreateDraggableInput<DndKitEntityData> {
	void dnd;
	return {
		id: dndKitId(source),
		data: {
			role: 'source',
			subject: source,
		},
		disabled: options.disabled,
	};
}

export function createDndKitDroppableInput(
	dnd: DndService,
	target: DndDropTarget,
	options: DndKitDroppableOptions = {},
): CreateDroppableInput<DndKitEntityData> {
	void dnd;
	return {
		id: dndKitId(target),
		data: {
			role: 'target',
			subject: target,
			position: options.position,
		},
		disabled: options.disabled,
	};
}

export function createDndKitProviderHandlers(
	dnd: DndService,
	options: DndKitProviderOptions = {},
): Required<Pick<DndKitHandlers, 'onDragStart' | 'onDragOver' | 'onDragEnd'>> {
	return {
		onDragStart(event) {
			const source = sourceFromEvent(event);
			if (source) dnd.beginDrag(source);
		},
		onDragOver(event) {
			const target = targetFromEvent(event);
			if (!target) {
				dnd.clearTarget();
				return;
			}
			dnd.updateTarget(target.subject, target.position ?? 'inside');
		},
		onDragEnd(event) {
			if ('canceled' in event && event.canceled) {
				dnd.cancel();
				return;
			}

			const target = targetFromEvent(event);
			if (!target) {
				dnd.cancel();
				return;
			}

			dnd.updateTarget(target.subject, target.position ?? 'inside');
			const result = dnd.endDrag();
			if (result) {
				const staged = stageMoveBlockPayload(result, options);
				if (staged) options.onMoveBlockStaged?.(staged);
				options.onDropResult?.(result);
			}
		},
	};
}

function stageMoveBlockPayload(
	result: DndDropResult,
	options: DndKitProviderOptions,
): DndMoveBlockStageResult | null {
	if (result.operation !== 'move' || !options.moveBlockQueue) return null;
	const source = moveBlockSourcePayload(result.source.data);
	const target = moveBlockTargetPayload(result.target.data);
	if (!source || !target) return null;
	return stageMoveBlockIntoChains({
		queue: options.moveBlockQueue,
		fromVfs: source.fromVfs,
		toVfs: target.toVfs,
		blockId: source.blockId,
		blockLine: source.blockLine,
	});
}

function sourceFromEvent(event: DndKitDragEvent): DndDragSource | null {
	const data = entityData(event.operation.source);
	if (!data || data.role !== 'source') return null;
	return data.subject;
}

function targetFromEvent(
	event: DndKitDragEvent,
): { subject: DndDropTarget; position?: DndDropPosition } | null {
	const data = entityData(event.operation.target);
	if (!data || data.role !== 'target') return null;
	return {
		subject: data.subject,
		position: data.position,
	};
}

function entityData(entity: { data?: unknown } | null | undefined): DndKitEntityData | null {
	if (!entity || typeof entity.data !== 'object' || entity.data === null) return null;
	const data = entity.data as Partial<DndKitEntityData>;
	if (data.role !== 'source' && data.role !== 'target') return null;
	if (!data.subject || typeof data.subject !== 'object') return null;
	return data as DndKitEntityData;
}

function moveBlockSourcePayload(value: unknown): DndMoveBlockSourcePayload | null {
	if (!isRecord(value) || value.kind !== 'adopted-block') return null;
	if (!isImmutableVfs(value.fromVfs) || typeof value.blockId !== 'string') return null;
	if (value.blockLine !== undefined && typeof value.blockLine !== 'number') return null;
	return {
		kind: 'adopted-block',
		fromVfs: value.fromVfs,
		blockId: value.blockId,
		blockLine: value.blockLine,
	};
}

function moveBlockTargetPayload(value: unknown): DndMoveBlockTargetPayload | null {
	if (!isRecord(value) || value.kind !== 'note') return null;
	if (!isImmutableVfs(value.toVfs)) return null;
	return { kind: 'note', toVfs: value.toVfs };
}

function isImmutableVfs(value: unknown): value is ImmutableVirtualFileState {
	return (
		isRecord(value) &&
		typeof value.originalPath === 'string' &&
		typeof value.body === 'string' &&
		Array.isArray(value.ops)
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}
