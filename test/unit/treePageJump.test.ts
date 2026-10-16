// U130 tree Navco: PageUp/PageDown viewport paging over the flattened
// visible model. PageDown focuses the last VISIBLE row (advancing one frame
// when already there); PageUp mirrors to the first VISIBLE row. Shares the
// Navco seam with Home/End, letter-jump and the TAREA 7 prefix jump: rendered
// order, no re-sort, no selection mutation.
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import type { TreeKeyboardRow } from '../../src/logic/logicTreeKeyboard';
import {
	isTreePageChord,
	resolveFrameEdgeTarget,
	resolveTreePageTarget,
} from '../../src/logic/logicTreePageJump';
import { getTreePageScopeChords } from '../../src/logic/logicTreeKeyboardAllowlist';

function row(id: string): TreeKeyboardRow {
	return { id, depth: 0, hasChildren: false, isExpanded: false };
}

/** 20 flat rows: r00..r19. */
const ROWS: readonly TreeKeyboardRow[] = Array.from(
	{ length: 20 },
	(_, i) => row(`r${String(i).padStart(2, '0')}`),
);

function pageEvent(key: string, init?: KeyboardEventInit): KeyboardEvent {
	return new KeyboardEvent('keydown', { key, ...init });
}

describe('page chord validator (isTreePageChord)', () => {
	it('accepts plain PageUp and PageDown', () => {
		expect(isTreePageChord(pageEvent('PageUp'))).toEqual({ isPage: true, key: 'PageUp' });
		expect(isTreePageChord(pageEvent('PageDown'))).toEqual({ isPage: true, key: 'PageDown' });
	});

	it('rejects other keys', () => {
		expect(isTreePageChord(pageEvent('Home'))).toBeNull();
		expect(isTreePageChord(pageEvent('End'))).toBeNull();
		expect(isTreePageChord(pageEvent('ArrowDown'))).toBeNull();
		expect(isTreePageChord(pageEvent(' '))).toBeNull();
	});

	it('bubbles non-shift modified chords and IME composition', () => {
		expect(isTreePageChord(pageEvent('PageDown', { ctrlKey: true }))).toBeNull();
		expect(isTreePageChord(pageEvent('PageDown', { altKey: true }))).toBeNull();
		expect(isTreePageChord(pageEvent('PageUp', { metaKey: true }))).toBeNull();
		expect(isTreePageChord(pageEvent('PageUp', { isComposing: true }))).toBeNull();
	});

	it('accepts Shift modifier for range selection', () => {
		expect(isTreePageChord(pageEvent('PageUp', { shiftKey: true }))).toEqual({
			isPage: true,
			shiftKey: true,
			key: 'PageUp',
		});
		expect(isTreePageChord(pageEvent('PageDown', { shiftKey: true }))).toEqual({
			isPage: true,
			shiftKey: true,
			key: 'PageDown',
		});
		expect(isTreePageChord(pageEvent('PageDown', { shiftKey: true, ctrlKey: true }), false)).toEqual({
			isPage: true,
			shiftKey: true,
			isMod: true,
			key: 'PageDown',
		});
		expect(isTreePageChord(pageEvent('PageUp', { shiftKey: true, metaKey: true }), true)).toEqual({
			isPage: true,
			shiftKey: true,
			isMod: true,
			key: 'PageUp',
		});
	});
});

describe('page scope chords (getTreePageScopeChords)', () => {
	it('routes plain PageUp/PageDown, Shift, and Mod+Shift variants, separate from the frozen native allowlist', () => {
		expect(getTreePageScopeChords()).toEqual([
			{ modifiers: [], key: 'PageUp' },
			{ modifiers: ['Shift'], key: 'PageUp' },
			{ modifiers: ['Shift', 'Mod'], key: 'PageUp' },
			{ modifiers: [], key: 'PageDown' },
			{ modifiers: ['Shift'], key: 'PageDown' },
			{ modifiers: ['Shift', 'Mod'], key: 'PageDown' },
		]);
	});
});

describe('PageDown within one frame', () => {
	it('focuses the last visible row from the middle of the frame', () => {
		expect(
			resolveTreePageTarget({
				key: 'PageDown',
				rows: ROWS,
				focusedId: 'r02',
				firstVisibleIndex: 0,
				visibleCount: 7,
			}),
		).toBe('r06');
	});

	it('advances one full frame when already on the last visible row', () => {
		expect(
			resolveTreePageTarget({
				key: 'PageDown',
				rows: ROWS,
				focusedId: 'r06',
				firstVisibleIndex: 0,
				visibleCount: 7,
			}),
		).toBe('r13');
	});

	it('clamps at the last row of the whole list on a partial final frame', () => {
		expect(
			resolveTreePageTarget({
				key: 'PageDown',
				rows: ROWS,
				focusedId: 'r13',
				firstVisibleIndex: 7,
				visibleCount: 7,
			}),
		).toBe('r19');
	});

	it('stays on the last row when already at the end of the list', () => {
		expect(
			resolveTreePageTarget({
				key: 'PageDown',
				rows: ROWS,
				focusedId: 'r19',
				firstVisibleIndex: 13,
				visibleCount: 7,
			}),
		).toBe('r19');
	});
});

