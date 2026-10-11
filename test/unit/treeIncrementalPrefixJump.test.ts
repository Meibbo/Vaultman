// U130 TAREA 7: incremental prefix jump (Windows Explorer style) over the
// focused row's visible siblings. Fast alphanumeric keys accumulate into a
// case-insensitive prefix inside a 500ms window; a repeated single letter
// cycles its matches instead of growing the buffer; timeout expiry or any
// non-alphanumeric key resets the buffer.
import { describe, expect, it } from 'vitest';
import type { TreeKeyboardRow } from '../../src/logic/logicTreeKeyboard';
import {
	PREFIX_JUMP_WINDOW_MS,
	createIncrementalPrefixJumpStore,
	isPrefixJumpChar,
	matchPrefixTarget,
	nextPrefixTarget,
	nextSiblingPrefixTarget,
	type TreePrefixMember,
} from '../../src/logic/logicTreePrefixJump';

const MEMBERS: readonly TreePrefixMember[] = [
	{ id: 'recibo.md', label: 'recibo' },
	{ id: 'receta.md', label: 'receta' },
	{ id: 'refresco.md', label: 'refresco' },
	{ id: 'nota.md', label: 'nota' },
];

const A_MEMBERS: readonly TreePrefixMember[] = [
	{ id: 'apple.md', label: 'apple' },
	{ id: 'apricot.md', label: 'apricot' },
	{ id: 'avocado.md', label: 'avocado' },
	{ id: 'banana.md', label: 'banana' },
];

/** Deterministic clock: the store never depends on real timers. */
function clock(start = 1_000): { now: () => number; advance: (ms: number) => number } {
	let at = start;
	return {
		now: (): number => at,
		advance: (ms: number): number => {
			at += ms;
			return at;
		},
	};
}

describe('prefix jump char gate', () => {
	it('accepts single alphanumeric glyphs (letters and digits)', () => {
		expect(isPrefixJumpChar('r')).toBe(true);
		expect(isPrefixJumpChar('R')).toBe(true);
		expect(isPrefixJumpChar('5')).toBe(true);
	});

	it('rejects space, multi-char keys and symbols', () => {
		expect(isPrefixJumpChar(' ')).toBe(false);
		expect(isPrefixJumpChar('Enter')).toBe(false);
		expect(isPrefixJumpChar('ArrowLeft')).toBe(false);
		expect(isPrefixJumpChar('')).toBe(false);
		expect(isPrefixJumpChar('-')).toBe(false);
	});
});

describe('multi-character prefix accumulation', () => {
	it('narrows r -> e -> c -> i down to the single "reci" match', () => {
		const time = clock();
		const store = createIncrementalPrefixJumpStore({ now: time.now });
		expect(store.type('r', MEMBERS)?.targetId).toBe('recibo.md');
		time.advance(120);
		expect(store.type('e', MEMBERS)?.targetId).toBe('recibo.md');
		time.advance(120);
		expect(store.type('c', MEMBERS)?.targetId).toBe('recibo.md');
		time.advance(120);
		const hit = store.type('i', MEMBERS);
		expect(hit?.targetId).toBe('recibo.md');
		expect(hit?.prefix).toBe('reci');
		expect(hit?.cycled).toBe(false);
		expect(store.buffer).toBe('reci');
	});

	it('matches deterministically in rendered order (first hit wins)', () => {
		const hit = matchPrefixTarget(MEMBERS, 're');
		expect(hit?.id).toBe('recibo.md');
	});

	it('returns null without growing confusion when nothing matches', () => {
		const time = clock();
		const store = createIncrementalPrefixJumpStore({ now: time.now });
		expect(store.type('z', MEMBERS)).toBeNull();
		expect(store.buffer).toBe('z');
	});
});

describe('single-letter repeat cycling', () => {
	it('preserves first -> next -> wrap cycling on repeated "a"', () => {
		const time = clock();
		const store = createIncrementalPrefixJumpStore({ now: time.now });
		const first = store.type('a', A_MEMBERS);
		expect(first?.targetId).toBe('apple.md');
		expect(first?.cycled).toBe(false);
		time.advance(100);
		const second = store.type('a', A_MEMBERS);
		expect(second?.targetId).toBe('apricot.md');
		expect(second?.cycled).toBe(true);
		time.advance(100);
		expect(store.type('a', A_MEMBERS)?.targetId).toBe('avocado.md');
		time.advance(100);
		const wrapped = store.type('a', A_MEMBERS);
		expect(wrapped?.targetId).toBe('apple.md');
		expect(wrapped?.cycled).toBe(true);
		expect(store.buffer).toBe('a');
	});

	it('cycles case-insensitively ("A" continues an "a" run)', () => {
		const time = clock();
		const store = createIncrementalPrefixJumpStore({ now: time.now });
		expect(store.type('a', A_MEMBERS)?.targetId).toBe('apple.md');
		time.advance(100);
		const hit = store.type('A', A_MEMBERS);
		expect(hit?.targetId).toBe('apricot.md');
		expect(hit?.cycled).toBe(true);
	});
});

