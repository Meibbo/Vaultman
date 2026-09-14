import { describe, expect, it } from 'vitest';
import {
	activeScopeSort,
	isScopeAllowed,
	normalizeExplorerSortState,
	replaceActiveScopeSort,
	scopesForTab,
	siblingScopeSort,
	sortWithScopes,
	storageScope,
	supportsLevelScopes,
} from '../../src/logic/logicScopedSort';
import { canAddMember } from '../../src/logic/logicNodeGroup';
import type { ExplorerSortState, ScopeSort } from '../../src/types/typeUI';

const name = (direction: 'asc' | 'desc' = 'asc'): ScopeSort => ({ sortBy: 'name', direction });
const count = (direction: 'asc' | 'desc' = 'desc'): ScopeSort => ({ sortBy: 'count', direction });

describe('spec 08 §3.1.bis — scopes are levels, and the old names migrate', () => {
	it('retires properties/values/groups as named scopes on every tab', () => {
		for (const tab of ['props', 'files', 'tags', 'snippets', 'plugins'] as const) {
			expect(scopesForTab(tab)).not.toContain('properties');
			expect(scopesForTab(tab)).not.toContain('values');
			expect(scopesForTab(tab)).not.toContain('groups');
		}
		expect(supportsLevelScopes('props')).toBe(true);
		expect(supportsLevelScopes('snippets')).toBe(false);
		expect(isScopeAllowed('files', 'level:3')).toBe(true);
		expect(isScopeAllowed('files', 'parent:folder:A')).toBe(true);
		expect(isScopeAllowed('snippets', 'level:1')).toBe(false);
		expect(isScopeAllowed('files', 'groups')).toBe(false);
	});

	it('migrates a persisted props instance: properties → level:1, values → level:2', () => {
		const state = normalizeExplorerSortState('props', {
			sorts: { all: name(), properties: count(), values: name('desc') },
			activeScope: 'values',
			nodeTypeFilter: null,
		});
		expect(state.sorts).toEqual({
			all: name(),
			'level:1': count(),
			'level:2': name('desc'),
		});
		expect(state.activeScope).toBe('level:2');
	});

	it('D4: a persisted `groups` scope becomes level 0 and turns nothing on', () => {
		const state = normalizeExplorerSortState('files', {
			sorts: { all: name(), groups: count() },
			activeScope: 'groups',
			nodeTypeFilter: null,
		});
		expect(state.activeScope).toBe('level:0');
		expect(state.sorts['level:0']).toEqual(count());
		// Level 0 keeps its own default instead of inheriting `all`.
		expect(activeScopeSort('files', { ...state, sorts: { all: count() } }, 'level:0')).toEqual(name());
	});

	it('keeps U121-079: a lone `properties` entry was the tree-wide sort', () => {
		const state = normalizeExplorerSortState('props', {
			sorts: { properties: count() },
			activeScope: 'properties',
			nodeTypeFilter: null,
		});
		expect(state.sorts).toEqual({ all: count() });
		expect(state.activeScope).toBe('all');
	});

	it('moves the old `drill` sort to the picked parent, and drops it with no pick', () => {
		const picked = normalizeExplorerSortState('files', {
			sorts: { all: name(), drill: count() },
			activeScope: 'drill',
			drillNodeId: 'folder:Projects',
			nodeTypeFilter: null,
		});
		expect(picked.sorts).toEqual({ all: name(), 'parent:folder:Projects': count() });
		expect(storageScope(picked, 'drill')).toBe('parent:folder:Projects');
		expect(activeScopeSort('files', picked, 'drill')).toEqual(count());

		const orphan = normalizeExplorerSortState('files', {
			sorts: { all: name(), drill: count() },
			activeScope: 'all',
			nodeTypeFilter: null,
		});
		expect(orphan.sorts).toEqual({ all: name() });
	});

	it('round-trips level and parent scopes and hidden scopes', () => {
		const state = normalizeExplorerSortState('tags', {
			sorts: { all: name(), 'level:2': count(), 'parent:tag:#a': name('desc') },
			activeScope: 'level:2',
			hiddenScopes: ['parent:tag:#a'],
			drillNodeId: null,
			nodeTypeFilter: null,
		});
		expect(normalizeExplorerSortState('tags', JSON.parse(JSON.stringify(state)))).toEqual(state);
		expect(state.hiddenScopes).toEqual(['parent:tag:#a']);
	});

	it('canAddMember follows the levels', () => {
		const group = { id: 'g', flavor: 'custom' as const, label: 'g', parentId: null };
		expect(canAddMember({ ...group, scope: 'level:1' }, { kind: 'value' })).toBe(false);
		expect(canAddMember({ ...group, scope: 'level:2' }, { kind: 'prop' })).toBe(false);
		expect(canAddMember({ ...group, scope: 'all' }, { kind: 'value' })).toBe(true);
	});
});

