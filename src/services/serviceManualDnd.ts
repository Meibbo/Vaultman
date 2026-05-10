import type {
	ContentMeta,
	FileMeta,
	PropMeta,
	TagMeta,
	TreeNode,
} from '../types/typeNode';
import {
	createDndService,
	type DndDragSource,
	type DndDropPosition,
	type DndDropResult,
	type DndDropTarget,
	type DndService,
	type DndSnapshot,
	type DndViewState,
} from './serviceDnd';

export type ManualDndPayloadKind = 'embed' | 'tag' | 'property' | 'value' | 'text';

export interface ManualDndPayload {
	kind: ManualDndPayloadKind;
	text: string;
	nodeId: string;
	providerId: string;
	label: string;
}

export interface ManualDndSnapshot {
	enabled: boolean;
	drag: DndSnapshot;
}

export interface ManualDndServiceOptions {
	enabled?: boolean;
	dnd?: DndService;
}

export class ManualDndService {
	private enabled: boolean;
	private readonly dnd: DndService;
	private readonly subscribers = new Set<() => void>();

	constructor(options: ManualDndServiceOptions = {}) {
		this.enabled = options.enabled === true;
		this.dnd = options.dnd ?? createDndService();
	}

	subscribe(cb: () => void): () => void {
		this.subscribers.add(cb);
		return () => {
			this.subscribers.delete(cb);
		};
	}

	setEnabled(enabled: boolean): ManualDndSnapshot {
		if (this.enabled === enabled) return this.snapshot();
		this.enabled = enabled;
		if (!enabled) this.dnd.cancel();
		this.emit();
		return this.snapshot();
	}

	toggle(): ManualDndSnapshot {
		return this.setEnabled(!this.enabled);
	}

	sourceForNode(
		providerId: string,
		node: TreeNode,
		selectedIds: ReadonlySet<string> | readonly string[] = [],
	): DndDragSource {
		const selected = Array.isArray(selectedIds) ? selectedIds : [...selectedIds];
		const activeIds = selected.includes(node.id) ? selected : [node.id];
		return {
			explorerId: providerId,
			kind: 'node',
			id: node.id,
			label: node.label,
			selectedIds: activeIds,
			data: manualWorkspacePayloadForNode(providerId, node),
		};
	}

	targetForNode(providerId: string, node: TreeNode): DndDropTarget {
		return {
			explorerId: providerId,
			kind: 'node',
			id: node.id,
			label: node.label,
			accepts: ['reorder'],
		};
	}

	beginDrag(source: DndDragSource): DndSnapshot {
		if (!this.enabled) return this.snapshot().drag;
		const snapshot = this.dnd.beginDrag(source);
		this.emit();
		return snapshot;
	}

	updateTarget(target: DndDropTarget, position: DndDropPosition): DndSnapshot {
		if (!this.enabled) return this.snapshot().drag;
		const snapshot = this.dnd.updateTarget(target, position);
		this.emit();
		return snapshot;
	}

	endDrag(): DndDropResult | null {
		if (!this.enabled) return null;
		const result = this.dnd.endDrag();
		this.emit();
		return result;
	}

	cancel(): DndSnapshot {
		const snapshot = this.dnd.cancel();
		this.emit();
		return snapshot;
	}

	stateFor(id: string): DndViewState {
		return this.dnd.stateFor(id);
	}

	snapshot(): ManualDndSnapshot {
		return {
			enabled: this.enabled,
			drag: this.dnd.snapshot(),
		};
	}

	private emit(): void {
		for (const cb of this.subscribers) cb();
	}
}

export function createManualDndService(options?: ManualDndServiceOptions): ManualDndService {
	return new ManualDndService(options);
}

export function manualWorkspacePayloadForNode(
	providerId: string,
	node: TreeNode,
): ManualDndPayload {
	const text = manualWorkspaceTextForNode(providerId, node);
	return {
		kind: manualPayloadKindForNode(providerId, node),
		text,
		nodeId: node.id,
		providerId,
		label: node.label,
	};
}

export function writeManualDndTransfer(
	dataTransfer: DataTransfer,
	payload: ManualDndPayload,
): void {
	dataTransfer.effectAllowed = 'copyMove';
	dataTransfer.setData('text/plain', payload.text);
	dataTransfer.setData('text/markdown', payload.text);
	dataTransfer.setData('application/vnd.vaultman.node+json', JSON.stringify(payload));
}

export function applyManualNodeReorder<T extends { id: string }>(
	nodes: readonly T[],
	sourceIds: readonly string[],
	targetId: string,
	position: DndDropPosition,
): T[] {
	if (position === 'inside' || sourceIds.includes(targetId)) return [...nodes];
	const sourceSet = new Set(sourceIds);
	const moving = nodes.filter((node) => sourceSet.has(node.id));
	if (moving.length === 0) return [...nodes];
	const remaining = nodes.filter((node) => !sourceSet.has(node.id));
	const targetIndex = remaining.findIndex((node) => node.id === targetId);
	if (targetIndex < 0) return [...nodes];
	const insertAt = position === 'after' ? targetIndex + 1 : targetIndex;
	return [...remaining.slice(0, insertAt), ...moving, ...remaining.slice(insertAt)];
}

function manualWorkspaceTextForNode(providerId: string, node: TreeNode): string {
	if (providerId === 'files') {
		const meta = node.meta as Partial<FileMeta>;
		if (meta.file && !meta.isFolder) return `![[${meta.file.path}]]`;
		if (meta.folderPath) return meta.folderPath;
	}
	if (providerId === 'content') {
		const meta = node.meta as Partial<ContentMeta>;
		if (meta.filePath) return `![[${meta.filePath}]]`;
	}
	if (providerId === 'tags') {
		const meta = node.meta as Partial<TagMeta>;
		const tagPath = normalizeTagPath(meta.tagPath ?? node.label);
		return `#${tagPath}`;
	}
	if (providerId === 'props') {
		const meta = node.meta as Partial<PropMeta>;
		if (meta.isValueNode) {
			return `${meta.propName ?? node.label}: ${meta.rawValue ?? node.label}`;
		}
		if (meta.propName) return `${meta.propName}: `;
	}
	return node.label;
}

function manualPayloadKindForNode(providerId: string, node: TreeNode): ManualDndPayloadKind {
	if (providerId === 'files' || providerId === 'content') return 'embed';
	if (providerId === 'tags') return 'tag';
	if (providerId === 'props') {
		const meta = node.meta as Partial<PropMeta>;
		return meta.isValueNode ? 'value' : 'property';
	}
	return 'text';
}

function normalizeTagPath(value: string): string {
	return value.replace(/^#+/, '').trim();
}
