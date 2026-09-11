import { describe, expect, it } from 'vitest';

import {
	fileSelectionGesture,
	updateFileSelection,
} from '../../src/logic/logicNodeSelection';
import treeSource from '../../src/components/layout/viewTree.ts?raw';
import explorerFilesSource from '../../src/components/containers/explorerFiles.ts?raw';

// U130-p2: el checkbox es un control de seleccion con semantica de
// modificadores. El modo aditivo (`addMode = true`) hace que Ctrl/Meta
// conmuten en vez de abrir en pestana nueva; el click plano cae al gesto
// `open`, que en updateFileSelection es seleccion unica (no abre nada: el
// callback del checkbox nunca abre).
const IDS = ['a.md', 'b.md', 'folder:c', 'd.md'];

describe('U130-p2 checkbox selection gestures', () => {
	it('plain click maps to single selection (open gesture selects, never opens)', () => {
		expect(fileSelectionGesture(null, true)).toBe('open');
		const selection = updateFileSelection(
			{ selectedPaths: new Set(['a.md']), anchorPath: 'a.md' },
			IDS,
			'd.md',
			fileSelectionGesture(null, true),
		);
		expect([...selection.selectedPaths]).toEqual(['d.md']);
		expect(selection.anchorPath).toBe('d.md');
	});

	it('Shift extends the visible range, folders included', () => {
		const anchor = updateFileSelection(
			{ selectedPaths: new Set(), anchorPath: null },
			IDS,
			'b.md',
			'open',
		);
		const range = updateFileSelection(
			{ selectedPaths: anchor.selectedPaths, anchorPath: anchor.anchorPath },
			IDS,
			'd.md',
			fileSelectionGesture(
				{ altKey: false, shiftKey: true, ctrlKey: false, metaKey: false },
				true,
			),
		);
		expect([...range.selectedPaths].sort()).toEqual([
			'b.md',
			'd.md',
			'folder:c',
		]);
		expect(range.anchorPath).toBe('b.md');
	});

	it('Ctrl/Meta/Alt toggle additively instead of replacing', () => {
		for (const modifiers of [
			{ altKey: false, shiftKey: false, ctrlKey: true, metaKey: false },
			{ altKey: false, shiftKey: false, ctrlKey: false, metaKey: true },
			{ altKey: true, shiftKey: false, ctrlKey: false, metaKey: false },
		]) {
			expect(fileSelectionGesture(modifiers, true)).toBe('toggle');
		}
		const toggled = updateFileSelection(
			{ selectedPaths: new Set(['a.md']), anchorPath: 'a.md' },
			IDS,
			'd.md',
			'toggle',
		);
		expect([...toggled.selectedPaths].sort()).toEqual(['a.md', 'd.md']);
	});
});

describe('U130-p2 checkbox wiring source contracts', () => {
	it('viewTree applies selection once per click, carrying the native event', () => {
		expect(treeSource).toContain(
			'opts.onSelectionToggle?.(node.id, checkbox.checked, event)',
		);
		// El change que sigue a cada click fisico se consume: sin esta guarda
		// cada click aplicaria dos veces.
		expect(treeSource).toContain('selectionAppliedByClick');
		// La guarda de pulsacion larga recursiva sigue intacta.
		expect(treeSource).toContain(
			'this._recursiveSelectGesture.isActivationSuppressed()',
		);
		expect(treeSource).toContain('onRecursiveSelect');
	});

	it('explorerFiles shows the checkbox in open mode, hiding only filter/add', () => {
		expect(explorerFilesSource).toContain(
			"if (this.interactionMode === 'filter' || this.interactionMode === 'add')",
		);
		expect(explorerFilesSource).not.toContain(
			"if (this.interactionMode !== 'select') return 'hidden'",
		);
		expect(explorerFilesSource).toContain("visibleCells.has('checkbox')");
	});

	it('explorerFiles routes checkbox clicks through the shared gesture model', () => {
		expect(explorerFilesSource).toContain(
			'const gesture = fileSelectionGesture(event ?? null, true);',
		);
		expect(explorerFilesSource).toContain('_orderedVisibleTreeIds()');
	});
});
