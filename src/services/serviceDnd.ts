import type {
	ImmutableStagedOp,
	ImmutableVirtualFileState,
} from '../types/typeVfsImmutable';

export type DndPhase = 'idle' | 'dragging';
export type DndDropPosition = 'before' | 'inside' | 'after';
export type DndOperation =
	| 'reorder'
	| 'move'
	| 'apply-template'
	| 'detach-tab'
	| 'attach-tab'
	| 'move-tab-surface';
export type DndSubjectKind = 'node' | 'row' | 'group' | 'column' | 'tab' | 'filter' | 'card';
export type DndRejectReason =
	| 'no-drag-source'
	| 'self-drop'
	| 'target-disabled'
	| 'no-compatible-operation';

export interface DndSubject {
	explorerId: string;
	kind: DndSubjectKind;
	id: string;
	label?: string;
	parentId?: string | null;
	index?: number;
	data?: unknown;
}

export interface DndDragSource extends DndSubject {
	selectedIds?: readonly string[];
}

export interface DndDropTarget extends DndSubject {
	accepts?: readonly DndOperation[];
	disabled?: boolean;
}

export interface DndCandidate {
	target: DndDropTarget;
	position: DndDropPosition;
	operation: DndOperation | null;
	allowed: boolean;
	reason?: DndRejectReason;
	preview: DndPreview;
}

export interface DndPreview {
	sourceLabel: string;
	targetLabel: string;
	position: DndDropPosition;
	operation: DndOperation | null;
}

export interface DndSnapshot {
	phase: DndPhase;
	source: DndDragSource | null;
	draggingIds: readonly string[];
	candidate: DndCandidate | null;
}

export interface DndDropResult {
	operation: DndOperation;
	source: DndDragSource;
	sourceIds: readonly string[];
	target: DndDropTarget;
	targetId: string;
	position: DndDropPosition;
}

export interface DndViewState {
	dragging?: true;
	dropTarget?: true;
}

export class DndService {
	private source: DndDragSource | null = null;
	private draggingIds: readonly string[] = [];
	private candidate: DndCandidate | null = null;

	beginDrag(source: DndDragSource): DndSnapshot {
		const draggingIds = normalizeDraggingIds(source);
		this.source = { ...source, selectedIds: draggingIds };
		this.draggingIds = draggingIds;
		this.candidate = null;
		return this.snapshot();
	}

	updateTarget(target: DndDropTarget, position: DndDropPosition): DndSnapshot {
		this.candidate = this.resolveCandidate(target, position);
		return this.snapshot();
	}

	clearTarget(): DndSnapshot {
		this.candidate = null;
		return this.snapshot();
	}

	endDrag(): DndDropResult | null {
		const source = this.source;
		const candidate = this.candidate;
		const sourceIds = [...this.draggingIds];
		this.reset();

		if (!source || !candidate?.allowed || !candidate.operation) return null;
		return {
			operation: candidate.operation,
			source: { ...source, selectedIds: [...(source.selectedIds ?? [])] },
			sourceIds,
			target: cloneTarget(candidate.target),
			targetId: candidate.target.id,
			position: candidate.position,
		};
	}

	cancel(): DndSnapshot {
		this.reset();
		return this.snapshot();
	}

	stateFor(id: string): DndViewState {
		return {
			dragging: this.draggingIds.includes(id) || undefined,
			dropTarget:
				this.candidate?.allowed === true && this.candidate.target.id === id ? true : undefined,
		};
	}

	snapshot(): DndSnapshot {
		return {
			phase: this.source ? 'dragging' : 'idle',
			source: this.source ? { ...this.source, selectedIds: [...(this.source.selectedIds ?? [])] } : null,
			draggingIds: [...this.draggingIds],
			candidate: this.candidate ? cloneCandidate(this.candidate) : null,
		};
	}