describe('PageUp within one frame', () => {
	it('focuses the first visible row from the middle of the frame', () => {
		expect(
			resolveTreePageTarget({
				key: 'PageUp',
				rows: ROWS,
				focusedId: 'r10',
				firstVisibleIndex: 7,
				visibleCount: 7,
			}),
		).toBe('r07');
	});

	it('goes back one full frame when already on the first visible row', () => {
		// Frame shows r07..r13, focus on r07 -> new frame r00..r06, focus r00.
		// The old first (r07) sits exactly +1 past the new last (r06).
		expect(
			resolveTreePageTarget({
				key: 'PageUp',
				rows: ROWS,
				focusedId: 'r07',
				firstVisibleIndex: 7,
				visibleCount: 7,
			}),
		).toBe('r00');
	});

	it('stays on the first row when already at the top of the list', () => {
		expect(
			resolveTreePageTarget({
				key: 'PageUp',
				rows: ROWS,
				focusedId: 'r00',
				firstVisibleIndex: 0,
				visibleCount: 7,
			}),
		).toBe('r00');
	});

	it('clamps a partial back-step at the first row', () => {
		expect(
			resolveTreePageTarget({
				key: 'PageUp',
				rows: ROWS,
				focusedId: 'r03',
				firstVisibleIndex: 3,
				visibleCount: 7,
			}),
		).toBe('r00');
	});
});

describe('focus-free frame edge fallback (resolveFrameEdgeTarget)', () => {
	it('returns the first visible row for Home/PageUp', () => {
		expect(
			resolveFrameEdgeTarget({ rows: ROWS, firstVisibleIndex: 7, visibleCount: 7, key: 'Home' }),
		).toBe('r07');
		expect(
			resolveFrameEdgeTarget({ rows: ROWS, firstVisibleIndex: 7, visibleCount: 7, key: 'PageUp' }),
		).toBe('r07');
	});

	it('returns the last visible row for End/PageDown', () => {
		expect(
			resolveFrameEdgeTarget({ rows: ROWS, firstVisibleIndex: 7, visibleCount: 7, key: 'End' }),
		).toBe('r13');
		expect(
			resolveFrameEdgeTarget({ rows: ROWS, firstVisibleIndex: 7, visibleCount: 7, key: 'PageDown' }),
		).toBe('r13');
	});

	it('clamps a partial final frame at the last row', () => {
		expect(
			resolveFrameEdgeTarget({ rows: ROWS, firstVisibleIndex: 17, visibleCount: 7, key: 'End' }),
		).toBe('r19');
	});

	it('returns null for empty rows and degenerate frames', () => {
		expect(
			resolveFrameEdgeTarget({ rows: [], firstVisibleIndex: 0, visibleCount: 7, key: 'Home' }),
		).toBeNull();
		expect(
			resolveFrameEdgeTarget({ rows: ROWS, firstVisibleIndex: 0, visibleCount: 0, key: 'Home' }),
		).toBeNull();
	});
});
describe('degenerate inputs (Home/End contract parity)', () => {
	it('returns null for empty rows, bad frames and unresolvable focus', () => {
		const base = {
			key: 'PageDown' as const,
			rows: ROWS,
			focusedId: 'r02',
			firstVisibleIndex: 0,
			visibleCount: 7,
		};
		expect(resolveTreePageTarget({ ...base, rows: [] })).toBeNull();
		expect(resolveTreePageTarget({ ...base, visibleCount: 0 })).toBeNull();
		expect(resolveTreePageTarget({ ...base, focusedId: null })).toBeNull();
		expect(resolveTreePageTarget({ ...base, focusedId: 'missing' })).toBeNull();
	});

	it('handles frames larger than the whole list', () => {
		expect(
			resolveTreePageTarget({
				key: 'PageDown',
				rows: ROWS.slice(0, 3),
				focusedId: 'r00',
				firstVisibleIndex: 0,
				visibleCount: 7,
			}),
		).toBe('r02');
		expect(
			resolveTreePageTarget({
				key: 'PageUp',
				rows: ROWS.slice(0, 3),
				focusedId: 'r02',
				firstVisibleIndex: 0,
				visibleCount: 7,
			}),
		).toBe('r00');
	});
});
