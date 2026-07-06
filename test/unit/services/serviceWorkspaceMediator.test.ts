import { describe, expect, it, vi } from 'vitest';
import { WorkspaceMediatorService } from '../../../src/services/serviceWorkspaceMediator.svelte';
import type { PanelHandle, SceneDefinition } from '../../../src/types/typePanelScene';

function makePanel(id = 'panel:filters'): PanelHandle {
	return {
		id,
		kind: 'panelExplorer',
		providerId: 'files',
		focus: vi.fn(),
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

describe('WorkspaceMediatorService', () => {
	it('registers scenes and panels and resolves the default focused scope', () => {
		const mediator = new WorkspaceMediatorService();
		const panel = makePanel();
		const scene = makeScene();

		const unregisterScene = mediator.registerScene(scene);
		const unregisterPanel = mediator.registerPanel(panel);

		expect(mediator.activateScene(scene.id)).toBe(true);
		expect(mediator.getActiveContext()).toEqual({
			surfaceId: 'surface:main',
			sceneId: 'scene:filters',
			panelId: 'panel:filters',
		});
		expect(mediator.getActivePanel()).toBe(panel);
		expect(mediator.resolveScope()).toEqual({ kind: 'focused-scene', sceneId: scene.id });

		unregisterPanel();
		expect(mediator.getActiveContext()).toBeNull();
		unregisterScene();
		expect(mediator.listScenes()).toEqual([]);
	});

	it('rejects unknown active contexts', () => {
		const mediator = new WorkspaceMediatorService();
		expect(mediator.setActiveContext({ sceneId: 'scene:missing' })).toBe(false);
		expect(mediator.setActiveContext({ panelId: 'panel:missing' })).toBe(false);
		expect(mediator.getActiveContext()).toBeNull();
	});

	it('routes interactions through the stateless policy', () => {
		const mediator = new WorkspaceMediatorService();

		const result = mediator.routeInteraction(
			{
				kind: 'nodes',
				sourcePanelId: 'panel:tags',
				providerId: 'tags',
				nodeIds: ['topic'],
				label: 'topic',
			},
			{ kind: 'editor-caret' },
		);

		expect(result).toMatchObject({ kind: 'editor-insert-tag', tag: '#topic' });
	});
});
