import { describe, expect, it, vi } from 'vitest';
import {
	applyTextCase,
	normalizeTextCaseMap,
	resolveTextCase,
	sameTextCaseMap,
	toTitleCase,
} from '../../src/logic/logicTextCaseProjection';
import {
	bridgeAliasForSelector,
	NATIVE_TREE_PROFILES,
	normalizeNativeCompatPolicy,
	resolveNativeCompatMode,
	sameNativeCompatPolicy,
	toNativeSceneId,
} from '../../src/logic/logicNativeTreeCompat';
import {
	handleTreeKeyboardKey,
	isEditableKeyboardTarget,
	type TreeKeyboardCallbacks,
	type TreeKeyboardState,
} from '../../src/logic/logicTreeKeyboard';
import { TreeHeightIndex } from '../../src/logic/logicTreeHeightIndex';
import { buildVariableTreeWindow } from '../../src/utils/treeVirtualization';
import { stickyTreeRows } from '../../src/logic/logicTreeSticky';
import type { TreeNode } from '../../src/types/typeTree';

function keyEvent(key: string, init?: Partial<KeyboardEvent>): KeyboardEvent {
	return { key, shiftKey: false, ctrlKey: false, metaKey: false, altKey: false, ...init } as KeyboardEvent;
}

function callbacks(): TreeKeyboardCallbacks & {
	focused: string[];
	toggled: [string, boolean][];
	activated: [string, { shift: boolean }][];
	ranged: [string, string][];
	cleared: number;
	renamed: string[];
} {
	const calls = {
		focused: [] as string[],
		toggled: [] as [string, boolean][],
		activated: [] as [string, { shift: boolean }][],
		ranged: [] as [string, string][],
		cleared: 0,
		renamed: [] as string[],
	};
	return {
		focused: calls.focused,
		toggled: calls.toggled,
		activated: calls.activated,
		ranged: calls.ranged,
		get cleared() {
			return calls.cleared;
		},
		renamed: calls.renamed,
		onFocus: (id) => calls.focused.push(id),
		onToggleExpand: (id, expand) => calls.toggled.push([id, expand]),
		onActivate: (id, modifiers) => calls.activated.push([id, { shift: modifiers.shift }]),
		onRangeSelect: (a, b) => calls.ranged.push([a, b]),
		onClearSelection: () => {
			calls.cleared += 1;
		},
		onRename: (id) => calls.renamed.push(id),
		canRename: () => true,
	};
}

const rows = [
	{ id: 'a', depth: 0, hasChildren: true, isExpanded: true },
	{ id: 'b', depth: 1, hasChildren: false, isExpanded: false },
	{ id: 'c', depth: 1, hasChildren: true, isExpanded: false },
	{ id: 'd', depth: 0, hasChildren: false, isExpanded: false },
];

describe('U130 native polish: text-case projection', () => {
	it('provided preserves spelling; modes transform display only', () => {
		expect(applyTextCase('My Note', 'provided')).toBe('My Note');
		expect(applyTextCase('My Note', 'lowercase')).toBe('my note');
		expect(applyTextCase('My Note', 'uppercase')).toBe('MY NOTE');
		expect(applyTextCase('MY NOTE', 'titlecase')).toBe('My Note');
		expect(toTitleCase('hello WORLD foo')).toBe('Hello World Foo');
	});

	it('resolves scene over global over provided default', () => {
		expect(resolveTextCase('text')).toBe('provided');
		expect(resolveTextCase('text', { text: 'uppercase' })).toBe('uppercase');
		expect(
			resolveTextCase('text', { text: 'uppercase' }, { text: 'lowercase' }),
		).toBe('lowercase');
		expect(resolveTextCase('other', { text: 'uppercase' }, {})).toBe('provided');
	});

	it('normalizes sparse maps and compares order-independently', () => {
		expect(normalizeTextCaseMap({ text: 'uppercase', bad: 'nope', x: 1 })).toEqual({
			text: 'uppercase',
		});
		expect(sameTextCaseMap({ a: 'lowercase' }, { a: 'lowercase' })).toBe(true);
		expect(sameTextCaseMap({ a: 'lowercase' }, {})).toBe(false);
		expect(sameTextCaseMap(undefined, undefined)).toBe(true);
	});
});

