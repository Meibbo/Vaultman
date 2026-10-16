// U130 tree Navco: letter-jump gate, group-aware scope, cursor cycling and
// native Left two-step/one-step regression. Failing-first: logicTreeNavigation
// does not exist yet; green when the typed Navco seam lands without touching
// logicTreeKeyboard native semantics or the shared Floating Index helper.
// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import {
	handleTreeKeyboardKey,
	type TreeKeyboardCallbacks,
	type TreeKeyboardRow,
} from '../../src/logic/logicTreeKeyboard';
import {
	collectSiblingMembers,
	createTreeLetterCursorStore,
	isLetterJumpKey,
	nextLetterTarget,
	resolveGroupAwareScope,
	runNavcoKeyOverrides,
	shouldLetterJump,
	allowsLetterJump,
	type TreeLetterCursor,
	type TreeLetterGroup,
} from '../../src/logic/logicTreeNavigation';

function letterEvent(key: string, init?: KeyboardEventInit): KeyboardEvent {
	return new KeyboardEvent('keydown', { key, ...init });
}

/** Test double for the shared Floating Index jump contract (owned by the
 * Floating Index lane). Mirrors nextIndexJump semantics: first key or changed
 * member order -> first; repeat same -> next/wrap. No production matching
 * lives in the tree lane. */
function stubJump(
	group: Pick<TreeLetterGroup, 'key' | 'memberIds'>,
	previous: TreeLetterCursor | null,
	labels: ReadonlyMap<string, string>,
): TreeLetterCursor | null {
	const wanted = group.key.toLocaleUpperCase();
	const hits = group.memberIds.filter((id) => {
		const [ch] = Array.from((labels.get(id) ?? '').trim());
		if (!ch) return false;
		const [upper] = Array.from(ch.toLocaleUpperCase());
		return upper === wanted;
	});
	if (hits.length === 0) return null;
	if (!previous || previous.key !== group.key || previous.memberIds.join('') !== group.memberIds.join('')) {
		const first = hits[0];
		if (first === undefined) return null;
		return { key: group.key, memberIds: [...group.memberIds], targetId: first };
	}
	const at = hits.indexOf(previous.targetId);
	const next = hits[(at + 1) % hits.length];
	if (next === undefined) return null;
	return { key: group.key, memberIds: [...group.memberIds], targetId: next };
}

const ROWS: readonly TreeKeyboardRow[] = [
	{ id: 'folder-1', depth: 0, hasChildren: true, isExpanded: true },
	{ id: 'folder-1/apple.md', depth: 1, hasChildren: false, isExpanded: false },
	{ id: 'folder-1/apricot.md', depth: 1, hasChildren: false, isExpanded: false },
	{ id: 'folder-1/banana.md', depth: 1, hasChildren: false, isExpanded: false },
	{ id: 'folder-2', depth: 0, hasChildren: true, isExpanded: false },
	{ id: 'root-file.md', depth: 0, hasChildren: false, isExpanded: false },
];

const LABELS = new Map([
	['folder-1/apple.md', 'apple'],
	['folder-1/apricot.md', 'apricot'],
	['folder-1/banana.md', 'banana'],
]);

function mockCallbacks(): TreeKeyboardCallbacks {
	return {
		onFocus: () => {},
		onToggleExpand: () => {},
		onActivate: () => {},
		onRangeSelect: () => {},
		onClearSelection: () => true,
		onRename: () => {},
	};
}

describe('tree letter-jump key gate', () => {
	it('accepts unmodified printable glyphs including Shift case', () => {
		expect(isLetterJumpKey(letterEvent('a'))).toBe(true);
		expect(isLetterJumpKey(letterEvent('A', { shiftKey: true }))).toBe(true);
		expect(isLetterJumpKey(letterEvent('1'))).toBe(true);
		expect(isLetterJumpKey(letterEvent('_'))).toBe(true);
		expect(isLetterJumpKey(letterEvent('+'))).toBe(true);
	});

	it('bubbles modified hotkeys, multi-char keys and native Space', () => {
		expect(isLetterJumpKey(letterEvent('a', { ctrlKey: true }))).toBe(false);
		expect(isLetterJumpKey(letterEvent('a', { metaKey: true }))).toBe(false);
		expect(isLetterJumpKey(letterEvent('a', { altKey: true }))).toBe(false);
		expect(isLetterJumpKey(letterEvent('ArrowLeft'))).toBe(false);
		expect(isLetterJumpKey(letterEvent('Enter'))).toBe(false);
		expect(isLetterJumpKey(letterEvent(' '))).toBe(false);
		expect(isLetterJumpKey(letterEvent('F2'))).toBe(false);
		expect(isLetterJumpKey(letterEvent(''))).toBe(false);
	});
});

