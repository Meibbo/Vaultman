import { describe, expect, it } from 'vitest';
import {
	cloneExplorerSortState,
	hasScopeGrouping,
	normalizeExplorerSortState,
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
});