describe('U130 native polish: native compat profiles', () => {
	it('includes the native Files leading virtual spacer in root sibling positions', () => {
		expect(Reflect.get(NATIVE_TREE_PROFILES.files, 'rootLeadingSlots')).toBe(1);
	});
	it('maps scenes to homologous profiles, never Files for all', () => {
		expect(toNativeSceneId('files')).toBe('files');
		expect(toNativeSceneId('content' as 'files')).toBe(null);
		// Plugins and snippets genuinely share the native Settings container.
		expect(NATIVE_TREE_PROFILES.tags.container).toBe('tag-container');
		expect(NATIVE_TREE_PROFILES.props.container).toBe('view-content');
		expect(NATIVE_TREE_PROFILES.plugins.container).toBe('vertical-tab-content');
		expect(NATIVE_TREE_PROFILES.snippets.container).toBe('vertical-tab-content');
		expect(NATIVE_TREE_PROFILES.files?.container).toBe('nav-files-container');
	});

	it('locked disables the bridge per boundary, default is compatible', () => {
		expect(resolveNativeCompatMode('tree')).toBe('compatible');
		expect(
			resolveNativeCompatMode('tree', { tree: 'locked' }, undefined),
		).toBe('locked');
		expect(
			resolveNativeCompatMode('menu', { tree: 'locked' }, { menu: 'locked' }),
		).toBe('locked');
		expect(normalizeNativeCompatPolicy({ tree: 'locked', isolated: 'x', bogus: 1 })).toEqual({
			tree: 'locked',
		});
		expect(sameNativeCompatPolicy({ tree: 'locked' }, { tree: 'locked' })).toBe(true);
		expect(sameNativeCompatPolicy({ tree: 'locked' }, {})).toBe(false);
	});

	it('bridges host-scoped selectors preserving the trailing structure', () => {
		const alias = bridgeAliasForSelector(
			'.workspace-leaf-content[data-type="file-explorer"] .tree-item-self.is-active::before',
			'files',
		);
		expect(alias?.aliasSelector).toContain('.tree-item-self.is-active');
		expect(alias?.aliasSelector).toContain('::before');
		expect(alias?.aliasSelector).toContain('[data-vaultman-native-type="file-explorer"]');
		expect(alias?.aliasSelector).toContain('.vaultman-native-tree-compat');
		expect(alias?.aliasSelector).not.toContain('[data-type="vaultman-frame"]');
		expect(bridgeAliasForSelector('.nav-file-title', 'files')).toBe(null);
		expect(
			bridgeAliasForSelector(
				'.workspace-leaf-content[data-type="search"] .x',
				'files',
			),
		).toBe(null);
	});
});

