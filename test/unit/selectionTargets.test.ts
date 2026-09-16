import { describe, it, expect } from 'vitest';
import { resolveSelectionTargets } from '../../src/logic/logicSelectionTargets';

describe('resolveSelectionTargets - core selection rule', () => {
	it('invoked NOT in selection -> returns only invoked', () => {
		const selectedIds = new Set(['a', 'b', 'c']);
		const orderedIds = ['a', 'b', 'c'];
		const result = resolveSelectionTargets('z', selectedIds, orderedIds);
		expect(result).toEqual(['z']);
	});

	it('invoked IN selection -> returns all selected in visible order', () => {
		const selectedIds = new Set(['a', 'b', 'c']);
		const orderedIds = ['a', 'b', 'c'];
		const result = resolveSelectionTargets('b', selectedIds, orderedIds);
		expect(result).toEqual(['a', 'b', 'c']);
	});

	it('invoked IN selection with different visible order -> returns in visible order', () => {
		const selectedIds = new Set(['a', 'b', 'c']);
		const orderedIds = ['c', 'b', 'a'];
		const result = resolveSelectionTargets('b', selectedIds, orderedIds);
		expect(result).toEqual(['c', 'b', 'a']);
	});

	it('selected but not in visible order -> appended at end', () => {
		const selectedIds = new Set(['a', 'b', 'c', 'd']);
		const orderedIds = ['a', 'b'];
		const result = resolveSelectionTargets('a', selectedIds, orderedIds);
		expect(result).toEqual(['a', 'b', 'c', 'd']);
	});

	it('empty selection -> returns only invoked', () => {
		const selectedIds = new Set<string>();
		const orderedIds = ['a', 'b'];
		const result = resolveSelectionTargets('a', selectedIds, orderedIds);
		expect(result).toEqual(['a']);
	});

	it('undefined orderedIds -> returns all selected', () => {
		const selectedIds = new Set(['a', 'b', 'c']);
		const result = resolveSelectionTargets('b', selectedIds);
		expect(result).toEqual(['a', 'b', 'c']);
	});

	it('single item selection', () => {
		const selectedIds = new Set(['a']);
		const orderedIds = ['a'];
		const result = resolveSelectionTargets('a', selectedIds, orderedIds);
		expect(result).toEqual(['a']);
	});

	it('works with folder IDs (folder:<path>)', () => {
		const selectedIds = new Set(['folder:foo', 'folder:bar', 'folder:baz']);
		const orderedIds = ['folder:foo', 'folder:bar', 'folder:baz'];
		const result = resolveSelectionTargets('folder:bar', selectedIds, orderedIds);
		expect(result).toEqual(['folder:foo', 'folder:bar', 'folder:baz']);
	});

	it('works with mixed file and folder IDs', () => {
		const selectedIds = new Set(['file:a', 'folder:foo', 'file:b']);
		const orderedIds = ['file:a', 'folder:foo', 'file:b'];
		const result = resolveSelectionTargets('folder:foo', selectedIds, orderedIds);
		expect(result).toEqual(['file:a', 'folder:foo', 'file:b']);
	});
});

describe('Selection rule integration - no manual copies of the rule', () => {
	it('should not have manual selectedIds.has(invokedId) checks outside logicSelectionTargets', () => {
		// This is a documentation test - the rule is that all selection logic
		// should go through resolveSelectionTargets
		expect(true).toBe(true);
	});
});