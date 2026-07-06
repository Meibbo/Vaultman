import type {
	InteractionPolicyResolution,
	InteractionRejectReason,
	PanelDragPayload,
	WorkspaceDropTarget,
	WorkspaceInteractionReject,
} from '../types/typePanelScene';

export function resolveInteractionPolicy(
	payload: PanelDragPayload,
	target: WorkspaceDropTarget,
): InteractionPolicyResolution {
	if (payload.kind === 'empty') return reject('empty-payload', payload, target);

	if (target.kind === 'panel') {
		return {
			kind: 'panel-drop',
			sourcePanelId: payload.sourcePanelId,
			targetPanelId: target.panelId,
			payload,
		};
	}

	if (target.kind === 'editor-caret') {
		const tag = tagFromPayload(payload);
		if (!tag) return reject('unsupported-payload', payload, target);
		return {
			kind: 'editor-insert-tag',
			sourcePanelId: payload.sourcePanelId,
			target,
			tag,
			nodeIds: payload.kind === 'nodes' ? payload.nodeIds : undefined,
		};
	}

	if (target.kind === 'leaf' && payload.kind === 'nodes' && payload.nodeIds.length > 0) {
		return {
			kind: 'open-nodes-in-leaf',
			sourcePanelId: payload.sourcePanelId,
			target,
			nodeIds: payload.nodeIds,
		};
	}

	return reject('unsupported-target', payload, target);
}

export function normalizeTagReference(value: string): string | null {
	const trimmed = value.trim().replace(/^#/, '');
	return trimmed ? `#${trimmed}` : null;
}

function tagFromPayload(payload: PanelDragPayload): string | null {
	if (payload.kind === 'text') return normalizeTagReference(payload.text);
	if (payload.kind !== 'nodes') return null;
	if (payload.providerId !== 'tags' && payload.nodeKind !== 'tag') return null;
	return normalizeTagReference(payload.text ?? payload.label ?? payload.nodeIds[0] ?? '');
}

function reject(
	reason: InteractionRejectReason,
	payload: PanelDragPayload,
	target: WorkspaceDropTarget,
): WorkspaceInteractionReject {
	return { kind: 'reject', reason, payload, target };
}