describe('U130 native polish: tree keyboard controller', () => {
	it('Up/Down move focus across the flattened model', () => {
		const cb = callbacks();
		const state: TreeKeyboardState = { rows, focusedId: 'b', anchorId: 'b' };
		const down = handleTreeKeyboardKey(keyEvent('ArrowDown'), state, cb);
		expect(down.handled).toBe(true);
		expect(down.next.focusedId).toBe('c');
		expect(cb.focused).toEqual(['c']);
		const up = handleTreeKeyboardKey(keyEvent('ArrowUp'), down.next, cb);
		expect(up.next.focusedId).toBe('b');
	});

	it('Shift+Down performs an additive range from the anchor', () => {
		const cb = callbacks();
		const state: TreeKeyboardState = { rows, focusedId: 'b', anchorId: 'b' };
		const out = handleTreeKeyboardKey(keyEvent('ArrowDown', { shiftKey: true }), state, cb);
		expect(out.handled).toBe(true);
		expect(cb.ranged).toEqual([['b', 'c']]);
		expect(out.next.anchorId).toBe('b');
	});

	it('Left collapses an expanded row, then moves to the parent', () => {
		const cb = callbacks();
		handleTreeKeyboardKey(
			keyEvent('ArrowLeft'),
			{ rows, focusedId: 'a', anchorId: 'a' },
			cb,
		);
		expect(cb.toggled).toEqual([['a', false]]);
		const moved = handleTreeKeyboardKey(
			keyEvent('ArrowLeft'),
			{ rows, focusedId: 'b', anchorId: 'b' },
			cb,
		);
		expect(moved.handled).toBe(true);
		expect(cb.focused).toEqual(['a']);
	});

	it('Right expands a collapsed row, then moves into its child', () => {
		const cb = callbacks();
		const toggled = handleTreeKeyboardKey(
			keyEvent('ArrowRight'),
			{ rows, focusedId: 'c', anchorId: 'c' },
			cb,
		);
		expect(toggled.handled).toBe(true);
		expect(cb.toggled).toEqual([['c', true]]);
		const expanded = {
			rows: rows.map((r) => (r.id === 'c' ? { ...r, isExpanded: true } : r)),
			focusedId: 'a',
			anchorId: 'a',
		};
		handleTreeKeyboardKey(keyEvent('ArrowRight'), expanded, cb);
		expect(cb.focused).toEqual(['b']);
	});

	it('Enter/Space activate with modifiers, Escape clears, F2 renames', () => {
		const cb = callbacks();
		const state: TreeKeyboardState = { rows, focusedId: 'd', anchorId: 'd' };
		handleTreeKeyboardKey(keyEvent('Enter', { ctrlKey: true }), state, cb);
		expect(cb.activated.length).toBe(1);
		handleTreeKeyboardKey(keyEvent(' '), state, cb);
		expect(cb.activated.length).toBe(2);
		handleTreeKeyboardKey(keyEvent('Escape'), state, cb);
		expect(cb.cleared).toBe(1);
		handleTreeKeyboardKey(keyEvent('F2'), state, cb);
		expect(cb.renamed).toEqual(['d']);
	});

	it('F2 without a rename seam stays unhandled; unknown keys pass through', () => {
		const cb = callbacks();
		const noRename: TreeKeyboardCallbacks = { ...cb, canRename: undefined };
		const state: TreeKeyboardState = { rows, focusedId: 'd', anchorId: 'd' };
		expect(handleTreeKeyboardKey(keyEvent('F2'), state, noRename).handled).toBe(false);
		expect(handleTreeKeyboardKey(keyEvent('Delete'), state, cb).handled).toBe(false);
		expect(handleTreeKeyboardKey(keyEvent('a', { ctrlKey: true }), state, cb).handled).toBe(false);
	});

	it('extension seam runs first and can consume keys owner-locally', () => {
		const cb = callbacks();
		const state: TreeKeyboardState = { rows, focusedId: 'b', anchorId: 'b' };
		const ext = vi.fn(() => true);
		const out = handleTreeKeyboardKey(keyEvent('m'), state, cb, { m: ext });
		expect(out.handled).toBe(true);
		expect(ext).toHaveBeenCalledOnce();
		expect(cb.focused).toEqual([]);
	});

	it('editable targets guard input controls but not the row itself', () => {
		const row = { tagName: 'DIV', closest: () => null };
		const input = { tagName: 'INPUT', closest: () => ({}) };
		expect(
			isEditableKeyboardTarget(
				input as unknown as EventTarget,
				row as unknown as HTMLElement,
			),
		).toBe(true);
		expect(
			isEditableKeyboardTarget(
				row as unknown as EventTarget,
				row as unknown as HTMLElement,
			),
		).toBe(false);
	});
});

