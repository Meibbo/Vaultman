import { describe, expect, it } from 'vitest';

import navbarSource from '../../src/components/layout/navbarFilters.svelte?raw';
import popupSource from '../../src/components/layout/popupSort.svelte?raw';
import propsSource from '../../src/components/containers/explorerProps.ts?raw';
import tagsSource from '../../src/components/containers/explorerTags.ts?raw';
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
		);
		// U121-079: groups llega al final de los scopes de By-level.
		// Spec 08 §3.4: `filtered` ya no vive aquí -- se movió a su propio
		// lugar en `openNativeSortMenu`, cerca de `By type` (ver
		// `sortUiSource.test.ts` para ese guard).
		expect(enabled?.items.map((item) => item.id)).toEqual([
			'scope-separator',
			'drill',
			'all',
			'groups',
		]);

		const foldersMixed = byLevelModel(
			'files',
			stateFor('files', { parentsFirst: false, fixedFolders: true }),
		);
		// U121-079: groups llega al final de los scopes de By-level.
		expect(foldersMixed?.items.map((item) => item.id)).toEqual([
			'scope-separator',
			'drill',
			'all',
			'groups',
		]);
	});

	it('drops the folder options when nesting is off or the view is flat', () => {
		// Scopes are always in the sort menu (guard removed per spec 08).
		expect(
			byLevelModel('files', stateFor('files'))?.items.map((i) => i.id),
		).toEqual(['scope-separator', 'drill', 'all', 'groups']);
		expect(
			byLevelModel('tags', stateFor('tags'))?.items.map((i) => i.id),
		).toEqual(['scope-separator', 'drill', 'all', 'groups']);
		// A flat view (table/cards) has no By-level group at all.
		expect(byLevelModel('files', stateFor('files'), false)).toBeNull();
		expect(byLevelModel('tags', stateFor('tags'), false)).toBeNull();
	});

	it('projects the same contextual scope order for Props and Tags', () => {
		const props = byLevelModel(
			'props',
			stateFor('props', { activeScope: 'values' }),
		);
		// U121-079: groups llega al final de los scopes de By-level.
		expect(props?.items.map((item) => item.id)).toEqual([
			'scope-separator',
			'all',
			'properties',
			'values',
			'groups',
		]);
		expect(props?.items.find((item) => item.id === 'values')).toMatchObject({
			checked: true,
		});

		const tags = byLevelModel(
			'tags',
			stateFor('tags', { activeScope: 'all' }),
		);
		// U121-079: groups llega al final de los scopes de By-level.
		expect(tags?.items.map((item) => item.id)).toEqual([
			'scope-separator',
			'drill',
			'all',
			'groups',
		]);
		// U121-079: groups llega a snippets y habilita By-level with all and groups.
		expect(
			byLevelModel('snippets', stateFor('snippets'))?.items.map(
				(item) => item.id,
			),
		).toEqual(['scope-separator', 'all', 'groups']);
		// U121-079: groups llega a plugins y habilita By-level with all and groups.
		expect(
			byLevelModel('plugins', stateFor('plugins'))?.items.map(
				(item) => item.id,
			),
		).toEqual(['scope-separator', 'all', 'groups']);
	});

	it('pins the add-property toggle to the reveal drawer, last by default', () => {
		// Without an anchored note there is no in-list add row, so no toggle.
		expect(
			byLevelModel('props', stateFor('props'))?.items.map((i) => i.id),
		).not.toContain('addPropertyFirst');
		const revealed = byLevelModel(
			'props',
			stateFor('props'),
			true,
			true,
		);
		expect(revealed?.items.map((i) => i.id)).toContain('addPropertyFirst');
		expect(
			revealed?.items.find((i) => i.id === 'addPropertyFirst'),
		).toMatchObject({
			kind: 'toggle',
			labelKey: 'sort.level.add_property_first',
			checked: false,
		});
		const first = byLevelModel(
			'props',
			stateFor('props', { addPropertyFirst: true }),
			true,
			true,
		);
		expect(
			first?.items.find((i) => i.id === 'addPropertyFirst'),
		).toMatchObject({ checked: true });
	});

	it('normalizes the add-property pin as a strict boolean for props', () => {
		expect(
			normalizeExplorerSortState('props', {
				sorts: {},
				activeScope: 'all',
				addPropertyFirst: true,
			}).addPropertyFirst,
		).toBe(true);
		expect(
			normalizeExplorerSortState('props', {
				sorts: {},
				activeScope: 'all',
				addPropertyFirst: 'yes',
			}).addPropertyFirst,
		).toBe(false);
		expect(
			normalizeExplorerSortState('props', {
				sorts: {},
				activeScope: 'all',
			}).addPropertyFirst,
		).toBe(false);
	});

	it('shares contextual sort visibility and option registries', () => {
		expect(
			visibleSortOptions(
				'files',
				stateFor('files', { fixedFolders: true }),
				true,
			).map((option) => option.id),
		).not.toContain('file-count');
		expect(
			visibleSortOptions(
				'files',
				stateFor('files', { fixedFolders: false }),
				true,
			).map((option) => option.id),
		).toContain('file-count');
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
		expect(
			visibleSortOptions(
				'props',
				stateFor('props', { activeScope: 'values' }),
				true,
			).map((option) => option.id),
		).not.toContain('type');
		expect(SORT_MENU_OPTIONS.files.map((option) => option.id)).toContain(
			'tasks',
		);
		expect(SORT_MENU_OPTIONS.props.map((option) => option.id)).toContain(
			'type',
		);
		expect(SORT_MENU_OPTIONS.tags.map((option) => option.id)).toContain('type');
		expect(SORT_MENU_OPTIONS.snippets.map((option) => option.id)).toContain(
			'state',
		);
		expect(SORT_MENU_OPTIONS.plugins.map((option) => option.id)).toContain(
			'state',
		);
		expect(SORT_MENU_OPTIONS.files.map((option) => option.id)).not.toContain(
			'state',
		);
		expect(SORT_MENU_OPTIONS.files.map((option) => option.id)).not.toContain(
			'type',
		);
		expect(NODE_TYPE_MENU_OPTIONS.props[0]?.id).toBe('all');
		expect(NODE_TYPE_MENU_OPTIONS.props.map((option) => option.id)).toContain(
			'datetime',
		);
		// U121-030: a tag's type has two halves — its shape, then where it is
		// written — and the source pair sits below the shapes.
		expect(NODE_TYPE_MENU_OPTIONS.tags.map((option) => option.id)).toEqual([
			'all',
			'nested',
			'simple',
			'frontmatter',
			'inline',
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
		expect(popupSource).toContain('void initialSortState;');
	});

	it('wires semantic Type comparators into Props and sibling-preserving Tags sort', () => {
		expect(propsSource).toContain('comparePropTypes(');
		expect(propsSource).toContain('this._effectivePropType(node.meta)');
		// U121-030: the shape comparison moved to its rank so the source half
		// of the type can slot between it and the label tie break. It is still
		// the semantic comparator, not a label compare wearing its name.
		expect(tagsSource).toContain('tagStructureRank(a) - tagStructureRank(b)');
		expect(tagsSource).toContain('sortAllWithDrill(');
	});

	// U121-029: while a note is anchored the drawer leads with the two modes
	// that decide *which* note, separated from everything below that shapes
	// the level. Spec 08 §3.4 moved `filtered` out of this block entirely.
	it('leads with the reveal anchor modes only while a note is anchored', () => {
		const withReveal = byLevelModel(
			'props',
			stateFor('props', { activeScope: 'properties' }),
			true,
			true,
		);
		// U121-079: groups llega al final de los scopes de By-level.
		expect(withReveal?.items.map((item) => item.id)).toEqual([
			'reveal-current-file',
			'reveal-drill',
			'reveal-separator',
			'addPropertyFirst',
			'scope-separator',
			'all',
			'properties',
			'values',
			'groups',
		]);
		// Current File is the resting mode; pinning is what the user opts into.
		expect(
			withReveal?.items.find((item) => item.id === 'reveal-current-file'),
		).toMatchObject({ checked: true });
		expect(
			withReveal?.items.find((item) => item.id === 'reveal-drill'),
		).toMatchObject({ checked: false });

		const pinned = byLevelModel(
			'props',
			stateFor('props', { revealAnchor: 'pinned', revealAnchorPath: 'a.md' }),
			true,
			true,
		);
		expect(
			pinned?.items.find((item) => item.id === 'reveal-drill'),
		).toMatchObject({ checked: true });

		// Files has no reveal projection of its own here.
		expect(
			byLevelModel('files', stateFor('files'), true, true)?.items.map(
				(item) => item.id,
			),
		).not.toContain('reveal-current-file');
	});
});
