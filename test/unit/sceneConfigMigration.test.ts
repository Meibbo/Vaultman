import { describe, expect, it } from 'vitest';
import { normalizeExplorerSortState } from '../../src/logic/logicScopedSort';
import {
	applyLayoutToPort,
	type SceneConfigPort,
} from '../../src/logic/logicSceneConfigPort';
import type { SceneConfig, SceneDefinitionId } from '../../src/types/typeInstance';

function fakePort(): SceneConfigPort & { calls: [string, unknown][] } {
	const calls: [string, unknown][] = [];
	return {
		calls,
		read: () => ({
			viewMode: 'tree',
			interactionMode: 'open',
			visibleCells: ['name'],
			sortState: normalizeExplorerSortState('files', null),
			stickyRows: true,
			compactFolders: false,
		}),
		propose: async (scene, next) => {
			calls.push([scene, next]);
		},
		readActiveScene: () => null,
		proposeActiveScene: async () => {},
		// U121-109: el puerto re-ancla la instancia cuando el ancla de la hoja
		// llega tarde. Este doble no la ejercita, pero debe cumplir el contrato.
		setInstanceId: () => {},
		onInstanceChange: () => () => {},
	};
}

describe('applyLayoutToPort', () => {
	it('proposes one write per tab present in the layout', async () => {
		const port = fakePort();
		await applyLayoutToPort(port, {
			viewModeByTab: { files: 'table', tags: 'grid' },
			visibleCellsByTab: { files: ['name', 'count'] },
			interactionModeByTab: {},
			sortStateByTab: {},
		});
		expect(port.calls.map(([tab]) => tab).sort()).toEqual(['files', 'tags']);
	});

	it('keeps the current value for a facet the layout does not carry', async () => {
		const port = fakePort();
		await applyLayoutToPort(port, {
			viewModeByTab: { files: 'table' },
			visibleCellsByTab: {},
			interactionModeByTab: {},
			sortStateByTab: {},
		});
		const [, written] = port.calls[0];
		expect(written).toMatchObject({ viewMode: 'table', visibleCells: ['name'] });
	});

	it('writes nothing for an empty layout', async () => {
		const port = fakePort();
		await applyLayoutToPort(port, {
			viewModeByTab: {},
			visibleCellsByTab: {},
			interactionModeByTab: {},
			sortStateByTab: {},
		});
		expect(port.calls).toEqual([]);
	});

	it('uses proposeScenes when available to batch tab updates', async () => {
		const batchCalls: Array<Partial<Record<SceneDefinitionId, Required<SceneConfig>>>> = [];
		const port = {
			...fakePort(),
			proposeScenes: async (
				updates: Partial<Record<SceneDefinitionId, Required<SceneConfig>>>,
			) => {
			batchCalls.push(updates);
			},
		};
		await applyLayoutToPort(port, {
			viewModeByTab: { files: 'table', tags: 'grid' },
			visibleCellsByTab: { files: ['name', 'count'] },
			interactionModeByTab: {},
			sortStateByTab: {},
		});
		expect(port.calls).toEqual([]);
		expect(batchCalls.length).toBe(1);
		const batch = batchCalls[0];
		if (!batch) throw new Error('expected one batch update');
		expect(Object.keys(batch).sort()).toEqual(['files', 'tags']);
		if (!batch.files || !batch.tags) throw new Error('expected files and tags updates');
		expect(batch.files.viewMode).toBe('table');
		expect(batch.tags.viewMode).toBe('grid');
	});
});
