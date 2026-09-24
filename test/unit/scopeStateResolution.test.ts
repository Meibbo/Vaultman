import { describe, expect, it } from 'vitest';
import {
	cloneExplorerSortState,
	cloneScopeState,
	hasScopeGrouping,
	normalizeExplorerSortState,
	normalizeScopeState,
	replaceActiveScopeSort,
	resolveScopeSet,
	scopeStateFromLegacy,
} from '../../src/logic/logicScopedSort';
import type { ScopeState } from '../../src/types/typeUI';
import type { TreeNode } from '../../src/types/typeTree';
import {
	projectGroupedTreeInScope,
	projectGroupedTreeScopeState,
	type GroupProjectionInput,
} from '../../src/logic/logicTreeGroupProjection';
import { makeScopedGroupKey } from '../../src/logic/logicScopedCustomGroups';
import { resolveCustomGroups } from '../../src/logic/logicTreeGroupProjection';

describe('U130-GGC cumulative scope sets', () => {
	const state: ScopeState = {
		cursor: 'all',
		sets: {
			all: {
				sort: { sortBy: 'name', direction: 'asc' },
				groupPreset: { kind: 'letter', direction: 'asc' },
				cellToggles: { count: true, icon: true },
				nodeTypeFilters: ['file'],
			},
			'level:2': {
				groupPreset: { kind: 'words', direction: 'desc' },
				cellToggles: { count: false },
			},
			'parent:projects': {
				sort: { sortBy: 'modified', direction: 'desc' },
				cellToggles: { icon: false },
			},
		},
	};

	it('resolves parent > level > all per field and merges cell overrides', () => {
		const resolved = resolveScopeSet(state, {
			level: 2,
			parentCanonicalId: 'projects',
		});
		expect(resolved.sort).toEqual({ sortBy: 'modified', direction: 'desc' });
		expect(resolved.groupPreset?.kind).toBe('words');
		expect(resolved.nodeTypeFilters).toEqual(['file']);
		expect(resolved.cellToggles).toEqual({ count: false, icon: false });
	});

	it('changing the cursor does not change projection resolution', () => {
		const node = { level: 2, parentId: 'projects' };
		const before = resolveScopeSet(state, node);
		const after = resolveScopeSet({ ...state, cursor: 'level:2' }, node);
		expect(after).toEqual(before);
	});

	it('keeps grouping active when the cursor moves to an ungrouped target', () => {
		expect(hasScopeGrouping(state)).toBe(true);
		expect(hasScopeGrouping({
			cursor: 'level:3',
			sets: { all: { groupPreset: { kind: 'none', direction: 'asc' } } },
		})).toBe(false);
	});

	it('hidden targets fall through without deleting their sets', () => {
		const hidden: ScopeState = {
			...state,
			sets: {
				...state.sets,
				'level:2': { ...state.sets['level:2'], hidden: true },
			},
		};
		expect(resolveScopeSet(hidden, { level: 2 }).groupPreset?.kind).toBe('letter');
		expect(hidden.sets['level:2']).toHaveProperty('hidden', true);
	});

	it('migrates the flat scene fields into cumulative all/parent sets', () => {
		const migrated = scopeStateFromLegacy('files', {
			sorts: {
				all: { sortBy: 'name', direction: 'asc' },
				drill: { sortBy: 'modified', direction: 'desc' },
			},
			activeScope: 'drill',
			drillNodeId: 'projects',
			nodeTypeFilter: 'file',
			filtered: true,
		}, { kind: 'words', direction: 'asc' });
		expect(migrated.cursor).toBe('parent:projects');
		expect(migrated.sets['parent:projects']?.sort?.sortBy).toBe('modified');
		expect(migrated.sets['parent:projects']?.groupPreset).toBeUndefined();
		expect(migrated.sets.all?.groupPreset?.kind).toBe('words');
		expect(migrated.sets.all?.filterPolicy).toBe('included');
		expect(migrated.sets.all?.nodeTypeFilters).toEqual(['file']);
	});

	it('persists scope sets inside the scene-owned sort snapshot', () => {
		const normalized = normalizeExplorerSortState('files', {
			sorts: { all: { sortBy: 'name', direction: 'asc' } },
			activeScope: 'level:2',
			drillNodeId: null,
			nodeTypeFilter: null,
			scopeState: state,
		});
		expect(normalized.scopeState?.cursor).toBe('all');
		expect(normalized.scopeState?.sets['level:2']?.groupPreset?.kind).toBe('words');

		const changed = replaceActiveScopeSort('files', normalized, {
			sortBy: 'modified',
			direction: 'desc',
		});
		expect(changed.scopeState?.cursor).toBe('level:2');
		expect(changed.scopeState?.sets['level:2']?.sort).toEqual({
			sortBy: 'modified',
			direction: 'desc',
		});
	});

	it('clones nested scope sets at persistence boundaries', () => {
		const normalized = normalizeExplorerSortState('files', {
			sorts: {},
			activeScope: 'all',
			drillNodeId: null,
			nodeTypeFilter: null,
			scopeState: state,
		});
		const clone = cloneExplorerSortState(normalized);
		clone.scopeState!.sets.all!.cellToggles!.count = false;
		expect(normalized.scopeState!.sets.all!.cellToggles!.count).toBe(true);
	});

	it('walks every sibling list for All while preserving parent boundaries', () => {
		const roots: TreeNode<null>[] = [
			{
				id: 'a', label: 'A', depth: 0, meta: null,
				children: [
					{ id: 'a-z', label: 'Zed', depth: 1, meta: null },
					{ id: 'a-alpha', label: 'Alpha', depth: 1, meta: null },
				],
			},
			{
				id: 'b', label: 'B', depth: 0, meta: null,
				children: [
					{ id: 'b-z', label: 'Zulu', depth: 1, meta: null },
					{ id: 'b-beta', label: 'Beta', depth: 1, meta: null },
				],
			},
		];
		const input: GroupProjectionInput<null> = {
			nodes: roots,
			groups: [],
			memberships: {},
			providerId: 'files',
			noGroupLabel: 'No group',
			filtered: false,
			preset: { kind: 'letter', direction: 'asc' },
		};
		const out = projectGroupedTreeInScope(input, { kind: 'all' });
		expect(out.map((node) => node.label)).toEqual(['A', 'B']);
		expect(out[0]?.children?.[0]?.children?.map((node) => node.label)).toEqual([
			'A',
			'Z',
		]);
		expect(out[1]?.children?.[0]?.children?.map((node) => node.label)).toEqual([
			'B',
			'Z',
		]);
		expect(out[0]?.children?.[0]?.children?.[0]?.children?.[0]?.label).toBe('Alpha');
		expect(out[1]?.children?.[0]?.children?.[0]?.children?.[0]?.label).toBe('Beta');
	});

	it('keeps independent parent projections while the edit cursor moves', () => {
		const roots: TreeNode<null>[] = [
			{
				id: 'a', label: 'A', depth: 0, meta: null,
				children: [
					{ id: 'a-z', label: 'Zed', depth: 1, meta: null },
					{ id: 'a-alpha', label: 'Alpha', depth: 1, meta: null },
				],
			},
			{
				id: 'b', label: 'B', depth: 0, meta: null,
				children: [
					{ id: 'b-z', label: 'Zulu', depth: 1, meta: null },
					{ id: 'b-beta', label: 'Beta', depth: 1, meta: null },
				],
			},
		];
		const input: GroupProjectionInput<null> = {
			nodes: roots,
			groups: [],
			memberships: {},
			providerId: 'files',
			noGroupLabel: 'No group',
			filtered: false,
			preset: { kind: 'none', direction: 'asc' },
		};
		const projected = projectGroupedTreeScopeState(input, {
			cursor: 'parent:a',
			sets: {
				'parent:a': { groupPreset: { kind: 'none', direction: 'asc' } },
				'parent:b': { groupPreset: { kind: 'letter', direction: 'asc' } },
			},
		});
		expect(projected[0]?.children?.map((node) => node.label)).toEqual([
			'Zed',
			'Alpha',
		]);
		expect(projected[1]?.children?.map((node) => node.label)).toEqual(['B', 'Z']);
	});

	it('gives repeated scoped headers unique row IDs and their actual depth', () => {
		const roots: TreeNode<null>[] = ['a', 'b'].map((id) => ({
			id,
			label: id,
			depth: 0,
			meta: null,
			children: [{ id: `${id}-child`, label: 'Zed', depth: 1, meta: null }],
		}));
		const projected = projectGroupedTreeScopeState({
			nodes: roots,
			groups: [], memberships: {}, providerId: 'files',
			noGroupLabel: 'No group', filtered: false,
			preset: { kind: 'none', direction: 'asc' },
		}, {
			cursor: 'parent:b',
			sets: {
				'level:2': { groupPreset: { kind: 'letter', direction: 'asc' } },
			},
		});
		const aHeader = projected[0]?.children?.[0];
		const bHeader = projected[1]?.children?.[0];
		expect(aHeader?.isGroupHeader).toBe(true);
		expect(bHeader?.isGroupHeader).toBe(true);
		expect(aHeader?.id).not.toBe(bHeader?.id);
		expect(aHeader?.entityId).toBe(bHeader?.entityId);
		expect(aHeader?.depth).toBe(1);
		expect(bHeader?.depth).toBe(1);
	});

	it('carries resolved cell toggles on rows independently of the cursor', () => {
		const roots: TreeNode<null>[] = [
			{
				id: 'a', label: 'A', depth: 0, meta: null,
				children: [{ id: 'a-child', label: 'Child', depth: 1, meta: null }],
			},
		];
		const projected = projectGroupedTreeScopeState({
			nodes: roots,
			groups: [],
			memberships: {},
			providerId: 'files',
			noGroupLabel: 'No group',
			filtered: false,
			preset: { kind: 'none', direction: 'asc' },
		}, {
			cursor: 'all',
			sets: {
				all: { cellToggles: { icon: true } },
				'parent:a': { cellToggles: { count: false } },
			},
		});
		expect(projected[0]?.scopeCellToggles).toEqual({ icon: true });
		expect(projected[0]?.children?.[0]?.scopeCellToggles).toEqual({
			icon: true,
			count: false,
		});
	});

	it('projects custom groups only into their owning target while keeping both levels', () => {
		const outer = makeScopedGroupKey('level:1', 'Outer');
		const inner = makeScopedGroupKey('level:2', 'Inner');
		const memberships = {
			[outer]: ['props:prop:Status|Status'],
			[inner]: ['props:value:Open|Open'],
		};
		const roots: TreeNode<null>[] = [{
			id: 'status', label: 'Status', depth: 0, meta: null,
			children: [{ id: 'open', label: 'Open', depth: 1, meta: null }],
		}];
		const projected = projectGroupedTreeScopeState({
			nodes: roots,
			groups: resolveCustomGroups(memberships), memberships,
			providerId: 'props', noGroupLabel: 'No group', filtered: false,
			preset: { kind: 'none', direction: 'asc' },
			urnOf: (node) => node.depth === 0
				? `props:prop:${node.label}|${node.label}`
				: `props:value:${node.label}|${node.label}`,
		}, {
			cursor: 'level:2',
			sets: {
				'level:1': { groupPreset: { kind: 'custom', direction: 'asc' } },
				'level:2': { groupPreset: { kind: 'custom', direction: 'asc' } },
			},
		});
		expect(projected[0]?.label).toBe('Outer');
		const parent = projected[0]?.children?.[0];
		expect(parent?.label).toBe('Status');
		expect(parent?.children?.[0]?.label).toBe('Inner');
		expect(parent?.children?.[0]?.children?.[0]?.label).toBe('Open');
	});

	it('U130-GGC-027: normalizeScopeState preserves level:1 on add-on explorers (snippets and plugins)', () => {
		const pluginRawState = {
			cursor: 'all',
			sets: {
				all: { sort: { sortBy: 'name', direction: 'asc' } },
				'level:1': { groupPreset: { kind: 'custom', direction: 'asc' } },
			},
		};
		const normalizedPlugins = normalizeScopeState('plugins', pluginRawState, {
			sorts: { all: { sortBy: 'name', direction: 'asc' } },
			activeScope: 'all',
			nodeTypeFilter: null,
		});
		expect(normalizedPlugins.sets['level:1']).toBeDefined();
		expect(normalizedPlugins.sets['level:1']?.groupPreset?.kind).toBe('custom');

		const snippetRawState = {
			cursor: 'all',
			sets: {
				all: { sort: { sortBy: 'name', direction: 'asc' } },
				'level:1': { groupPreset: { kind: 'custom', direction: 'asc' } },
			},
		};
		const normalizedSnippets = normalizeScopeState('snippets', snippetRawState, {
			sorts: { all: { sortBy: 'name', direction: 'asc' } },
			activeScope: 'all',
			nodeTypeFilter: null,
		});
		expect(normalizedSnippets.sets['level:1']).toBeDefined();
		expect(normalizedSnippets.sets['level:1']?.groupPreset?.kind).toBe('custom');
	});

	it('U130-GGC-003: groups words and modified across All, Level 1/2, and Parent with 3-depth 2-parents-per-level fixture', () => {
		interface TestMeta {
			words: number;
			modified: number;
		}

		const now = 1700000000000;
		const DAY = 86400000;

		const createFixture = (): TreeNode<TestMeta>[] => [
			{
				id: 'p1',
				label: 'Parent 1',
				depth: 0,
				meta: { words: 50, modified: now - 2 * DAY },
				children: [
					{
						id: 'p1_c1',
						label: 'Child 1.1',
						depth: 1,
						meta: { words: 500, modified: now - 30 * DAY },
						children: [
							{ id: 'p1_c1_g1', label: 'Grandchild 1.1.1', depth: 2, meta: { words: 20, modified: now - 1 * DAY } },
							{ id: 'p1_c1_g2', label: 'Grandchild 1.1.2', depth: 2, meta: { words: 200, modified: now - 50 * DAY } },
						],
					},
					{
						id: 'p1_c2',
						label: 'Child 1.2',
						depth: 1,
						meta: { words: 80, modified: now - 3 * DAY },
						children: [
							{ id: 'p1_c2_g1', label: 'Grandchild 1.2.1', depth: 2, meta: { words: 300, modified: now - 100 * DAY } },
							{ id: 'p1_c2_g2', label: 'Grandchild 1.2.2', depth: 2, meta: { words: 10, modified: now - 2 * DAY } },
						],
					},
				],
			},
			{
				id: 'p2',
				label: 'Parent 2',
				depth: 0,
				meta: { words: 300, modified: now - 60 * DAY },
				children: [
					{
						id: 'p2_c1',
						label: 'Child 2.1',
						depth: 1,
						meta: { words: 40, modified: now - 1 * DAY },
						children: [
							{ id: 'p2_c1_g1', label: 'Grandchild 2.1.1', depth: 2, meta: { words: 50, modified: now - 2 * DAY } },
							{ id: 'p2_c1_g2', label: 'Grandchild 2.1.2', depth: 2, meta: { words: 600, modified: now - 40 * DAY } },
						],
					},
					{
						id: 'p2_c2',
						label: 'Child 2.2',
						depth: 1,
						meta: { words: 150, modified: now - 10 * DAY },
						children: [
							{ id: 'p2_c2_g1', label: 'Grandchild 2.2.1', depth: 2, meta: { words: 70, modified: now - 4 * DAY } },
							{ id: 'p2_c2_g2', label: 'Grandchild 2.2.2', depth: 2, meta: { words: 120, modified: now - 15 * DAY } },
						],
					},
				],
			},
		];

		const wordsPreset = {
			kind: 'words' as const,
			direction: 'asc' as const,
			counterRanges: [
				{ id: 'w-low', lo: 0, hi: 100 },
				{ id: 'w-high', lo: 101, hi: 1000 },
			],
		};

		const modifiedPreset = {
			kind: 'modified' as const,
			direction: 'asc' as const,
			counterRanges: [
				{ id: 'd-recent', lo: 0, hi: 7 },
				{ id: 'd-old', lo: 8, hi: 365 },
			],
		};

		const makeInput = (nodes: TreeNode<TestMeta>[]): GroupProjectionInput<TestMeta> => ({
			nodes,
			groups: [],
			memberships: {},
			providerId: 'files',
			noGroupLabel: 'No group',
			filtered: false,
			preset: { kind: 'none', direction: 'asc' },
			presetValueOf: (node, kind) =>
				kind === 'words' ? node.meta.words : kind === 'modified' ? node.meta.modified : null,
			now,
		});

		// 1. All levels groups root and deep branches without hoisting
		const projectedAll = projectGroupedTreeScopeState(makeInput(createFixture()), {
			cursor: 'all',
			sets: { all: { groupPreset: wordsPreset } },
		});
		// Root has group headers
		expect(projectedAll.every((n) => n.isGroupHeader)).toBe(true);
		expect(projectedAll.map((n) => n.label)).toEqual(['0–100', '101–1000']);
		const lowHeader = projectedAll.find((n) => n.label === '0–100');
		const p1InAll = lowHeader?.children?.find((n) => n.id === 'p1');
		expect(p1InAll).toBeDefined();
		// Level 2 inside p1 is grouped
		expect(p1InAll?.children?.every((n) => n.isGroupHeader)).toBe(true);
		// Level 3 inside child is grouped
		const p1ChildLowHeader = p1InAll?.children?.find((n) => n.label === '0–100');
		const child12 = p1ChildLowHeader?.children?.find((n) => n.id === 'p1_c2');
		expect(child12).toBeDefined();
		expect(child12?.children?.every((n) => n.isGroupHeader)).toBe(true);

		// 2. Level 2 target groups each branch separately without hoisting
		const projectedLevel2 = projectGroupedTreeScopeState(makeInput(createFixture()), {
			cursor: 'level:2',
			sets: { 'level:2': { groupPreset: wordsPreset } },
		});
		// Root is NOT grouped
		expect(projectedLevel2.map((n) => n.id)).toEqual(['p1', 'p2']);
		// p1's children are grouped under p1
		expect(projectedLevel2[0]?.children?.every((n) => n.isGroupHeader)).toBe(true);
		// p2's children are grouped under p2
		expect(projectedLevel2[1]?.children?.every((n) => n.isGroupHeader)).toBe(true);
		// Separate branch headers (distinct ids)
		expect(projectedLevel2[0]?.children?.[0]?.id).not.toBe(projectedLevel2[1]?.children?.[0]?.id);
		// Level 3 children are NOT grouped
		const childInL2 = projectedLevel2[0]?.children?.[0]?.children?.[0];
		expect(childInL2?.children?.some((n) => n.isGroupHeader)).toBe(false);

		// 3. Parent target groups only direct children of that parent
		const projectedParent = projectGroupedTreeScopeState(makeInput(createFixture()), {
			cursor: 'parent:p1',
			sets: { 'parent:p1': { groupPreset: modifiedPreset } },
		});
		// Root is NOT grouped
		expect(projectedParent.map((n) => n.id)).toEqual(['p1', 'p2']);
		// p1's children ARE grouped into modified headers
		expect(projectedParent[0]?.children?.every((n) => n.isGroupHeader)).toBe(true);
		// p2's children are NOT grouped
		expect(projectedParent[1]?.children?.every((n) => n.isGroupHeader)).toBe(false);
		expect(projectedParent[1]?.children?.map((n) => n.id)).toEqual(['p2_c1', 'p2_c2']);

		// 4. Override 'none' shuts off All inheritance for that level without deleting other sets
		const projectedOverrideNone = projectGroupedTreeScopeState(makeInput(createFixture()), {
			cursor: 'level:2',
			sets: {
				all: { groupPreset: wordsPreset },
				'level:2': { groupPreset: { kind: 'none', direction: 'asc' } },
			},
		});
		// Level 1 IS grouped (inherits from all)
		expect(projectedOverrideNone.every((n) => n.isGroupHeader)).toBe(true);
		const p1UnderOverride = projectedOverrideNone.find((n) => n.label === '0–100')?.children?.find((n) => n.id === 'p1');
		// Level 2 is UNGROUPED (overridden by none)
		expect(p1UnderOverride?.children?.every((n) => n.isGroupHeader)).toBe(false);
		expect(p1UnderOverride?.children?.map((n) => n.id)).toEqual(['p1_c1', 'p1_c2']);
		// Level 3 IS grouped (inherits from all)
		expect(p1UnderOverride?.children?.[0]?.children?.every((n) => n.isGroupHeader)).toBe(true);
	});

	it('U130-GGC-029: resolves View and Engine options per scope target with parent > level > all cascade', () => {
		const engineScopeState: ScopeState = {
			cursor: 'all',
			sets: {
				all: {
					viewMode: 'tree',
					nested: true,
					indent: true,
					stickyRows: true,
				},
				'level:2': {
					indent: false,
				},
				'parent:p1': {
					nested: false,
					stickyRows: false,
				},
			},
		};

		// 1. Root level (level: 1, parentId: null) inherits from all
		const rootResolved = resolveScopeSet(engineScopeState, { level: 1, parentId: null });
		expect(rootResolved.viewMode).toBe('tree');
		expect(rootResolved.nested).toBe(true);
		expect(rootResolved.indent).toBe(true);
		expect(rootResolved.stickyRows).toBe(true);

		// 2. Level 2 under another parent (parentId: 'p2') overrides indent: false, inherits nested: true & stickyRows: true
		const p2ChildResolved = resolveScopeSet(engineScopeState, { level: 2, parentId: 'p2' });
		expect(p2ChildResolved.indent).toBe(false);
		expect(p2ChildResolved.nested).toBe(true);
		expect(p2ChildResolved.stickyRows).toBe(true);

		// 3. Level 2 under p1 overrides nested: false & stickyRows: false, and overrides indent: false from level:2
		const p1ChildResolved = resolveScopeSet(engineScopeState, { level: 2, parentId: 'p1' });
		expect(p1ChildResolved.nested).toBe(false);
		expect(p1ChildResolved.stickyRows).toBe(false);
		expect(p1ChildResolved.indent).toBe(false);

		// 4. Changing cursor does not change resolution
		const cursorChanged = { ...engineScopeState, cursor: 'level:2' as const };
		expect(resolveScopeSet(cursorChanged, { level: 2, parentId: 'p1' })).toEqual(p1ChildResolved);

		// 5. Roundtrip normalizeScopeState and cloneScopeState preserves engine options
		const cloned = cloneScopeState(engineScopeState);
		expect(cloned.sets['parent:p1']?.nested).toBe(false);
		expect(cloned.sets['level:2']?.indent).toBe(false);
		expect(cloned.sets.all?.stickyRows).toBe(true);

		const normalized = normalizeScopeState('files', engineScopeState, {
			sorts: {},
			activeScope: 'all',
			nodeTypeFilter: null,
		});
		expect(normalized.sets['parent:p1']?.nested).toBe(false);
		expect(normalized.sets['level:2']?.indent).toBe(false);
		expect(normalized.sets.all?.stickyRows).toBe(true);
	});
});
