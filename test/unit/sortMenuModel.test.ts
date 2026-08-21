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
			true,
		);
		expect(enabled?.items.map((item) => item.id)).toEqual([
			// U121-052: `filtered` encabeza el grupo, como en Props y Tags.
			'filtered',
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
			true,
		);
		expect(foldersMixed?.items.map((item) => item.id)).toEqual([
			// U121-052: `filtered` encabeza el grupo, como en Props y Tags.
			'filtered',
			'nested',
			'parentsFirst',
			'scope-separator',
			'drill',
			'all',
		]);
	});

	it('drops the folder options when nesting is off or the view is flat', () => {
		// Nested off: only the Nested toggle survives — folders-first, all levels
		// and scope have no single-level meaning.
		expect(
			byLevelModel('files', stateFor('files'), false)?.items.map((i) => i.id),
			// U121-052: `files` gana `filtered` y, por el mismo motivo que ya se
			// documenta debajo para los node providers, NO se condiciona al anidado:
			// estrechar el conjunto de origen tambien significa algo en plano.
		).toEqual(['filtered', 'nested']);
		// U121-029: the node providers carry `filtered` above Nested, and it is
		// not gated on nesting — narrowing the source set means something on a
		// flat level too.
		expect(
			byLevelModel('tags', stateFor('tags'), false)?.items.map((i) => i.id),
		).toEqual(['filtered', 'nested']);
		// A flat view (table/cards) has no By-level group at all.
		expect(byLevelModel('files', stateFor('files'), true, false)).toBeNull();
		expect(byLevelModel('files', stateFor('files'), false, false)).toBeNull();
	});

	it('projects the same contextual scope order for Props and Tags', () => {
		const props = byLevelModel(
			'props',
			stateFor('props', { activeScope: 'values' }),
			true,
		);
		expect(props?.items.map((item) => item.id)).toEqual([
			'filtered',
			'nested',
			'scope-separator',
			'all',
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
			'filtered',
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
		expect(popupSource).toContain('onNestedToggle');
		expect(popupSource).toContain('void initialSortState;');
		expect(navbarSource).toContain('nestedActive={nestedActiveFor(activeTab)}');
		expect(navbarSource).toContain(
			'onNestedToggle={() => toggleNestedFor(activeTab)}',
		);
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
	// that decide *which* note, separated from everything below that shapes the
	// level. `filtered` sits with Nested, deliberately without a divider.
	it('leads with the reveal anchor modes only while a note is anchored', () => {
		const withReveal = byLevelModel(
			'props',
			stateFor('props', { activeScope: 'properties' }),
			true,
			true,
			true,
		);
		expect(withReveal?.items.map((item) => item.id)).toEqual([
			'reveal-current-file',
			'reveal-drill',
			'reveal-separator',
			'filtered',
			'nested',
			'scope-separator',
			'all',
			'properties',
			'values',
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
			true,
		);
		expect(
			pinned?.items.find((item) => item.id === 'reveal-drill'),
		).toMatchObject({ checked: true });

		// Files has no reveal projection of its own here.
		expect(
			byLevelModel('files', stateFor('files'), true, true, true)?.items.map(
				(item) => item.id,
			),
		).not.toContain('reveal-current-file');
	});
});
