/**
 * Floating TOC action router (FTC-002).
 *
 * Shape-twin of the sandbox `WorkspaceActionRouter` (P.D slice 4): a discrete
 * `invoke(action, targetId)` that resolves against a single registered reveal
 * port with typed unhandled-reasons. Keeping this shape means the v2 port is a
 * move, not a reshape — the port here is the 1.x stand-in for `PanelHandle`.
 */

export type FloatingTocAction = 'reveal-node';

export type RevealNodeReason = 'missing-reveal-port' | 'reveal-rejected';

export interface RevealNodePort {
	/** Reveal the node with `id` in the active explorer; returns whether a target existed. */
	revealNode(id: string): boolean;
}

/** The active explorer panel, as the floating TOC consumes it. */
export interface FloatingTocPanel extends RevealNodePort {
	getIndexNodes(rootId: string | null): import('../logic/logicIndexGroups').IndexNodeRef[];
	isIndexableSort(): boolean;
	/** Files/folders toggle applies (files tree); else the rail indexes all nodes. */
	supportsKindToggle(): boolean;
	/** Scope drill is available (any tree with a hierarchy). */
	supportsDrill(): boolean;
	/** Scope root owning a picked node's level (its parent id, or null). */
	scopeRootForNode(id: string): string | null;
	expandNodeById(id: string): void;
	onIndexChanged?: () => void;
}

export interface FloatingTocResult {
	ok: boolean;
	reason?: RevealNodeReason;
}

export class FloatingTocRouter {
	private port: RevealNodePort | null = null;

	setPort(port: RevealNodePort | null): void {
		this.port = port;
	}

	invoke(action: FloatingTocAction, targetId: string): FloatingTocResult {
		if (action !== 'reveal-node' || !targetId) {
			return { ok: false, reason: 'reveal-rejected' };
		}
		if (!this.port) {
			return { ok: false, reason: 'missing-reveal-port' };
		}
		return this.port.revealNode(targetId)
			? { ok: true }
			: { ok: false, reason: 'reveal-rejected' };
	}
}