describe('spec 08 §3.1 — the siblings resolve parent → level → all', () => {
	const state: ExplorerSortState = {
		sorts: {
			all: name(),
			'level:2': count(),
			'parent:folder:B': name('desc'),
		},
		activeScope: 'all',
		nodeTypeFilter: null,
	};

	it('a parent with its own sort wins, then its level, then all', () => {
		expect(siblingScopeSort('files', state, 'folder:B', 2)).toEqual(name('desc'));
		expect(siblingScopeSort('files', state, 'folder:A', 2)).toEqual(count());
		expect(siblingScopeSort('files', state, null, 1)).toEqual(name());
		expect(siblingScopeSort('files', state, 'folder:C', 3)).toEqual(name());
	});

	it('a hidden scope is skipped without being deleted', () => {
		const hidden = { ...state, hiddenScopes: ['parent:folder:B' as const] };
		expect(siblingScopeSort('files', hidden, 'folder:B', 2)).toEqual(count());
		expect(hidden.sorts['parent:folder:B']).toEqual(name('desc'));
	});

	it('writing the active scope un-hides it', () => {
		const hidden: ExplorerSortState = {
			...state,
			activeScope: 'level:2',
			hiddenScopes: ['level:2'],
		};
		const next = replaceActiveScopeSort('files', hidden, name());
		expect(next.hiddenScopes).toEqual([]);
		expect(next.sorts['level:2']).toEqual(name());
	});

	it('sortWithScopes orders each level with its resolved sort', () => {
		type N = { id: string; label: string; n: number; children?: N[] };
		const tree: N[] = [
			{
				id: 'B',
				label: 'B',
				n: 1,
				children: [
					{ id: 'B/x', label: 'x', n: 5 },
					{ id: 'B/y', label: 'y', n: 9 },
				],
			},
			{
				id: 'A',
				label: 'A',
				n: 2,
				children: [
					{ id: 'A/x', label: 'x', n: 5 },
					{ id: 'A/y', label: 'y', n: 9 },
				],
			},
		];
		const scoped: ExplorerSortState = {
			sorts: { all: name(), 'level:2': count('asc'), 'parent:B': name('desc') },
			activeScope: 'all',
			nodeTypeFilter: null,
		};
		const out = sortWithScopes(
			tree,
			(parentId, level) => siblingScopeSort('files', scoped, parentId, level),
			(sort) => (a: N, b: N) =>
				(sort.sortBy === 'count' ? a.n - b.n : a.label.localeCompare(b.label)) *
				(sort.direction === 'asc' ? 1 : -1),
		);
		// Root: `all` (name asc). Under A: level 2 (count asc). Under B: its own (name desc).
		expect(out.map((n) => n.id)).toEqual(['A', 'B']);
		expect(out[0]?.children?.map((n) => n.id)).toEqual(['A/x', 'A/y']);
		expect(out[1]?.children?.map((n) => n.id)).toEqual(['B/y', 'B/x']);
	});
});