describe('effective name-sort gate', () => {
	it('allows letter jump only for name-sorted sibling levels', () => {
		expect(shouldLetterJump('name')).toBe(true);
		expect(shouldLetterJump('mtime')).toBe(false);
		expect(shouldLetterJump('size')).toBe(false);
		expect(shouldLetterJump('')).toBe(false);
	});

	it('bubbles without calling jump when the effective sort is non-name', () => {
		const jump = vi.fn();
		const target = nextLetterTarget({
			key: 'b',
			rows: ROWS,
			focusedIndex: 1,
			labelOf: (id) => LABELS.get(id) ?? null,
			sortBy: 'mtime',
			jump,
			previous: null,
		});
		expect(target).toBeNull();
		expect(jump).not.toHaveBeenCalled();
	});

	it('allows letter jump when fallbackSortBy is name (e.g. state sort with name tiebreak)', () => {
		expect(allowsLetterJump({ sortBy: 'state', fallbackSortBy: 'name' })).toBe(true);
		expect(allowsLetterJump({ sortBy: 'state' })).toBe(false);
		expect(allowsLetterJump({ sortBy: 'state', fallbackSortBy: 'mtime' })).toBe(false);
		expect(allowsLetterJump({ sortBy: 'name' })).toBe(true);

		const target = nextLetterTarget({
			key: 'b',
			rows: ROWS,
			focusedIndex: 1,
			labelOf: (id) => LABELS.get(id) ?? null,
			sortBy: 'state',
			fallbackSortBy: 'name',
			jump: (group, previous) => stubJump(group, previous, LABELS),
			previous: null,
		});
		expect(target).not.toBeNull();
		expect(target?.targetId).toBe('folder-1/banana.md');
	});

	it('bubbles when no sibling matches the glyph', () => {
		const target = nextLetterTarget({
			key: 'z',
			rows: ROWS,
			focusedIndex: 1,
			labelOf: (id) => LABELS.get(id) ?? null,
			sortBy: 'name',
			jump: (group, previous) => stubJump(group, previous, LABELS),
			previous: null,
		});
		expect(target).toBeNull();
	});
});

describe('sibling collection in rendered order', () => {
	it('collects the focused depth run under one parent', () => {
		const members = collectSiblingMembers(ROWS, 2, (id) => LABELS.get(id) ?? id);
		expect(members.map((m) => m.id)).toEqual([
			'folder-1/apple.md',
			'folder-1/apricot.md',
			'folder-1/banana.md',
		]);
	});

	it('keeps rendered order for desc sorts (no re-sort)', () => {
		const reversed: readonly TreeKeyboardRow[] = [...ROWS].reverse();
		const members = collectSiblingMembers(reversed, 3, (id) => LABELS.get(id) ?? id);
		expect(members.map((m) => m.id)).toEqual([
			'folder-1/banana.md',
			'folder-1/apricot.md',
			'folder-1/apple.md',
		]);
	});
});

describe('first/next/wrap cycling through the shared contract', () => {
	it('uses the real shared matcher and cycle by default, not a test-only adapter', () => {
		const base = { rows: ROWS, focusedIndex: 3, labelOf: (id: string) => LABELS.get(id) ?? null, sortBy: 'name', jump: undefined };
		const first = nextLetterTarget({ ...base, key: 'a', previous: null });
		const next = nextLetterTarget({ ...base, key: 'A', previous: first });
		const wrapped = nextLetterTarget({ ...base, key: 'a', previous: next });
		expect([first?.targetId, next?.targetId, wrapped?.targetId]).toEqual(['folder-1/apple.md', 'folder-1/apricot.md', 'folder-1/apple.md']);
	});
	it('moves first -> next -> wrap over one sibling level', () => {
		const jump = (group: Pick<TreeLetterGroup, 'key' | 'memberIds'>, previous: TreeLetterCursor | null) =>
			stubJump(group, previous, LABELS);
		const base = {
			rows: ROWS,
			focusedIndex: 3,
			labelOf: (id: string) => LABELS.get(id) ?? null,
			sortBy: 'name',
			jump,
		} as const;
		const first = nextLetterTarget({ ...base, key: 'a', previous: null });
		expect(first?.targetId).toBe('folder-1/apple.md');
		const next = nextLetterTarget({ ...base, key: 'a', previous: first });
		expect(next?.targetId).toBe('folder-1/apricot.md');
		const wrapped = nextLetterTarget({ ...base, key: 'a', previous: next });
		expect(wrapped?.targetId).toBe('folder-1/apple.md');
	});

	it('restarts at first when the member order changes', () => {
		const store = createTreeLetterCursorStore((group, previous) => stubJump(group, previous, LABELS));
		const members = ['folder-1/apple.md', 'folder-1/apricot.md'];
		const first = store.advance('a', members);
		expect(first?.targetId).toBe('folder-1/apple.md');
		const second = store.advance('a', members);
		expect(second?.targetId).toBe('folder-1/apricot.md');
		const restarted = store.advance('a', ['folder-1/apricot.md', 'folder-1/apple.md', 'folder-1/banana.md']);
		expect(restarted?.targetId).toBe('folder-1/apricot.md');
	});

	it('resets the owner-local cursor on manual moves', () => {
		const store = createTreeLetterCursorStore((group, previous) => stubJump(group, previous, LABELS));
		const members = ['folder-1/apple.md', 'folder-1/apricot.md'];
		store.advance('a', members);
		store.reset();
		const first = store.advance('a', members);
		expect(first?.targetId).toBe('folder-1/apple.md');
	});
});

