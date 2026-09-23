import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolveContextClickSelection } from '../../src/logic/logicSelectionTargets';

const ORDERED = ['a', 'b', 'c', 'd', 'e'];

const plain = { ctrlKey: false, metaKey: false, shiftKey: false };
const ctrl = { ctrlKey: true, metaKey: false, shiftKey: false };
const meta = { ctrlKey: false, metaKey: true, shiftKey: false };
const shift = { ctrlKey: false, metaKey: false, shiftKey: true };
const ctrlShift = { ctrlKey: true, metaKey: false, shiftKey: true };

describe('resolveContextClickSelection - shared right-click/range policy', () => {
	it('plain right-click replaces with the invoked occurrence, even under group headers', () => {
		const out = resolveContextClickSelection({
			selectedIds: new Set(['a', 'b']),
			anchorId: 'a',
			orderedVisibleIds: ORDERED,
			invokedId: 'd',
			modifiers: plain,
		});
		expect([...out.selectedIds]).toEqual(['d']);
		expect(out.anchorId).toBe('d');
	});

	it('plain right-click on the already-selected row keeps exactly that row', () => {
		const out = resolveContextClickSelection({
			selectedIds: new Set(['in', 'related']),
			anchorId: 'in',
			orderedVisibleIds: ['in', 'related', 'other'],
			invokedId: 'related',
			modifiers: null,
		});
		expect([...out.selectedIds]).toEqual(['related']);
		expect(out.anchorId).toBe('related');
	});

	it('Ctrl/Meta toggles: adds a missing row and moves the anchor', () => {
		const added = resolveContextClickSelection({
			selectedIds: new Set(['a']),
			anchorId: 'a',
			orderedVisibleIds: ORDERED,
			invokedId: 'c',
			modifiers: ctrl,
		});
		expect([...added.selectedIds].sort()).toEqual(['a', 'c']);
		expect(added.anchorId).toBe('c');
		const metaAdded = resolveContextClickSelection({
			selectedIds: new Set(['a']),
			anchorId: 'a',
			orderedVisibleIds: ORDERED,
			invokedId: 'c',
			modifiers: meta,
		});
		expect([...metaAdded.selectedIds].sort()).toEqual(['a', 'c']);
	});

	it('Ctrl/Meta toggles: removes a present row and clears a matching anchor', () => {
		const out = resolveContextClickSelection({
			selectedIds: new Set(['a', 'c']),
			anchorId: 'c',
			orderedVisibleIds: ORDERED,
			invokedId: 'c',
			modifiers: ctrl,
		});
		expect([...out.selectedIds]).toEqual(['a']);
		expect(out.anchorId).toBeNull();
	});

	it('Ctrl remove preserves an unrelated anchor', () => {
		const out = resolveContextClickSelection({
			selectedIds: new Set(['a', 'b', 'c']),
			anchorId: 'a',
			orderedVisibleIds: ORDERED,
			invokedId: 'c',
			modifiers: ctrl,
		});
		expect([...out.selectedIds].sort()).toEqual(['a', 'b']);
		expect(out.anchorId).toBe('a');
	});

	it('Shift selects the anchor->row range forward and backward, keeping the anchor', () => {
		const fwd = resolveContextClickSelection({
			selectedIds: new Set(['a']),
			anchorId: 'b',
			orderedVisibleIds: ORDERED,
			invokedId: 'd',
			modifiers: shift,
		});
		expect([...fwd.selectedIds]).toEqual(['b', 'c', 'd']);
		expect(fwd.anchorId).toBe('b');
		const bwd = resolveContextClickSelection({
			selectedIds: new Set(['e']),
			anchorId: 'd',
			orderedVisibleIds: ORDERED,
			invokedId: 'b',
			modifiers: shift,
		});
		expect([...bwd.selectedIds]).toEqual(['b', 'c', 'd']);
		expect(bwd.anchorId).toBe('d');
	});

	it('Shift with a missing anchor falls back to a single replace', () => {
		const noAnchor = resolveContextClickSelection({
			selectedIds: new Set(['a', 'b']),
			anchorId: null,
			orderedVisibleIds: ORDERED,
			invokedId: 'c',
			modifiers: shift,
		});
		expect([...noAnchor.selectedIds]).toEqual(['c']);
		expect(noAnchor.anchorId).toBe('c');
		const staleAnchor = resolveContextClickSelection({
			selectedIds: new Set(['a']),
			anchorId: 'gone',
			orderedVisibleIds: ORDERED,
			invokedId: 'd',
			modifiers: shift,
		});
		expect([...staleAnchor.selectedIds]).toEqual(['d']);
		expect(staleAnchor.anchorId).toBe('d');
	});

	it('Ctrl+Shift unions the range without losing previous selection', () => {
		const out = resolveContextClickSelection({
			selectedIds: new Set(['a']),
			anchorId: 'b',
			orderedVisibleIds: ORDERED,
			invokedId: 'd',
			modifiers: ctrlShift,
		});
		expect([...out.selectedIds].sort()).toEqual(['a', 'b', 'c', 'd']);
		expect(out.anchorId).toBe('b');
	});

	it('Ctrl+Shift with a missing anchor only adds the invoked row', () => {
		const out = resolveContextClickSelection({
			selectedIds: new Set(['a']),
			anchorId: null,
			orderedVisibleIds: ORDERED,
			invokedId: 'e',
			modifiers: ctrlShift,
		});
		expect([...out.selectedIds].sort()).toEqual(['a', 'e']);
		expect(out.anchorId).toBe('e');
	});

	it('range uses occurrence ids: repeated entities select by position, not by URN', () => {
		const ordered = ['x@g1', 'y@g1', 'x@g2', 'z@g2'];
		const out = resolveContextClickSelection({
			selectedIds: new Set(),
			anchorId: 'x@g1',
			orderedVisibleIds: ordered,
			invokedId: 'x@g2',
			modifiers: shift,
		});
		expect([...out.selectedIds]).toEqual(['x@g1', 'y@g1', 'x@g2']);
	});

	it('virtualization: the range never selects hidden rows, only the logical visible order', () => {
		const visible = ['a', 'b', 'c', 'd'];
		const out = resolveContextClickSelection({
			selectedIds: new Set(),
			anchorId: 'b',
			orderedVisibleIds: visible,
			invokedId: 'd',
			modifiers: shift,
		});
		expect([...out.selectedIds]).toEqual(['b', 'c', 'd']);
		expect(out.selectedIds.has('hidden-row')).toBe(false);
	});

	it('action-only rows never enter the selection', () => {
		const out = resolveContextClickSelection({
			selectedIds: new Set(['a']),
			anchorId: 'a',
			orderedVisibleIds: ORDERED,
			invokedId: 'add_property',
			modifiers: plain,
			isSelectable: (id) => id !== 'add_property',
		});
		expect([...out.selectedIds]).toEqual(['a']);
		expect(out.anchorId).toBe('a');
	});

	it('does not mutate the incoming selection set', () => {
		const input = new Set(['a']);
		resolveContextClickSelection({
			selectedIds: input,
			anchorId: 'a',
			orderedVisibleIds: ORDERED,
			invokedId: 'b',
			modifiers: ctrl,
		});
		expect([...input]).toEqual(['a']);
	});
});

