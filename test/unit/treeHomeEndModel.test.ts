import { describe, expect, it } from 'vitest';
import type { TreeKeyboardRow } from '../../src/logic/logicTreeKeyboard';
import { resolveTreeHomeEndTarget } from '../../src/logic/logicTreeHomeEnd';

const SAMPLE_ROWS: readonly TreeKeyboardRow[] = [
	{ id: 'root-folder-1', depth: 0, hasChildren: true, isExpanded: true },
	{ id: 'root-folder-1/child-a.md', depth: 1, hasChildren: false, isExpanded: false },
	{ id: 'root-folder-1/child-b.md', depth: 1, hasChildren: false, isExpanded: false },
	{ id: 'root-folder-1/child-c.md', depth: 1, hasChildren: false, isExpanded: false },
	{ id: 'root-folder-2', depth: 0, hasChildren: true, isExpanded: false },
	{ id: 'root-file.md', depth: 0, hasChildren: false, isExpanded: false },
];

describe('Pure Tree Home/End target resolver (resolveTreeHomeEndTarget)', () => {
	describe('Root level navigation', () => {
		it('navigates to first and last root siblings from a root node', () => {
			expect(
				resolveTreeHomeEndTarget({
					key: 'Home',
					isWholeExplorer: false,
					rows: SAMPLE_ROWS,
					focusedId: 'root-folder-2',
				}),
			).toBe('root-folder-1');

			expect(
				resolveTreeHomeEndTarget({
					key: 'End',
					isWholeExplorer: false,
					rows: SAMPLE_ROWS,
					focusedId: 'root-folder-2',
				}),
			).toBe('root-file.md');
		});
	});

	describe('Nested level navigation', () => {
		it('navigates to first and last sibling at the focused nested level', () => {
			expect(
				resolveTreeHomeEndTarget({
					key: 'Home',
					isWholeExplorer: false,
					rows: SAMPLE_ROWS,
					focusedId: 'root-folder-1/child-b.md',
				}),
			).toBe('root-folder-1/child-a.md');

			expect(
				resolveTreeHomeEndTarget({
					key: 'End',
					isWholeExplorer: false,
					rows: SAMPLE_ROWS,
					focusedId: 'root-folder-1/child-b.md',
				}),
			).toBe('root-folder-1/child-c.md');
		});

		it('confines sibling resolution strictly within the parent boundary across multiple folders', () => {
			const hierarchicalRows: readonly TreeKeyboardRow[] = [
				{ id: 'f1', depth: 0, hasChildren: true, isExpanded: true },
				{ id: 'f1/sub1', depth: 1, hasChildren: true, isExpanded: true },
				{ id: 'f1/sub1/d1', depth: 2, hasChildren: false, isExpanded: false },
				{ id: 'f1/sub1/d2', depth: 2, hasChildren: false, isExpanded: false },
				{ id: 'f1/sub2', depth: 1, hasChildren: true, isExpanded: true },
				{ id: 'f1/sub2/d3', depth: 2, hasChildren: false, isExpanded: false },
				{ id: 'f2', depth: 0, hasChildren: false, isExpanded: false },
			];

			// Level 1 siblings under f1
			expect(
				resolveTreeHomeEndTarget({
					key: 'Home',
					isWholeExplorer: false,
					rows: hierarchicalRows,
					focusedId: 'f1/sub2',
				}),
			).toBe('f1/sub1');
			expect(
				resolveTreeHomeEndTarget({
					key: 'End',
					isWholeExplorer: false,
					rows: hierarchicalRows,
					focusedId: 'f1/sub1',
				}),
			).toBe('f1/sub2');

			// Level 2 siblings under f1/sub1
			expect(
				resolveTreeHomeEndTarget({
					key: 'Home',
					isWholeExplorer: false,
					rows: hierarchicalRows,
					focusedId: 'f1/sub1/d2',
				}),
			).toBe('f1/sub1/d1');
			expect(
				resolveTreeHomeEndTarget({
					key: 'End',
					isWholeExplorer: false,
					rows: hierarchicalRows,
					focusedId: 'f1/sub1/d1',
				}),
			).toBe('f1/sub1/d2');
		});
	});

	describe('Single item at level', () => {
		it('returns the same single item for both Home and End', () => {
			const singleChildRows: readonly TreeKeyboardRow[] = [
				{ id: 'f1', depth: 0, hasChildren: true, isExpanded: true },
				{ id: 'f1/only-child.md', depth: 1, hasChildren: false, isExpanded: false },
				{ id: 'f2', depth: 0, hasChildren: false, isExpanded: false },
			];

			expect(
				resolveTreeHomeEndTarget({
					key: 'Home',
					isWholeExplorer: false,
					rows: singleChildRows,
					focusedId: 'f1/only-child.md',
				}),
			).toBe('f1/only-child.md');
			expect(
				resolveTreeHomeEndTarget({
					key: 'End',
					isWholeExplorer: false,
					rows: singleChildRows,
					focusedId: 'f1/only-child.md',
				}),
			).toBe('f1/only-child.md');
		});
	});

	describe('Empty tree and missing focus', () => {
		it('returns null for empty rows', () => {
			expect(resolveTreeHomeEndTarget({ key: 'Home', isWholeExplorer: false, rows: [], focusedId: null })).toBeNull();
			expect(resolveTreeHomeEndTarget({ key: 'End', isWholeExplorer: false, rows: [], focusedId: null })).toBeNull();
			expect(resolveTreeHomeEndTarget({ key: 'Home', isWholeExplorer: true, rows: [], focusedId: null })).toBeNull();
			expect(resolveTreeHomeEndTarget({ key: 'End', isWholeExplorer: true, rows: [], focusedId: null })).toBeNull();
		});

		it('returns null for sibling Home/End when focusedId is null or not found in rows', () => {
			expect(resolveTreeHomeEndTarget({ key: 'Home', isWholeExplorer: false, rows: SAMPLE_ROWS, focusedId: null })).toBeNull();
			expect(resolveTreeHomeEndTarget({ key: 'End', isWholeExplorer: false, rows: SAMPLE_ROWS, focusedId: 'unknown-id' })).toBeNull();
		});

		it('successfully resolves whole-explorer Ctrl+Home/End even when focusedId is null', () => {
			expect(resolveTreeHomeEndTarget({ key: 'Home', isWholeExplorer: true, rows: SAMPLE_ROWS, focusedId: null })).toBe('root-folder-1');
			expect(resolveTreeHomeEndTarget({ key: 'End', isWholeExplorer: true, rows: SAMPLE_ROWS, focusedId: null })).toBe('root-file.md');
		});
	});

	describe('Descending order projection and collapsed rows', () => {
		it('preserves rendered order on descending projections (name-sort independent)', () => {
			const descRows: readonly TreeKeyboardRow[] = [
				{ id: 'f1', depth: 0, hasChildren: true, isExpanded: true },
				{ id: 'f1/zebra.md', depth: 1, hasChildren: false, isExpanded: false },
				{ id: 'f1/monkey.md', depth: 1, hasChildren: false, isExpanded: false },
				{ id: 'f1/aardvark.md', depth: 1, hasChildren: false, isExpanded: false },
				{ id: 'f0', depth: 0, hasChildren: false, isExpanded: false },
			];

			expect(
				resolveTreeHomeEndTarget({ key: 'Home', isWholeExplorer: false, rows: descRows, focusedId: 'f1/monkey.md' }),
			).toBe('f1/zebra.md');
			expect(
				resolveTreeHomeEndTarget({ key: 'End', isWholeExplorer: false, rows: descRows, focusedId: 'f1/monkey.md' }),
			).toBe('f1/aardvark.md');
		});

		it('ignores collapsed descendants that are absent from visible model rows', () => {
			const collapsedRows: readonly TreeKeyboardRow[] = [
				{ id: 'f1', depth: 0, hasChildren: true, isExpanded: false },
				{ id: 'f2', depth: 0, hasChildren: true, isExpanded: true },
				{ id: 'f2/c1.md', depth: 1, hasChildren: false, isExpanded: false },
			];

			expect(resolveTreeHomeEndTarget({ key: 'Home', isWholeExplorer: false, rows: collapsedRows, focusedId: 'f1' })).toBe('f1');
			expect(resolveTreeHomeEndTarget({ key: 'End', isWholeExplorer: false, rows: collapsedRows, focusedId: 'f1' })).toBe('f2');
			expect(resolveTreeHomeEndTarget({ key: 'End', isWholeExplorer: true, rows: collapsedRows, focusedId: 'f1' })).toBe('f2/c1.md');
		});
	});

	describe('Whole explorer navigation', () => {
		it('moves to the first and last row of the entire visible explorer model', () => {
			expect(
				resolveTreeHomeEndTarget({ key: 'Home', isWholeExplorer: true, rows: SAMPLE_ROWS, focusedId: 'root-folder-1/child-b.md' }),
			).toBe('root-folder-1');
			expect(
				resolveTreeHomeEndTarget({ key: 'End', isWholeExplorer: true, rows: SAMPLE_ROWS, focusedId: 'root-folder-1/child-b.md' }),
			).toBe('root-file.md');
		});
	});
});