describe('timeout reset (500ms window)', () => {
	it('restarts the buffer when the gap exceeds the window', () => {
		expect(PREFIX_JUMP_WINDOW_MS).toBe(500);
		const time = clock();
		const store = createIncrementalPrefixJumpStore({ now: time.now });
		expect(store.type('r', MEMBERS)?.targetId).toBe('recibo.md');
		time.advance(120);
		expect(store.type('e', MEMBERS)?.targetId).toBe('recibo.md');
		expect(store.buffer).toBe('re');
		time.advance(600);
		const hit = store.type('n', MEMBERS);
		expect(hit?.targetId).toBe('nota.md');
		expect(hit?.prefix).toBe('n');
		expect(store.buffer).toBe('n');
	});

	it('keeps accumulating inside the window boundary', () => {
		const time = clock();
		const store = createIncrementalPrefixJumpStore({ windowMs: 500, now: time.now });
		store.type('r', MEMBERS);
		time.advance(499);
		expect(store.type('e', MEMBERS)?.prefix).toBe('re');
	});
});

describe('non-alphanumeric reset', () => {
	it('resets the buffer on symbols and multi-char keys', () => {
		const time = clock();
		const store = createIncrementalPrefixJumpStore({ now: time.now });
		store.type('r', MEMBERS);
		time.advance(50);
		expect(store.type(' ', MEMBERS)).toBeNull();
		expect(store.buffer).toBe('');
		store.type('r', MEMBERS);
		time.advance(50);
		expect(store.type('Enter', MEMBERS)).toBeNull();
		expect(store.buffer).toBe('');
		const fresh = store.type('n', MEMBERS);
		expect(fresh?.targetId).toBe('nota.md');
	});

	it('exposes manual reset for owner moves', () => {
		const store = createIncrementalPrefixJumpStore({ now: () => 0 });
		store.type('r', MEMBERS);
		store.reset();
		expect(store.buffer).toBe('');
		expect(store.type('n', MEMBERS)?.targetId).toBe('nota.md');
	});
});

describe('case-insensitivity', () => {
	it('matches uppercase prefixes against lowercase labels', () => {
		expect(matchPrefixTarget(MEMBERS, 'RECI')?.id).toBe('recibo.md');
		const time = clock();
		const store = createIncrementalPrefixJumpStore({ now: time.now });
		expect(store.type('R', MEMBERS)?.targetId).toBe('recibo.md');
		time.advance(80);
		expect(store.type('E', MEMBERS)?.targetId).toBe('recibo.md');
	});
});

describe('visible-sibling seam (collectSiblingMembers)', () => {
	const ROWS: readonly TreeKeyboardRow[] = [
		{ id: 'folder-1', depth: 0, hasChildren: true, isExpanded: true },
		{ id: 'folder-1/recibo.md', depth: 1, hasChildren: false, isExpanded: false },
		{ id: 'folder-1/receta.md', depth: 1, hasChildren: false, isExpanded: false },
		{ id: 'folder-1/nota.md', depth: 1, hasChildren: false, isExpanded: false },
	];
	const LABELS = new Map([
		['folder-1/recibo.md', 'recibo'],
		['folder-1/receta.md', 'receta'],
		['folder-1/nota.md', 'nota'],
	]);

	it('finds the "reci" sibling from the focused row without re-sorting', () => {
		const hit = nextSiblingPrefixTarget({
			rows: ROWS,
			focusedIndex: 2,
			labelOf: (id) => LABELS.get(id) ?? null,
			prefix: 'reci',
		});
		expect(hit?.id).toBe('folder-1/recibo.md');
	});

	it('returns null when no visible sibling matches the prefix', () => {
		const hit = nextSiblingPrefixTarget({
			rows: ROWS,
			focusedIndex: 1,
			labelOf: (id) => LABELS.get(id) ?? null,
			prefix: 'zzz',
		});
		expect(hit).toBeNull();
	});
});

describe('pure nextPrefixTarget step', () => {
	it('cycles from an explicit cursor without store state', () => {
		expect(nextPrefixTarget(A_MEMBERS, 'a', null)?.id).toBe('apple.md');
		expect(nextPrefixTarget(A_MEMBERS, 'a', 'apple.md')?.id).toBe('apricot.md');
		expect(nextPrefixTarget(A_MEMBERS, 'zzz', null)).toBeNull();
	});
});
