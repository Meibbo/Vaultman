import type { WorkspaceMediatorService } from './serviceWorkspaceMediator.svelte';
import type { PanelId } from '../types/typePanelScene';

export type WorkspaceInputCommand = 'focus-active-panel';

export type WorkspaceInputRouterResult =
	| {
			kind: 'handled';
			command: WorkspaceInputCommand;
			panelId: PanelId;
	  }
	| {
			kind: 'unhandled';
			command: WorkspaceInputCommand;
			reason: 'no-active-panel' | 'focus-rejected';
			panelId?: PanelId;
	  };

export interface WorkspaceInputRouter {
	focusActivePanel(): WorkspaceInputRouterResult;
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
	};
}
