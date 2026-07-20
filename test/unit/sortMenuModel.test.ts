import { describe, expect, it } from 'vitest';

import navbarSource from '../../src/components/layout/navbarFilters.svelte?raw';
import popupSource from '../../src/components/layout/popupSort.svelte?raw';
import {
	byLevelModel,
	NODE_TYPE_MENU_OPTIONS,
	SORT_MENU_OPTIONS,
	visibleSortOptions,
} from '../../src/logic/logicSortMenu';
import { normalizeExplorerSortState } from '../../src/logic/logicScopedSort';
import type { ExplorerSortState, ExplorerTabId } from '../../src/types/typeUI';

function stateFor(
	tab: ExplorerTabId,
	overrides: Partial<ExplorerSortState> = {},
): ExplorerSortState {
	return { ...normalizeExplorerSortState(tab, null), ...overrides };
}

describe('BT5-007 shared sort menu model', () => {
	it('projects the exact Files By level order and contextual fixed-folders state', () => {
		const enabled = byLevelModel(
			'files',
			stateFor('files', { parentsFirst: true, fixedFolders: false }),
			true,
		);
		expect(enabled?.items.map((item) => item.id)).toEqual([
			'nested',
			'parentsFirst',
			'fixedFolders',
			'scope-separator',
			'drill',
			'all',
		]);
		expect(enabled?.items.find((item) => item.id === 'nested')).toMatchObject({
			checked: true,
		});
		expect(
			enabled?.items.find((item) => item.id === 'fixedFolders'),
		).toMatchObject({ checked: false });

		const foldersMixed = byLevelModel(
			'files',
			stateFor('files', { parentsFirst: false, fixedFolders: true }),
			false,
		);
		expect(foldersMixed?.items.map((item) => item.id)).toEqual([
			'nested',
			'parentsFirst',
			'scope-separator',
			'drill',
			'all',
		]);
	});

	it('projects the same contextual scope order for Props and Tags', () => {
		const props = byLevelModel(
			'props',
			stateFor('props', { activeScope: 'values' }),
			false,
		);
		expect(props?.items.map((item) => item.id)).toEqual([
			'nested',
			'scope-separator',
			'properties',
			'values',
		]);
		expect(props?.items.find((item) => item.id === 'values')).toMatchObject({
			checked: true,
		});

		const tags = byLevelModel(
			'tags',
			stateFor('tags', { activeScope: 'all' }),
			true,
		);
		expect(tags?.items.map((item) => item.id)).toEqual([
			'nested',
			'scope-separator',
			'drill',
			'all',
		]);
		expect(byLevelModel('snippets', stateFor('snippets'), true)).toBeNull();
		expect(byLevelModel('plugins', stateFor('plugins'), true)).toBeNull();
	});

	it('shares contextual sort visibility and option registries', () => {
		expect(
			visibleSortOptions('files', stateFor('files'), true).map(
				(option) => option.id,
			),
		).not.toContain('path');
		expect(
			visibleSortOptions('files', stateFor('files'), false).map(
				(option) => option.id,
			),
		).toContain('path');
		expect(
			visibleSortOptions(
				'props',
				stateFor('props', { activeScope: 'values' }),
				true,
			).map((option) => option.id),
		).not.toContain('sub');
		expect(SORT_MENU_OPTIONS.files.map((option) => option.id)).toContain(
			'tasks',
		);
		expect(NODE_TYPE_MENU_OPTIONS.tags.map((option) => option.id)).toEqual([
			'all',
			'nested',
			'simple',
		]);
	});

	it('makes navbar and popup consume the shared model and reactive nested state', () => {
		for (const source of [navbarSource, popupSource]) {
			expect(source).toContain("from '../../logic/logicSortMenu'");
			expect(source).not.toMatch(/const SORT_OPTIONS\s*:/);
		}
		expect(navbarSource).not.toMatch(/const NODE_TYPE_OPTIONS\s*:/);
		expect(popupSource).not.toMatch(/const DRAWER_OPTIONS\s*:/);
		expect(popupSource).toContain('byLevelModel(');
		expect(popupSource).toContain('visibleSortOptions(');
		expect(popupSource).toContain('onNestedToggle');
		expect(popupSource).toContain('void initialSortState;');
		expect(navbarSource).toContain('nestedActive={nestedActiveFor(activeTab)}');
		expect(navbarSource).toContain(
			'onNestedToggle={() => toggleNestedFor(activeTab)}',
		);
	});
});
