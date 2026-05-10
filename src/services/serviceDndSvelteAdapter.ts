import type {
	DragDropOptions,
	DragDropState,
	DraggableOptions,
} from '@thisux/sveltednd';
import type {
	DndDragSource,
	DndDropPosition,
	DndDropResult,
	DndDropTarget,
	DndService,
	DndSubject,
} from './serviceDnd';

export type SvelteDndState<T> = DragDropState<T>;

export interface SvelteDndDraggableOptions {
	disabled?: boolean;
	handle?: string;
	interactive?: string[];
}

export interface SvelteDndDroppableOptions {
	disabled?: boolean;
	direction?: DragDropOptions<DndDragSource>['direction'];
	onDropResult?: (result: DndDropResult) => void;
}

export function dndContainerId(subject: DndSubject): string {
	return `${subject.explorerId}:${subject.kind}:${subject.id}`;
}

export function createSvelteDndDraggableOptions(
	dnd: DndService,
	source: DndDragSource,
	options: SvelteDndDraggableOptions = {},
): DraggableOptions<DndDragSource> {
	return {
		container: dndContainerId(source),
		dragData: source,
		disabled: options.disabled,
		handle: options.handle,
		interactive: options.interactive,
		callbacks: {
			onDragStart(state) {
				dnd.beginDrag(state.draggedItem);
			},
			onDragEnd() {
				if (dnd.snapshot().phase === 'dragging') dnd.cancel();
			},
		},
	};
}

export function createSvelteDndDroppableOptions(
	dnd: DndService,
	target: DndDropTarget,
	options: SvelteDndDroppableOptions = {},
): DragDropOptions<DndDragSource> {
	return {
		container: dndContainerId(target),
		disabled: options.disabled,
		direction: options.direction,
		callbacks: {
			onDragEnter(state) {
				updateTargetFromState(dnd, target, state);
			},
			onDragOver(state) {
				updateTargetFromState(dnd, target, state);
			},
			onDragLeave() {
				dnd.clearTarget();
			},
			onDrop(state) {
				updateTargetFromState(dnd, target, state);
				const result = dnd.endDrag();
				if (result) options.onDropResult?.(result);
			},
		},
	};
}

function updateTargetFromState(
	dnd: DndService,
	target: DndDropTarget,
	state: DragDropState<DndDragSource>,
): void {
	dnd.updateTarget(target, positionFromState(state));
}

function positionFromState(state: DragDropState<DndDragSource>): DndDropPosition {
	return state.dropPosition ?? 'inside';
}
