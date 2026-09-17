import { describe, expect, it } from 'vitest';

import filesSource from '../../src/components/containers/explorerFiles.ts?raw';
import navbarSource from '../../src/components/layout/navbarFilters.svelte?raw';
import { byLevelModel } from '../../src/logic/logicSortMenu';
import { normalizeExplorerSortState } from '../../src/logic/logicScopedSort';
import type { ExplorerSortState } from '../../src/types/typeUI';

function stateFor(
	overrides: Partial<ExplorerSortState> = {},
): ExplorerSortState {
	return { ...normalizeExplorerSortState('files', null), ...overrides };
}

function functionSlice(source: string, name: string): string {
	const start = source.indexOf(`function ${name}`);
	const end = source.indexOf('\n\tfunction ', start + 1);
	return source.slice(start, end < 0 ? undefined : end);
}

// U121-052: propScene and tagScene offer the `Filtered` toggle so the
// projection narrows to the filtered file set; fileScene was the only
// hierarchical tab without it, so the tree kept hiding filtered-out files
// while a filter was being built. Files shares the toggle and starts scoped
// to the filtered set; turning it off shows the whole vault.
//
// Spec 08 §3.4 (2026-09-13) later moved `Filtered` OUT of the By-level model
// entirely: it now sits on its own in `openNativeSortMenu`, right before the
// (not yet built) `custom sorts` submenu and `By type` -- not up with the
// scope radios. See `sortMenuModel.test.ts` / `sortUiSource.test.ts` for the
// By-level-model-no-longer-has-it side of that guard.
describe('U121-052 files Filtered sort option', () => {
	it('no longer lives in the Files By-level model', () => {
		const model = byLevelModel('files', stateFor());
		expect(model?.items.map((item) => item.id)).not.toContain('filtered');
	});

	it('offers a standalone Filtered toggle in the sort menu, after the by-level block', () => {
		const menu = functionSlice(navbarSource, 'openNativeSortMenu');
		const byLevelIdx = menu.indexOf('const byLevelModelValue = byLevelModel(');
		const filteredIdx = menu.indexOf("translate('sort.level.filtered')");
		const byTypeIdx = menu.indexOf("translate('explorer.sort.type')");
		expect(byLevelIdx).toBeGreaterThan(-1);
		expect(filteredIdx).toBeGreaterThan(byLevelIdx);
		expect(byTypeIdx).toBeGreaterThan(filteredIdx);
	});

	it('reflects the enabled state via the live sortState, not a stale snapshot', () => {
		const menu = functionSlice(navbarSource, 'openNativeSortMenu');
		const filteredBlock = menu.slice(
			menu.indexOf("translate('sort.level.filtered')") - 200,
		);
		expect(filteredBlock).toContain('current.filtered === true');
	});

	it('persists the Files Filtered flag through normalization', () => {
		expect(normalizeExplorerSortState('files', null).filtered).toBe(true);
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
