import { describe, expect, it } from 'vitest';

import navbarSource from '../../src/components/layout/navbarFilters.svelte?raw';
import popupSource from '../../src/components/layout/popupSort.svelte?raw';
import propsSource from '../../src/components/containers/explorerProps.ts?raw';
import tagsSource from '../../src/components/containers/explorerTags.ts?raw';
import {
	byLevelModel,
	scopeMenuModel,
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
		// Spec 08 §3.1: the scope items moved to `scopeMenuModel`.
		expect(enabled?.items.map((item) => item.id)).toEqual([]);

		const foldersMixed = byLevelModel(
			'files',
			stateFor('files', { parentsFirst: false, fixedFolders: true }),
		);
		// Spec 08 §3.1: the scope items live in the `Scope: <variable>`
		// submenu now (`scopeMenuModel`); By-level keeps only the reveal block.
		expect(foldersMixed?.items.map((item) => item.id)).toEqual([]);
	});

	it('drops the folder options when nesting is off or the view is flat', () => {
		// Scopes are always in the sort menu (guard removed per spec 08), in
		// their own submenu since spec 08 §3.1.
		expect(
			byLevelModel('files', stateFor('files'))?.items.map((i) => i.id),
		).toEqual([]);
		expect(
			byLevelModel('tags', stateFor('tags'))?.items.map((i) => i.id),
		).toEqual([]);
		// A flat view (table/cards) has no By-level group at all.
		expect(byLevelModel('files', stateFor('files'), false)).toBeNull();
		expect(byLevelModel('tags', stateFor('tags'), false)).toBeNull();
	});

	it('spec 08 §3.1: the Scope submenu offers All levels / Select a parent / Select a level', () => {
		const scene = {
			parentLabel: (id: string) => (id === 'folder:Projects' ? 'Projects' : null),
			parentLevel: (id: string) => (id === 'folder:Projects' ? 1 : null),
			sortLabel: (sort: { sortBy: string; direction: string }) =>
				`${sort.sortBy} ${sort.direction}`,
			levelLabel: (level: number) => `Level ${level}`,
		};
		const all = scopeMenuModel('files', stateFor('files'), scene);
		expect(all?.titleKind).toBe('all');
		expect(all?.items.map((item) => item.id)).toEqual(['all', 'drill', 'level']);
		expect(all?.items.find((item) => item.id === 'all')).toMatchObject({ checked: true });

		// A picked parent titles the submenu after it and lists it as a row.
		const picked = scopeMenuModel(
			'files',
			stateFor('files', {
				activeScope: 'drill',
				drillNodeId: 'folder:Projects',
				sorts: {
					all: { sortBy: 'name', direction: 'asc' },
					'parent:folder:Projects': { sortBy: 'modified', direction: 'desc' },
				},
			}),
			scene,
		);
		expect(picked?.titleKind).toBe('parent');
		expect(picked?.titleArg).toBe('Projects');
		expect(picked?.items.map((item) => item.id)).toEqual([
			'all',
			'drill',
			'level',
			'scope-rows-separator',
			'parent:folder:Projects',
		]);
		expect(picked?.items.at(-1)).toMatchObject({
			kind: 'scope-row',
			label: '1: Projects',
			sortLabel: 'modified desc',
			checked: true,
			hidden: false,
		});

		// A level scope titles it `Level N`; a hidden row says so.
		const level = scopeMenuModel(
			'props',
			stateFor('props', {
				activeScope: 'level:2',
				hiddenScopes: ['level:2'],
				sorts: { 'level:2': { sortBy: 'count', direction: 'asc' } },
			}),
			scene,
		);
		expect(level?.titleKind).toBe('level');
		expect(level?.titleArg).toBe('Level 2');
		expect(level?.items.at(-1)).toMatchObject({ id: 'level:2', hidden: true });

		// Flat add-on lists have no levels to pick from.
		expect(scopeMenuModel('snippets', stateFor('snippets'), scene)).toBeNull();
		expect(byLevelModel('snippets', stateFor('snippets'))).toBeNull();
		expect(byLevelModel('plugins', stateFor('plugins'))).toBeNull();
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
				stateFor('props', { activeScope: 'level:2' }),
				true,
			).map((option) => option.id),
		).not.toContain('sub');
		expect(
			visibleSortOptions(
				'props',
				stateFor('props', { activeScope: 'level:2' }),
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
		// Spec 08 §3.1: every level resolves parent -> level -> all.
		expect(tagsSource).toContain('sortWithScopes(');
		expect(tagsSource).toContain("siblingScopeSort('tags'");
	});

	// U121-029: while a note is anchored the drawer leads with the two modes
	// that decide *which* note, separated from everything below that shapes
	// the level. Spec 08 §3.4 moved `filtered` out of this block entirely.
	it('leads with the reveal anchor modes only while a note is anchored', () => {
		const withReveal = byLevelModel(
			'props',
			stateFor('props', { activeScope: 'level:1' }),
			true,
			true,
		);
		// U121-079: groups llega al final de los scopes de By-level.
		expect(withReveal?.items.map((item) => item.id)).toEqual([
			'reveal-current-file',
			'reveal-drill',
			'reveal-separator',
			'addPropertyFirst',
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
