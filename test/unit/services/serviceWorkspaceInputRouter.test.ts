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

function registerActivePanel(
	mediator: WorkspaceMediatorService,
	panel: PanelHandle,
	scene = makeScene('scene:filters', panel.id),
): void {
	mediator.registerScene(scene);
	mediator.registerPanel(panel);
	mediator.activateScene(scene.id);
}

describe('WorkspaceInputRouter', () => {
	it('focuses the active panel through the workspace mediator', () => {
		const mediator = new WorkspaceMediatorService();
		const panel = makePanel();
		registerActivePanel(mediator, panel);

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
		registerActivePanel(mediator, panel);

		const router = createWorkspaceInputRouter({ mediator });

		expect(router.focusActivePanel()).toEqual({
			kind: 'unhandled',
			command: 'focus-active-panel',
			reason: 'focus-rejected',
			panelId: panel.id,
		});
	});

	it('selects visible nodes in the active panel through projection and selection ports', () => {
		const mediator = new WorkspaceMediatorService();
		const select = vi.fn();
		const panel = {
			...makePanel(),
			selection: {
				read: () => new Set(['old']),
				select,
				clear: vi.fn(),
			},
			projection: {
				readVisibleIds: () => ['a', 'b', 'c'],
				readFocusedId: () => 'b',
			},
		} satisfies PanelHandle;
		registerActivePanel(mediator, panel);

		const router = createWorkspaceInputRouter({ mediator });

		expect(router.selectActivePanelVisibleNodes()).toEqual({
			kind: 'handled',
			command: 'select-visible-nodes',
			panelId: panel.id,
			count: 3,
		});
		expect(select).toHaveBeenCalledWith({
			kind: 'replace',
			ids: ['a', 'b', 'c'],
			focusedId: 'b',
		});
	});

	it('reports a missing projection port when selecting visible nodes is unsupported', () => {
		const mediator = new WorkspaceMediatorService();
		const panel = {
			...makePanel(),
			selection: {
				read: () => new Set(),
				select: vi.fn(),
				clear: vi.fn(),
			},
		} satisfies PanelHandle;
		registerActivePanel(mediator, panel);

		const router = createWorkspaceInputRouter({ mediator });

		expect(router.selectActivePanelVisibleNodes()).toEqual({
			kind: 'unhandled',
			command: 'select-visible-nodes',
			reason: 'missing-projection-port',
			panelId: panel.id,
		});
	});

	it('clears active panel selection through the selection port', () => {
		const mediator = new WorkspaceMediatorService();
		const clear = vi.fn();
		const panel = {
			...makePanel(),
			selection: {
				read: () => new Set(['a']),
				select: vi.fn(),
				clear,
			},
		} satisfies PanelHandle;
		registerActivePanel(mediator, panel);

		const router = createWorkspaceInputRouter({ mediator });

		expect(router.clearActivePanelSelection()).toEqual({
			kind: 'handled',
			command: 'clear-selection',
			panelId: panel.id,
			count: 1,
		});
		expect(clear).toHaveBeenCalledOnce();
	});
});
