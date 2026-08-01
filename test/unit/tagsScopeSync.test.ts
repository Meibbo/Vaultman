import { describe, expect, it, vi } from 'vitest';

import { TagsExplorerPanel } from '../../src/components/containers/explorerTags';
import tagsSource from '../../src/components/containers/explorerTags.ts?raw';
import navbarSource from '../../src/components/layout/navbarFilters.svelte?raw';
import { normalizeExplorerSortState } from '../../src/logic/logicScopedSort';
import type { ExplorerSortState } from '../../src/types/typeUI';

interface TagsScopeHarness {
	sortState: ExplorerSortState;
	nodeTypeFilters: string[];
	_render: ReturnType<typeof vi.fn>;
	setSortStateChangeHandler(handler?: (state: ExplorerSortState) => void): void;
	setSortState(state: ExplorerSortState): void;
	applyExternalSortScope(drillNodeId: string | null): void;
}

function createHarness(): TagsScopeHarness {
	const panel = Object.create(TagsExplorerPanel.prototype) as TagsScopeHarness;
	panel.sortState = normalizeExplorerSortState('tags', null);
	panel.nodeTypeFilters = [];
	panel._render = vi.fn();
	return panel;
}

describe('BT5-008 Tags external sort-scope synchronization', () => {
	it('notifies normalized state exactly once per effective external change', () => {
		const panel = createHarness();
		const observed: ExplorerSortState[] = [];
		panel.setSortStateChangeHandler((state) => observed.push(state));

		expect(observed).toHaveLength(0);
		panel.applyExternalSortScope('tag/root');
		expect(observed).toHaveLength(1);
		expect(observed.at(-1)).toMatchObject({
			activeScope: 'drill',
			drillNodeId: 'tag/root',
		});
		expect(panel._render).toHaveBeenCalledTimes(1);

		panel.applyExternalSortScope('tag/root');
		expect(observed).toHaveLength(1);
		expect(panel._render).toHaveBeenCalledTimes(1);

		panel.applyExternalSortScope(null);
		expect(observed).toHaveLength(2);
		expect(observed.at(-1)).toMatchObject({
			activeScope: 'all',
			drillNodeId: null,
		});
		expect(panel._render).toHaveBeenCalledTimes(2);
	});

	it('does not overwrite a saved parent state when Tags mounts lazily', () => {
		const panel = createHarness();
		const savedState = normalizeExplorerSortState('tags', {
			activeScope: 'drill',
			drillNodeId: 'saved/branch',
			sorts: {
				drill: { sortBy: 'count', direction: 'desc' },
				all: { sortBy: 'name', direction: 'asc' },
			},
		});
		let parentState = savedState;

		panel.setSortStateChangeHandler((state) => {
			parentState = state;
		});

		expect(parentState).toEqual(savedState);
		panel.setSortState(savedState);
		expect(panel.sortState).toEqual(savedState);
		expect(parentState).toEqual(savedState);
	});

	it('publishes the panel state when a navbar reconnects after Content', () => {
		const panel = createHarness();
		const savedState = normalizeExplorerSortState('tags', {
			activeScope: 'drill',
			drillNodeId: 'persisted/branch',
			sorts: {
				drill: { sortBy: 'count', direction: 'desc' },
				all: { sortBy: 'name', direction: 'asc' },
			},
		});

		panel.setSortStateChangeHandler(() => undefined);
		panel.setSortState(savedState);
		panel.setSortStateChangeHandler(undefined);

		let remountedNavbarState = normalizeExplorerSortState('tags', null);
		panel.setSortStateChangeHandler((state) => {
			remountedNavbarState = state;
		});

		expect(remountedNavbarState).toMatchObject({
			activeScope: 'drill',
			drillNodeId: 'persisted/branch',
			sorts: savedState.sorts,
		});
	});

	it('wires Tags to the same guarded navbar seam and cleans it up', () => {
		expect(tagsSource).toContain('setSortStateChangeHandler(');
		expect(tagsSource).toContain('this.onSortStateChange?.(this._sortState())');
		expect(navbarSource).toContain('function handleExternalTagsSortState(');
		expect(navbarSource).toContain(
			'currentTagsExplorer?.setSortStateChangeHandler?.(',
		);
		expect(navbarSource).toContain('handleExternalTagsSortState,');
		expect(navbarSource).toContain(
			'currentTagsExplorer?.setSortStateChangeHandler?.(undefined)',
		);

		const start = navbarSource.indexOf('function handleExternalTagsSortState(');
		const end = navbarSource.indexOf('\n\tfunction ', start + 1);
		const handler = navbarSource.slice(start, end);
		expect(handler).toContain(
			'sameSortState(appliedSortStateByTab.tags, normalizedState)',
		);
		expect(handler).toContain(
			'sameSortState(currentByTab.tags, normalizedState)',
		);
	});
});
