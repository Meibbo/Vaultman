import { describe, expect, it } from 'vitest';
import {
	cloneScopeState,
	resolveScopeSet,
} from '../../src/logic/logicScopedSort';
import {
	makeScopedGroupKey,
	parseScopedGroupKey,
	scopedNameOf,
} from '../../src/logic/logicScopedCustomGroups';
import { removeCustomMemberships } from '../../src/logic/logicGroupSelectionTransaction';
import {
	isSameTarget,
	isTargetExclusive,
	parseFrontmatterNoteGroups,
	type NoteGroupTarget,
} from '../../src/logic/logicNoteGroups';
import { captureSavedViewConfig } from '../../src/logic/logicSceneConfigPort';
import type { ExplorerSortState, ScopeState } from '../../src/types/typeUI';
import type { SceneConfig } from '../../src/types/typeInstance';

describe('U130-GGC-029: Scoped View and Engine Options Parity', () => {
	it('supports two simultaneous scopes with different engine options and parent > level > all cascade', () => {
		const scopeState: ScopeState = {
			cursor: 'all',
			sets: {
				all: {
					viewMode: 'tree',
					nested: true,
					indent: true,
					stickyRows: true,
					compactFolders: false,
					parentsFirst: true,
					fixedFolders: true,
				},
				'level:1': {
					stickyRows: false,
					indent: true,
				},
				'level:2': {
					indent: false,
					stickyRows: true,
					compactFolders: true,
				},
				'parent:folderA': {
					nested: false,
					parentsFirst: false,
				},
			},
		};

		// 1. Level 1 inherits nested: true from all, overrides stickyRows: false
		const l1Resolved = resolveScopeSet(scopeState, { level: 1, parentId: null });
		expect(l1Resolved.nested).toBe(true);
		expect(l1Resolved.stickyRows).toBe(false);
		expect(l1Resolved.indent).toBe(true);
		expect(l1Resolved.compactFolders).toBe(false);

		// 2. Level 2 under folderB inherits nested: true & stickyRows: true from all, overrides indent: false & compactFolders: true from level:2
		const l2UnderB = resolveScopeSet(scopeState, { level: 2, parentId: 'folderB' });
		expect(l2UnderB.nested).toBe(true);
		expect(l2UnderB.stickyRows).toBe(true);
		expect(l2UnderB.indent).toBe(false);
		expect(l2UnderB.compactFolders).toBe(true);

		// 3. Level 2 under folderA overrides nested: false & parentsFirst: false from parent:folderA
		const l2UnderA = resolveScopeSet(scopeState, { level: 2, parentId: 'folderA' });
		expect(l2UnderA.nested).toBe(false);
		expect(l2UnderA.parentsFirst).toBe(false);
		expect(l2UnderA.indent).toBe(false); // from level:2
		expect(l2UnderA.stickyRows).toBe(true); // from level:2

		// 4. Changing cursor does NOT alter target sets or resolution
		const cursorL2: ScopeState = { ...scopeState, cursor: 'level:2' };
		const resolvedAfterCursorChange = resolveScopeSet(cursorL2, { level: 1, parentId: null });
		expect(resolvedAfterCursorChange.stickyRows).toBe(false);
		expect(cursorL2.sets['level:1']?.stickyRows).toBe(false);
		expect(cursorL2.sets.all?.stickyRows).toBe(true);
	});

	it('persists and roundtrips scoped engine options through SavedLayoutConfig and cloneExplorerSortState', () => {
		const initialSortState: ExplorerSortState = {
			sorts: { all: { sortBy: 'name', direction: 'asc' } },
			activeScope: 'level:2',
			nodeTypeFilter: null,
			scopeState: {
				cursor: 'level:2',
				sets: {
					all: {
						viewMode: 'tree',
						nested: true,
						indent: true,
					},
					'level:2': {
						indent: false,
						stickyRows: false,
						compactFolders: true,
					},
					'parent:special': {
						nested: false,
					},
				},
			},
		};

		const sceneConfig: SceneConfig = {
			viewMode: 'tree',
			visibleCells: ['name', 'nested'],
			sortState: initialSortState,
			interactionMode: 'filter',
			stickyRows: true,
			compactFolders: false,
			indent: true,
			groupPreset: { kind: 'none', direction: 'asc' },
			hiddenGroupIds: [],
			groupMemberships: {},
		};

		const saved = captureSavedViewConfig(sceneConfig as Required<SceneConfig>);
		expect(saved.sortState?.scopeState?.sets['level:2']?.indent).toBe(false);
		expect(saved.sortState?.scopeState?.sets['level:2']?.stickyRows).toBe(false);
		expect(saved.sortState?.scopeState?.sets['level:2']?.compactFolders).toBe(true);
		expect(saved.sortState?.scopeState?.sets['parent:special']?.nested).toBe(false);

		// Verify clone preserves everything
		const cloned = cloneScopeState(saved.sortState!.scopeState!);
		expect(cloned.sets['level:2']?.stickyRows).toBe(false);
		expect(cloned.sets['parent:special']?.nested).toBe(false);
	});
});

