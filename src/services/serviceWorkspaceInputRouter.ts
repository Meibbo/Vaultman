import type { WorkspaceMediatorService } from './serviceWorkspaceMediator.svelte';
import type { PanelId } from '../types/typePanelScene';

export type WorkspaceInputCommand =
	| 'focus-active-panel'
	| 'select-visible-nodes'
	| 'clear-selection'
	| 'reveal-node';

export type WorkspaceInputRouterResult =
	| {
			kind: 'handled';
			command: WorkspaceInputCommand;
			panelId: PanelId;
			count?: number;
	  }
	| {
			kind: 'unhandled';
			command: WorkspaceInputCommand;
			reason:
				| 'no-active-panel'
				| 'focus-rejected'
				| 'missing-selection-port'
				| 'missing-projection-port'
				| 'missing-reveal-port'
				| 'reveal-rejected';
			panelId?: PanelId;
	  };

export interface WorkspaceInputRouter {
	focusActivePanel(): WorkspaceInputRouterResult;
	selectActivePanelVisibleNodes(): WorkspaceInputRouterResult;
	clearActivePanelSelection(): WorkspaceInputRouterResult;
	revealNode(nodeId: string): WorkspaceInputRouterResult;
}

export interface WorkspaceInputRouterOptions {
	mediator: Pick<WorkspaceMediatorService, 'getActivePanel'>;
}

export function createWorkspaceInputRouter(
	options: WorkspaceInputRouterOptions,
): WorkspaceInputRouter {
	return {
		focusActivePanel() {
			const panel = options.mediator.getActivePanel();
			if (!panel) {
				return {
					kind: 'unhandled',
					command: 'focus-active-panel',
					reason: 'no-active-panel',
				};
			}

			const didFocus = panel.focus();
			if (didFocus === false) {
				return {
					kind: 'unhandled',
					command: 'focus-active-panel',
					reason: 'focus-rejected',
					panelId: panel.id,
				};
			}

			return {
				kind: 'handled',
				command: 'focus-active-panel',
				panelId: panel.id,
			};
		},
		selectActivePanelVisibleNodes() {
			const panel = options.mediator.getActivePanel();
			if (!panel) return noActivePanel('select-visible-nodes');
			if (!panel.selection) {
				return {
					kind: 'unhandled',
					command: 'select-visible-nodes',
					reason: 'missing-selection-port',
					panelId: panel.id,
				};
			}
			if (!panel.projection) {
				return {
					kind: 'unhandled',
					command: 'select-visible-nodes',
					reason: 'missing-projection-port',
					panelId: panel.id,
				};
			}

			const visibleIds = [...panel.projection.readVisibleIds()];
			const focusedId = panel.projection.readFocusedId?.();
			panel.selection.select(
				focusedId
					? { kind: 'replace', ids: visibleIds, focusedId }
					: { kind: 'replace', ids: visibleIds },
			);
			return {
				kind: 'handled',
				command: 'select-visible-nodes',
				panelId: panel.id,
				count: visibleIds.length,
			};
		},
		clearActivePanelSelection() {
			const panel = options.mediator.getActivePanel();
			if (!panel) return noActivePanel('clear-selection');
			if (!panel.selection) {
				return {
					kind: 'unhandled',
					command: 'clear-selection',
					reason: 'missing-selection-port',
					panelId: panel.id,
				};
			}

			const count = panel.selection.read().size;
			panel.selection.clear();
			return {
				kind: 'handled',
				command: 'clear-selection',
				panelId: panel.id,
				count,
			};
		},
		revealNode(nodeId: string) {
			const panel = options.mediator.getActivePanel();
			if (!panel) return noActivePanel('reveal-node');
			if (!panel.revealNode) {
				return {
					kind: 'unhandled',
					command: 'reveal-node',
					reason: 'missing-reveal-port',
					panelId: panel.id,
				};
			}

			// The projection port (when present) is the router's only way to
			// know which nodes are currently reachable, since `revealNode`
			// itself returns void (fixed contract from slice 1). When no
			// projection port is wired the router defers the decision to the
			// panel implementation and calls through unconditionally.
			const visibleIds = panel.projection?.readVisibleIds();
			if (visibleIds && !visibleIds.includes(nodeId)) {
				return {
					kind: 'unhandled',
					command: 'reveal-node',
					reason: 'reveal-rejected',
					panelId: panel.id,
				};
			}

			panel.revealNode(nodeId);
			return {
				kind: 'handled',
				command: 'reveal-node',
				panelId: panel.id,
			};
		},
	};
}

function noActivePanel(command: WorkspaceInputCommand): WorkspaceInputRouterResult {
	return {
		kind: 'unhandled',
		command,
		reason: 'no-active-panel',
	};
}
