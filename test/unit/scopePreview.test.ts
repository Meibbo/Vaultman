import { describe, expect, it } from 'vitest';
import {
	scopePreviewGeometry,
	type ScopePreviewRow,
} from '../../src/logic/logicScopePreview';
import viewTreeSource from '../../src/components/layout/viewTree.ts?raw';

const rows: ScopePreviewRow[] = [
	{ id: 'parent', depth: 1, hasCaret: true },
	{ id: 'child-a', depth: 2, hasCaret: false },
	{ id: 'child-b', depth: 2, hasCaret: false },
	{ id: 'other', depth: 1, hasCaret: true },
	{ id: 'other-child', depth: 2, hasCaret: false },
	{ id: 'leaf', depth: 1, hasCaret: false },
];

describe('scope preview geometry', () => {
	it('mounts the sticky preview before the virtual spacer', () => {
		const ensureStart = viewTreeSource.indexOf('private _ensureScopePreviewElement');
		const ensureEnd = viewTreeSource.indexOf('private _clearScopePreview', ensureStart);
		const ensureSource = viewTreeSource.slice(ensureStart, ensureEnd);
		expect(ensureSource).toContain('this.containerEl.prepend(overlay)');
		expect(ensureSource).not.toContain('appendChild(overlay)');
	});

	it('covers a parent subtree and resolves a leaf to its immediate parent', () => {
		const input = {
			rows,
			parentIndex: [-1, 0, 0, -1, 3, -1],
			subtreeEnd: [3, 2, 3, 5, 5, 6],
			mode: 'parent' as const,
			rowHeight: 20,
			scrollTop: 0,
			viewportHeight: 100,
			contentWidth: 300,
			rowInset: 4,
			rowPaddingStart: 24,
			indentUnit: 16,
			indentEnabled: true,
		};
		expect(scopePreviewGeometry({ ...input, hoveredIndex: 0 }).targetIndices).toEqual([0, 1, 2]);
		expect(scopePreviewGeometry({ ...input, hoveredIndex: 2 }).targetIndices).toEqual([0, 1, 2]);
		expect(scopePreviewGeometry({ ...input, hoveredIndex: 4 }).targetIndices).toEqual([3, 4]);
		expect(scopePreviewGeometry({ ...input, hoveredIndex: 5 }).targetIndices).toEqual([]);
	});

	it('accepts a semantic flat parent without a rendered caret', () => {
		const result = scopePreviewGeometry({
			rows: [{ id: 'folder', depth: 0, hasCaret: false, isParent: true }],
			parentIndex: [-1],
			subtreeEnd: [1],
			hoveredIndex: 0,
			mode: 'parent',
			rowHeight: 20,
			scrollTop: 0,
			viewportHeight: 20,
			contentWidth: 200,
			rowInset: 4,
			rowPaddingStart: 24,
			indentUnit: 16,
			indentEnabled: false,
		});
		expect(result.targetIndices).toEqual([0]);
	});

	it('selects every row at the hovered level regardless of kind', () => {
		const result = scopePreviewGeometry({
			rows,
			parentIndex: [-1, 0, 0, -1, 3, -1],
			subtreeEnd: [3, 2, 3, 5, 5, 6],
			hoveredIndex: 1,
			mode: 'level',
			rowHeight: 20,
			scrollTop: 0,
			viewportHeight: 100,
			contentWidth: 300,
			rowInset: 4,
			rowPaddingStart: 24,
			indentUnit: 16,
			indentEnabled: true,
		});
		expect(result.targetIndices).toEqual([1, 2, 4]);
	});

	it('clips virtual rows without closing the outline at viewport edges', () => {
		const result = scopePreviewGeometry({
			rows,
			parentIndex: [-1, 0, 0, -1, 3, -1],
			subtreeEnd: [3, 2, 3, 5, 5, 6],
			hoveredIndex: 0,
			mode: 'parent',
			rowHeight: 20,
			scrollTop: 20,
			viewportHeight: 40,
			contentWidth: 300,
			rowInset: 4,
			rowPaddingStart: 24,
			indentUnit: 16,
			indentEnabled: true,
		});
		expect(result.segments.map(({ index }) => index)).toEqual([1, 2]);
		expect(result.segments[0]?.openTop).toBe(true);
		// The target ends exactly at the viewport edge, so only the clipped top
		// remains open; a finite subtree must not imply hidden rows below it.
		expect(result.segments[1]?.openBottom).toBe(false);
	});

	it('uses zero depth indent for leaves when indent is disabled', () => {
		const result = scopePreviewGeometry({
			rows: [{ id: 'leaf', depth: 4, hasCaret: false }],
			parentIndex: [-1],
			subtreeEnd: [1],
			hoveredIndex: 0,
			mode: 'level',
			rowHeight: 20,
			scrollTop: 0,
			viewportHeight: 20,
			contentWidth: 200,
			rowInset: 4,
			rowPaddingStart: 24,
			indentUnit: 16,
			indentEnabled: false,
		});
		expect(result.segments[0]?.left).toBe(28);
	});
});