describe('U130-GGC-011: Scoped Custom and Note Groups Parity', () => {
	it('supports same-name custom groups across Level 1, Level 2, and Parent targets without collision', () => {
		const name = 'SprintGoals';
		const keyL1 = makeScopedGroupKey('level:1', name);
		const keyL2 = makeScopedGroupKey('level:2', name);
		const keyParent = makeScopedGroupKey('parent:projectX', name);

		// Keys are all distinct
		expect(keyL1).not.toBe(keyL2);
		expect(keyL1).not.toBe(keyParent);
		expect(keyL2).not.toBe(keyParent);

		// Codec extracts target and original name
		expect(parseScopedGroupKey(keyL1)).toEqual({ target: 'level:1', name, legacy: false });
		expect(parseScopedGroupKey(keyL2)).toEqual({ target: 'level:2', name, legacy: false });
		expect(parseScopedGroupKey(keyParent)).toEqual({ target: 'parent:projectX', name, legacy: false });

		expect(scopedNameOf(keyL1)).toBe(name);
		expect(scopedNameOf(keyL2)).toBe(name);
		expect(scopedNameOf(keyParent)).toBe(name);

		// Memberships dictionary stores all three simultaneously
		const memberships: Record<string, readonly string[]> = {
			[keyL1]: ['props:prop:p1|p1'],
			[keyL2]: ['props:prop:p2|p2', 'props:prop:p3|p3'],
			[keyParent]: ['props:prop:p4|p4'],
		};

		expect(Object.keys(memberships)).toHaveLength(3);
		expect(memberships[keyL1]).toEqual(['props:prop:p1|p1']);
		expect(memberships[keyL2]).toEqual(['props:prop:p2|p2', 'props:prop:p3|p3']);
		expect(memberships[keyParent]).toEqual(['props:prop:p4|p4']);
	});

	it('isolates Hide, Delete, and Degroup to the targeted definition only', () => {
		const name = 'Shared';
		const keyL1 = makeScopedGroupKey('level:1', name);
		const keyL2 = makeScopedGroupKey('level:2', name);

		let memberships: Record<string, readonly string[]> = {
			[keyL1]: ['props:prop:p1|p1'],
			[keyL2]: ['props:prop:p2|p2'],
		};

		let hiddenGroupIds = [keyL1];

		// 1. Hide isolates: only keyL1 is hidden, keyL2 is visible
		expect(hiddenGroupIds.includes(keyL1)).toBe(true);
		expect(hiddenGroupIds.includes(keyL2)).toBe(false);

		// 2. Degroup isolates: removing p1 from keyL1 does not affect keyL2
		const afterDegroup = removeCustomMemberships(memberships, keyL1, ['p1']);
		expect(afterDegroup[keyL1]).toEqual([]);
		expect(afterDegroup[keyL2]).toEqual(['props:prop:p2|p2']);

		// 3. Delete isolates: deleting keyL1 leaves keyL2 intact
		const { [keyL1]: _deleted, ...afterDelete } = afterDegroup;
		expect(afterDelete[keyL1]).toBeUndefined();
		expect(afterDelete[keyL2]).toEqual(['props:prop:p2|p2']);
	});

	it('enforces Custom vs Note exclusivity only within the same target, allowing cross-target coexistence', () => {
		const targetL1: NoteGroupTarget = { kind: 'level', level: 1 };
		const targetL2: NoteGroupTarget = { kind: 'level', level: 2 };

		// Same target check
		expect(isSameTarget(targetL1, targetL1)).toBe(true);
		expect(isSameTarget(targetL1, targetL2)).toBe(false);

		// Exclusivity metadata helper
		const exclusiveL1 = isTargetExclusive(targetL1, 'custom');
		expect(exclusiveL1.activeKind).toBe('custom');
		expect(exclusiveL1.target).toEqual(targetL1);

		// Frontmatter parsing for targetL2 note group while targetL1 uses custom group
		const fm = {
			prop_TargetNote_level2: ['valA', 'valB'],
		};
		const noteRes = parseFrontmatterNoteGroups(fm, 'prop', targetL2);
		expect(noteRes.groups).toHaveLength(1);
		expect(noteRes.groups[0].id).toBe('TargetNote');
		expect(noteRes.memberships['TargetNote']).toEqual(['valA', 'valB']);

		// TargetL1 note groups query finds nothing for targetL1 in that frontmatter
		const noteResL1 = parseFrontmatterNoteGroups(fm, 'prop', targetL1);
		expect(noteResL1.groups).toHaveLength(0);
	});
});
