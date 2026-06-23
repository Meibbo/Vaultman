import { describe, expect, it } from 'vitest';

import activeFiltersIslandSource from '../../src/components/layout/islandActiveFilters.ts?raw';
import contextMenuSource from '../../src/services/serviceContextMenu.ts?raw';
import explorerFilesSource from '../../src/components/containers/explorerFiles.ts?raw';
import frameSource from '../../src/VaultmanFrame.svelte?raw';
import menuCtxSource from '../../src/types/typeCMenu.ts?raw';
import navbarFiltersSource from '../../src/components/layout/navbarFilters.svelte?raw';

describe('Files type view filter source guards', () => {
	it('surfaces Files type state in Active Filters and clear selection actions', () => {
		expect(explorerFilesSource).toContain('getActiveTypeFilter()');
		expect(explorerFilesSource).toContain('clearNodeTypeFilter(): void');
		expect(explorerFilesSource).toContain('setSortStateChangeHandler');
		expect(explorerFilesSource).toContain(
			'hasViewFilters: () => this.hasViewFilters()',
		);
		expect(explorerFilesSource).toContain(
			'clearViewFilters: () => this.clearNodeTypeFilter()',
		);

		expect(activeFiltersIslandSource).toContain(
			'export interface ActiveFilterViewState',
		);
		expect(activeFiltersIslandSource).toContain(
			'private viewStates: () => ActiveFilterViewState[]',
		);
		expect(activeFiltersIslandSource).toContain(
			'const viewStates = this.viewStates();',
		);
		expect(activeFiltersIslandSource).toContain('viewState.clear();');

		expect(frameSource).toContain('ActiveFiltersIslandComponent');
		expect(frameSource).toContain('type ActiveFilterViewState');
		expect(frameSource).toContain(
			'function activeFilterViewStates(): ActiveFilterViewState[]',
		);
		expect(frameSource).toContain('fileList?.getActiveTypeFilter()');
		expect(frameSource).toContain('fileList?.clearNodeTypeFilter();');

		expect(menuCtxSource).toContain('hasViewFilters?: () => boolean;');
		expect(menuCtxSource).toContain('clearViewFilters?: () => void;');
		expect(contextMenuSource).toContain('ctx.hasViewFilters?.() === true');
		expect(contextMenuSource).toContain('ctx.clearViewFilters?.();');

		expect(navbarFiltersSource).toContain('setSortStateChangeHandler');
	});

	it('keeps the external Files sort bridge out of the registering effect dependencies', () => {
		expect(navbarFiltersSource).toContain("import { untrack } from 'svelte';");
		expect(navbarFiltersSource).toContain(
			'const currentByTab = untrack(() => ({',
		);
		expect(navbarFiltersSource).toContain(
			'if (sameSortState(currentByTab.files, normalizedState)) return;',
		);
	});
});