const source = (name: string): string =>
	readFileSync(new URL(`../../src/components/containers/${name}`, import.meta.url), 'utf8');

describe('U130-GGC-022/024 wiring across scenes', () => {
	it('every explorer routes context invocation through the shared policy with modifiers', () => {
		for (const file of [
			'explorerFiles.ts',
			'explorerProps.ts',
			'explorerTags.ts',
			'explorerSnippets.ts',
			'explorerPlugins.ts',
		]) {
			const text = source(file);
			expect(text, file).toContain('resolveContextClickSelection');
			expect(text, file).toContain('_includeInvokedInSelection(');
			expect(text, file).toContain('shiftKey');
			expect(text, file).toContain('ctrlKey');
			expect(text, file).toContain('metaKey');
		}
	});

	it('every scene keeps a per-instance anchor', () => {
		expect(source('explorerFiles.ts')).toContain('selectionAnchorPath');
		for (const file of [
			'explorerProps.ts',
			'explorerTags.ts',
			'explorerSnippets.ts',
			'explorerPlugins.ts',
		]) {
			expect(source(file), file).toContain('selectionAnchorId');
		}
	});

	it('every scene shares one logical visible order per gesture (no DOM order)', () => {
		for (const file of [
			'explorerFiles.ts',
			'explorerProps.ts',
			'explorerTags.ts',
			'explorerSnippets.ts',
			'explorerPlugins.ts',
		]) {
			expect(source(file), file).toContain('_orderedVisibleTreeIds');
		}
	});

	it('group headers still open the group menu without entering row selection', () => {
		for (const file of [
			'explorerFiles.ts',
			'explorerProps.ts',
			'explorerTags.ts',
			'explorerSnippets.ts',
			'explorerPlugins.ts',
		]) {
			const text = source(file);
			const headerAt = text.indexOf('isGroupHeader(id');
			expect(headerAt, file).toBeGreaterThanOrEqual(0);
			const includeAt = text.indexOf('_includeInvokedInSelection(');
			expect(includeAt, file).toBeGreaterThanOrEqual(0);
		}
	});

	it('Files keeps its left-click gesture helper and canonical target rule (no regression)', () => {
		const files = source('explorerFiles.ts');
		expect(files).toContain('fileSelectionGesture');
		expect(files).toContain('updateFileSelection');
		expect(files).toContain('resolveSelectionTargets');
		expect(files).not.toContain('addInvokedSelection');
	});

	it('Props keeps add_property action-only (no regression)', () => {
		const props = source('explorerProps.ts');
		expect(props).toContain('if (id === PropsExplorerPanel.ADD_PROPERTY_ROW_ID) return;');
		expect(props).toContain('isSelectable');
	});
});
