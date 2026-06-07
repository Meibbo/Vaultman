export type VaultmanDragPayload =
	| { kind: 'file'; path: string }
	| { kind: 'folder'; path: string }
	| { kind: 'tag'; tagPath: string }
	| { kind: 'property'; property: string }
	| {
			kind: 'property-value';
			property: string;
			value: string;
			mode: 'property-value' | 'value-only';
	  };

export const VAULTMAN_DRAG_MIME = 'application/x-vaultman-node';

export function setVaultmanDragPayload(
	event: DragEvent,
	payload: VaultmanDragPayload,
): void {
	if (!event.dataTransfer) return;
	event.dataTransfer.effectAllowed = 'copyMove';
	event.dataTransfer.setData(VAULTMAN_DRAG_MIME, JSON.stringify(payload));
	event.dataTransfer.setData('text/plain', fallbackText(payload));
}

function fallbackText(payload: VaultmanDragPayload): string {
	if (payload.kind === 'file' || payload.kind === 'folder') return payload.path;
	if (payload.kind === 'tag') return `#${payload.tagPath}`;
	if (payload.kind === 'property') return payload.property;
	return `${payload.property}: ${payload.value}`;
}