	private resolveCandidate(target: DndDropTarget, position: DndDropPosition): DndCandidate {
		const source = this.source;
		const operation = source ? operationFor(source, target, position) : null;
		const reason = rejectReasonFor(source, this.draggingIds, target, operation);
		return {
			target: cloneTarget(target),
			position,
			operation,
			allowed: reason == null,
			reason,
			preview: {
				sourceLabel: source?.label ?? source?.id ?? '',
				targetLabel: target.label ?? target.id,
				position,
				operation,
			},
		};
	}

	private reset(): void {
		this.source = null;
		this.draggingIds = [];
		this.candidate = null;
	}
}

export function createDndService(): DndService {
	return new DndService();
}

function normalizeDraggingIds(source: DndDragSource): readonly string[] {
	const ids = source.selectedIds?.length ? source.selectedIds : [source.id];
	return [...new Set([source.id, ...ids])];
}

function rejectReasonFor(
	source: DndDragSource | null,
	draggingIds: readonly string[],
	target: DndDropTarget,
	operation: DndOperation | null,
): DndRejectReason | undefined {
	if (!source) return 'no-drag-source';
	if (target.disabled) return 'target-disabled';
	if (draggingIds.includes(target.id)) return 'self-drop';
	if (!operation) return 'no-compatible-operation';
	return undefined;
}

function operationFor(
	source: DndDragSource,
	target: DndDropTarget,
	position: DndDropPosition,
): DndOperation | null {
	const accepted = target.accepts;
	if (accepted?.length) return preferredAcceptedOperation(accepted, position);
	if (source.explorerId === target.explorerId && source.kind === target.kind && position !== 'inside') {
		return 'reorder';
	}
	return null;
}

function preferredAcceptedOperation(
	accepted: readonly DndOperation[],
	position: DndDropPosition,
): DndOperation | null {
	if (accepted.includes('detach-tab')) return 'detach-tab';
	if (accepted.includes('attach-tab')) return 'attach-tab';
	if (accepted.includes('move-tab-surface')) return 'move-tab-surface';
	if (position === 'inside' && accepted.includes('move')) return 'move';
	if (position !== 'inside' && accepted.includes('reorder')) return 'reorder';
	if (accepted.includes('move')) return 'move';
	if (accepted.includes('apply-template')) return 'apply-template';
	return accepted[0] ?? null;
}

function cloneTarget(target: DndDropTarget): DndDropTarget {
	return {
		...target,
		accepts: target.accepts ? [...target.accepts] : undefined,
	};
}

function cloneCandidate(candidate: DndCandidate): DndCandidate {
	return {
		...candidate,
		target: cloneTarget(candidate.target),
		preview: { ...candidate.preview },
	};
}

export function buildMoveBlockOps(input: {
	fromVfs: ImmutableVirtualFileState;
	toVfs: ImmutableVirtualFileState;
	blockId: string;
	blockLine: number;
}): { fromOp: ImmutableStagedOp; toOp: ImmutableStagedOp } {
	const extractedLine = input.fromVfs.body.split('\n')[input.blockLine];
	if (extractedLine === undefined) {
		throw new RangeError(`Block line ${input.blockLine} is outside ${input.fromVfs.originalPath}`);
	}

	const safeBlockId = input.blockId.replace(/\s+/g, '-');
	return {
		fromOp: {
			id: `move-block-from-${safeBlockId}`,
			kind: 'block-extract',
			action: 'extract-block',
			details: `-> ${input.toVfs.originalPath}`,
			apply: (vfs) => ({
				...vfs,
				body: removeLine(vfs.body, input.blockLine),
			}),
		},
		toOp: {
			id: `move-block-to-${safeBlockId}`,
			kind: 'block-insert',
			action: 'insert-block',
			details: `<- ${input.fromVfs.originalPath}`,
			apply: (vfs) => ({
				...vfs,
				body: appendLine(vfs.body, extractedLine),
			}),
		},
	};
}

function removeLine(body: string, index: number): string {
	const lines = body.split('\n');
	lines.splice(index, 1);
	return lines.join('\n');
}

function appendLine(body: string, line: string): string {
	return body.length > 0 ? `${body}\n${line}` : line;
}
