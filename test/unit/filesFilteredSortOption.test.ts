import { describe, expect, it } from 'vitest';

import filesSource from '../../src/components/containers/explorerFiles.ts?raw';
import { byLevelModel } from '../../src/logic/logicSortMenu';
import { normalizeExplorerSortState } from '../../src/logic/logicScopedSort';
import type { ExplorerSortState } from '../../src/types/typeUI';

function stateFor(
	overrides: Partial<ExplorerSortState> = {},
): ExplorerSortState {
	return { ...normalizeExplorerSortState('files', null), ...overrides };
}

// U121-052: propScene and tagScene offer the `Filtered` toggle in the By-level
// menu so the projection narrows to the filtered file set; fileScene was the
// only hierarchical tab without it, so the tree kept hiding filtered-out files
// while a filter was being built. Files shares the toggle: off (default) shows
// the whole vault, on hides the files the active filter leaves out.
describe('U121-052 files Filtered sort option', () => {
	it('offers the Filtered toggle in the Files By-level menu', () => {
		const model = byLevelModel('files', stateFor(), true);
		expect(model?.items.map((item) => item.id)).toEqual([
			'filtered',
			'nested',
			'parentsFirst',
			'fixedFolders',
			'scope-separator',
			'drill',
			'all',
		]);
		expect(model?.items.find((item) => item.id === 'filtered')).toMatchObject({
			kind: 'toggle',
			labelKey: 'sort.level.filtered',
			checked: false,
		});
	});

	it('reflects the enabled state in the Files By-level menu', () => {
		const model = byLevelModel('files', stateFor({ filtered: true }), true);
		expect(model?.items.find((item) => item.id === 'filtered')).toMatchObject({
			checked: true,
		});
	});

	it('keeps the toggle above Nested and alive on a flat level', () => {
		expect(
			byLevelModel('files', stateFor(), false)?.items.map((item) => item.id),
		).toEqual(['filtered', 'nested']);
	});

	it('persists the Files Filtered flag through normalization', () => {
		expect(normalizeExplorerSortState('files', null).filtered).toBe(false);
		expect(
			normalizeExplorerSortState('files', stateFor({ filtered: true }))
				.filtered,
		).toBe(true);
	});

	it('wires the Files explorer source to the Filtered flag', () => {
		expect(filesSource).toContain('this.sortState.filtered');
		expect(filesSource).toContain('_refreshFromFilterService');
	});
});