describe('U130 native polish: variable height index', () => {
	it('prefix tops agree with total height and log offset lookup', () => {
		const index = new TreeHeightIndex(27);
		index.setRows(['a', 'b', 'c', 'd']);
		expect(index.totalHeight()).toBe(108);
		expect(index.topForIndex(2)).toBe(54);
		expect(index.topForIndex(4)).toBe(108);
		index.setMeasured('b', 40);
		expect(index.topForIndex(2)).toBe(67);
		expect(index.totalHeight()).toBe(121);
		expect(index.topForIndex(4)).toBe(121);
		expect(index.indexForOffset(0)).toBe(0);
		expect(index.indexForOffset(66)).toBe(1);
		expect(index.indexForOffset(67)).toBe(2);
	});

	it('updates measured rows without rebuilding unrelated prefix entries', () => {
		const index = new TreeHeightIndex(10);
		index.setRows(['a', 'b', 'c']);
		index.setMeasured('b', 20);
		index.setMeasured('c', 30);
		index.setRows(['c', 'a', 'b']);
		expect(index.heightForIndex(0)).toBe(30);
		expect(index.topForIndex(3)).toBe(60);
		expect(index.indexForOffset(59)).toBe(2);
	});

	it('measurements follow stable keys across a splice reorder', () => {
		const index = new TreeHeightIndex(27);
		index.setRows(['a', 'b', 'c']);
		index.setMeasured('c', 50);
		index.setRows(['c', 'a', 'b']);
		expect(index.heightForIndex(0)).toBe(50);
		expect(index.topForIndex(1)).toBe(50);
	});

	it('anchor survives invalidation at the same viewport position', () => {
		const index = new TreeHeightIndex(27);
		index.setRows(['a', 'b', 'c', 'd']);
		index.setMeasured('b', 40);
		const anchor = index.anchorForOffset(30);
		expect(anchor?.key).toBe('b');
		index.invalidateAll();
		const restored = anchor ? index.offsetForAnchor(anchor) : null;
		expect(restored).toBe(27 + anchor!.offsetWithin);
	});

	it('variable window and sticky agree on measured geometry', () => {
		const mkNode = (id: string, depth = 0): TreeNode => ({ id, label: id, depth, meta: {} });
		const tree: TreeNode[] = [mkNode('a'), mkNode('b'), mkNode('c'), mkNode('d')];
		const index = new TreeHeightIndex(27);
		index.setRows(tree.map((n) => n.id));
		index.setMeasured('a', 60);
		const window = buildVariableTreeWindow({
			rows: tree,
			geometry: index,
			scrollTop: 0,
			viewportHeight: 61,
			overscan: 0,
		});
		expect(window.visibleRows.map((r) => r.node.id)).toEqual(['a', 'b']);
		expect(window.visibleRows[1]?.top).toBe(60);
		const tight = buildVariableTreeWindow({
			rows: tree,
			geometry: index,
			scrollTop: 0,
			viewportHeight: 60,
			overscan: 0,
		});
		// A row starting exactly at the viewport bottom edge stays out,
		// matching the fixed window's ceil semantics.
		expect(tight.visibleRows.map((r) => r.node.id)).toEqual(['a']);
		const parents: TreeNode[] = [
			{ ...mkNode('p'), children: [mkNode('c1', 1)] },
			mkNode('c1', 1),
		];
		const pIndex = new TreeHeightIndex(27);
		pIndex.setRows(['p', 'c1']);
		const stickies = stickyTreeRows(parents, {
			rowHeight: 27,
			scrollTop: 10,
			viewportHeight: 400,
			variable: pIndex,
		});
		expect(stickies.length).toBeGreaterThan(0);
		expect(stickies[0]?.index).toBe(0);
	});

	it('bounds sticky coverage by measured stack height and seven rows', () => {
		const rows = Array.from({ length: 10 }, (_, index): TreeNode => ({
			id: `p-${index}`,
			label: `p-${index}`,
			depth: index,
			children: [{ id: `c-${index}`, label: `c-${index}`, depth: index + 1, meta: {} }],
			meta: {},
		}));
		const index = new TreeHeightIndex(20);
		index.setRows(rows.map((row) => row.id));
		for (const row of rows.slice(0, 7)) index.setMeasured(row.id, 40);
		const stickies = stickyTreeRows(rows, {
			rowHeight: 20,
			scrollTop: 1,
			viewportHeight: 200,
			maxRows: 20,
			variable: index,
		});
		expect(stickies).toHaveLength(2);
	});
});
