export type PortalFoulKind = 'portal-misplaced' | 'portal-cross-window';

export class PortalFoulError extends Error {
	constructor(public readonly kind: PortalFoulKind) {
		super(`portal foul: ${kind}`);
		this.name = 'PortalFoulError';
	}
}

interface ResolveInput {
	activeDocument: Document;
	expectedDocument?: Document;
	strict?: boolean;
	onFoul?: (kind: PortalFoulKind) => void;
}

export function resolvePortalTarget(input: ResolveInput): HTMLElement {
	const { activeDocument, expectedDocument, strict = false, onFoul } = input;

	if (expectedDocument && expectedDocument !== activeDocument) {
		if (strict) throw new PortalFoulError('portal-cross-window');
		onFoul?.('portal-cross-window');
	}

	const root = activeDocument.querySelector<HTMLElement>('.vm-root');
	if (root) return root;

	onFoul?.('portal-misplaced');
	return activeDocument.body;
}