describe('group-aware scope resolution', () => {
	const roots = [
		{
			id: 'group:favs',
			label: 'Favs',
			isGroupHeader: true,
			children: [
				{ id: 'note-alpha.md', label: 'alpha' },
				{ id: 'note-beta.md', label: 'beta' },
			],
		},
	];

	it('owns a grouped leaf by its group header with a numeric level', () => {
		const scope = resolveGroupAwareScope(roots, 'note-alpha.md', 1);
		expect(scope.parentId).toBe('group:favs');
		expect(typeof scope.level).toBe('number');
	});

	it('falls back to flat depth+1 without roots', () => {
		const scope = resolveGroupAwareScope(null, 'folder-1/apple.md', 1);
		expect(scope).toEqual({ parentId: null, level: 2 });
	});
});

describe('Navco key override port', () => {
	it('consumes before native when the override handles the key', () => {
		const consumed = runNavcoKeyOverrides(
			{ ArrowLeft: () => true },
			letterEvent('ArrowLeft'),
			{ focusedId: 'folder-1', rows: ROWS },
		);
		expect(consumed).toBe(true);
	});

	it('falls through to native when the override declines', () => {
		const consumed = runNavcoKeyOverrides(
			{ ArrowLeft: () => false },
			letterEvent('ArrowLeft'),
			{ focusedId: 'folder-1', rows: ROWS },
		);
		expect(consumed).toBe(false);
	});
});

describe('native Left regression (exact Obsidian 1.14.4 behavior)', () => {
	it('two-steps a collapsed child folder: focus parent, then collapse it', () => {
		const focused: string[] = [];
		const toggled: Array<[string, boolean]> = [];
		const callbacks: TreeKeyboardCallbacks = {
			...mockCallbacks(),
			onFocus: (id) => { focused.push(id); },
			onToggleExpand: (id, expand) => { toggled.push([id, expand]); },
		};
		const nested: readonly TreeKeyboardRow[] = [
			{ id: 'parent', depth: 0, hasChildren: true, isExpanded: true },
			{ id: 'parent/sub', depth: 1, hasChildren: true, isExpanded: false },
		];
		const first = handleTreeKeyboardKey(letterEvent('ArrowLeft'), { rows: nested, focusedId: 'parent/sub', anchorId: 'parent/sub' }, callbacks);
		expect(first.handled).toBe(true);
		expect(first.next.focusedId).toBe('parent');
		expect(toggled).toEqual([]);
		const second = handleTreeKeyboardKey(letterEvent('ArrowLeft'), first.next, callbacks);
		expect(second.handled).toBe(true);
		expect(toggled).toEqual([['parent', false]]);
	});

	it('single-steps a file: collapse parent and focus it together', () => {
		const focused: string[] = [];
		const toggled: Array<[string, boolean]> = [];
		const callbacks: TreeKeyboardCallbacks = {
			...mockCallbacks(),
			onFocus: (id) => { focused.push(id); },
			onToggleExpand: (id, expand) => { toggled.push([id, expand]); },
		};
		const result = handleTreeKeyboardKey(
			letterEvent('ArrowLeft'),
			{ rows: ROWS, focusedId: 'folder-1/apple.md', anchorId: 'folder-1/apple.md' },
			callbacks,
		);
		expect(result.handled).toBe(true);
		expect(toggled).toEqual([['folder-1', false]]);
		expect(focused).toEqual(['folder-1']);
	});
});
