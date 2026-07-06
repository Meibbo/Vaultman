import { describe, expect, it, vi } from 'vitest';
import { WorkspaceMediatorService } from '../../../src/services/serviceWorkspaceMediator.svelte';
import { createWorkspaceInputRouter } from '../../../src/services/serviceWorkspaceInputRouter';
import type { PanelHandle, SceneDefinition } from '../../../src/types/typePanelScene';

function makePanel(id = 'panel:filters'): PanelHandle {
	return {
		id,
		kind: 'panelExplorer',
		providerId: 'files',
		focus: vi.fn(() => true),
		produceDragPayload: () => ({ kind: 'empty', sourcePanelId: id }),
		acceptsDrop: () => false,
	};
}

function makeScene(id = 'scene:filters', panelId = 'panel:filters'): SceneDefinition {
	return {
		id,
		surfaceId: 'surface:main',
		rootTile: { id: 'tile:root', kind: 'panel', panelId },
		activePanelId: panelId,
	};
}

describe('WorkspaceInputRouter', () => {
	it('focuses the active panel through the workspace mediator', () => {
		const mediator = new WorkspaceMediatorService();
		const panel = makePanel();
		const scene = makeScene();
		mediator.registerScene(scene);
		mediator.registerPanel(panel);
		mediator.activateScene(scene.id);

		const router = createWorkspaceInputRouter({ mediator });

		expect(router.focusActivePanel()).toEqual({
			kind: 'handled',
			command: 'focus-active-panel',
			panelId: panel.id,
		});
		expect(panel.focus).toHaveBeenCalledTimes(1);
	});

	it('reports no active panel when the mediator has no focused panel', () => {
		const mediator = new WorkspaceMediatorService();
		const router = createWorkspaceInputRouter({ mediator });

		expect(router.focusActivePanel()).toEqual({
			kind: 'unhandled',
			command: 'focus-active-panel',
			reason: 'no-active-panel',
		});
	});

	it('reports rejected focus when the active panel declines focus', () => {
		const mediator = new WorkspaceMediatorService();
		const panel = makePanel();
		vi.mocked(panel.focus).mockReturnValue(false);
		const scene = makeScene();
		mediator.registerScene(scene);
		mediator.registerPanel(panel);
		mediator.activateScene(scene.id);

		const router = createWorkspaceInputRouter({ mediator });

		expect(router.focusActivePanel()).toEqual({
			kind: 'unhandled',
			command: 'focus-active-panel',
			reason: 'focus-rejected',
			panelId: panel.id,
		});
	});
});
