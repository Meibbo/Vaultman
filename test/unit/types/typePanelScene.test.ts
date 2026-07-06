import { describe, expect, it } from 'vitest';
import {
	isPanelKind,
	type PanelHandle,
	type SceneDefinition,
	type WorkspaceActiveContext,
	type WorkspaceOperationIntent,
	type WorkspaceScope,
} from '../../../src/types/typePanelScene';

describe('typePanelScene', () => {
	it('models a panel handle inside a focused scene', () => {
		const calls: string[] = [];
		const dropIntent: WorkspaceOperationIntent = {
			kind: 'panel-drop',
			sourcePanelId: 'panel:tags',
			targetPanelId: 'panel:filters',
			payload: {
				kind: 'nodes',
				sourcePanelId: 'panel:tags',
				providerId: 'tags',
				nodeKind: 'tag',
				nodeIds: ['tag:project'],
			},
		};
		const handle: PanelHandle = {
			id: 'panel:filters',
			kind: 'panelExplorer',
			providerId: 'files',
			focus: () => calls.push('focus'),
			produceDragPayload: () => ({
				kind: 'nodes',
				sourcePanelId: 'panel:filters',
				providerId: 'files',
				nodeIds: ['file:one'],
			}),
			acceptsDrop: (intent) => intent.kind === 'panel-drop',
			revealNode: (id) => calls.push(`reveal:${id}`),
			selection: {
				read: () => new Set(['file:one']),
				select: (command) => calls.push(`select:${command.kind}`),
				clear: () => calls.push('clear'),
			},
			expansion: {
				read: () => new Set(['folder:a']),
				toggle: (id) => calls.push(`toggle:${id}`),
			},
		};
		const scene: SceneDefinition = {
			id: 'scene:filters',
			surfaceId: 'surface:main',
			rootTile: { id: 'tile:root', kind: 'panel', panelId: handle.id },
			activePanelId: handle.id,
		};
		const active: WorkspaceActiveContext = { sceneId: scene.id, panelId: handle.id };
		const scope: WorkspaceScope = { kind: 'focused-scene', sceneId: scene.id };

		handle.focus();
		handle.revealNode?.('file:one');
		handle.selection?.select({ kind: 'replace', ids: ['file:one'], focusedId: 'file:one' });
		handle.expansion?.toggle('folder:a');

		expect(handle.acceptsDrop(dropIntent)).toBe(true);
		expect(handle.produceDragPayload()).toMatchObject({ kind: 'nodes', nodeIds: ['file:one'] });
		expect(scene.rootTile).toMatchObject({ kind: 'panel', panelId: 'panel:filters' });
		expect(active).toEqual({ sceneId: 'scene:filters', panelId: 'panel:filters' });
		expect(scope).toEqual({ kind: 'focused-scene', sceneId: 'scene:filters' });
		expect(calls).toEqual(['focus', 'reveal:file:one', 'select:replace', 'toggle:folder:a']);
	});

	it('recognizes the supported panel kinds', () => {
		expect(isPanelKind('panelExplorer')).toBe(true);
		expect(isPanelKind('panelData')).toBe(true);
		expect(isPanelKind('panelContent')).toBe(true);
		expect(isPanelKind('custom-panel')).toBe(true);
		expect(isPanelKind('modal')).toBe(false);
	});
});
