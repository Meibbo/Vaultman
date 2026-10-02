import { describe, expect, it } from 'vitest';
import { resolveCheckboxSelection } from '../../src/logic/logicSelectionTargets';

describe('checkbox selection uses the shared anchor policy', () => {
	const state = {
		selectedIds: new Set(['a', 'b']),
		anchorId: 'a',
		orderedVisibleIds: ['a', 'b', 'c', 'd'],
		invokedId: 'c',
		selected: true,
	};
	it('replaces the old selection when checking a new anchor', () => {
		const result = resolveCheckboxSelection(state);
		expect([...result.selectedIds]).toEqual(['c']);
		expect(result.anchorId).toBe('c');
		expect([...state.selectedIds]).toEqual(['a', 'b']);
	});
	it('retains explicit additive selection with Ctrl', () => {
		const result = resolveCheckboxSelection({ ...state, modifiers: { ctrlKey: true } });
		expect([...result.selectedIds]).toEqual(['a', 'b', 'c']);
	});
	it('selects the logical range with Shift', () => {
		const result = resolveCheckboxSelection({ ...state, modifiers: { shiftKey: true } });
		expect([...result.selectedIds]).toEqual(['a', 'b', 'c']);
		expect(result.anchorId).toBe('a');
	});
	it('unchecks only the requested row without inventing another anchor', () => {
		const result = resolveCheckboxSelection({ ...state, invokedId: 'a', selected: false });
		expect([...result.selectedIds]).toEqual(['b']);
		expect(result.anchorId).toBeNull();
	});
});
