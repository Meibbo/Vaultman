import { describe, expect, it } from 'vitest';

import {
	NodeSelectionAxon,
	updateFileSelection,
} from '../../src/logic/logicNodeSelection';

const PATHS = ['a.md', 'b.md', 'c.md', 'd.md', 'e.md'];

function openOn(path: string) {
	return updateFileSelection(
		{ selectedPaths: new Set(), anchorPath: null },
		PATHS,
		path,
		'open',
	);
}

describe('U121-056 shift range selection', () => {
	it('fija el ancla con un clic normal (open)', () => {
		const selection = openOn('c.md');
		expect(selection.anchorPath).toBe('c.md');
		expect([...selection.selectedPaths]).toEqual(['c.md']);
	});

	it('shift+clic posterior selecciona el rango hacia delante', () => {
		const anchor = openOn('b.md');
		const range = updateFileSelection(
			{ selectedPaths: anchor.selectedPaths, anchorPath: anchor.anchorPath },
			PATHS,
			'd.md',
			'range',
		);
		expect(range.anchorPath).toBe('b.md');
		expect([...range.selectedPaths].sort()).toEqual(['b.md', 'c.md', 'd.md']);
	});

	it('shift+clic posterior selecciona el rango hacia atras', () => {
		const anchor = openOn('d.md');
		const range = updateFileSelection(
			{ selectedPaths: anchor.selectedPaths, anchorPath: anchor.anchorPath },
			PATHS,
			'b.md',
			'range',
		);
		expect(range.anchorPath).toBe('d.md');
		expect([...range.selectedPaths].sort()).toEqual(['b.md', 'c.md', 'd.md']);
	});

	it('range sin ancla previo fija el ancla en el target', () => {
		const range = updateFileSelection(
			{ selectedPaths: new Set(), anchorPath: null },
			PATHS,
			'c.md',
			'range',
		);
		expect(range.anchorPath).toBe('c.md');
		expect([...range.selectedPaths]).toEqual(['c.md']);
	});

	it('NodeSelectionAxon: replace fija ancla y range extiende el rango', () => {
		const axon = new NodeSelectionAxon<string>();
		axon.apply({ kind: 'replace', id: 'b.md' }, PATHS);
		axon.apply({ kind: 'range', id: 'd.md' }, PATHS);
		const snap = axon.snapshot();
		expect(snap.anchor).toBe('b.md');
		expect([...snap.selected].sort()).toEqual(['b.md', 'c.md', 'd.md']);
	});

	it('E1/E2: range shrink drops far end when shifting back towards anchor', () => {
		const initial = updateFileSelection(
			{ selectedPaths: new Set(['a.md']), anchorPath: 'a.md' },
			PATHS,
			'd.md',
			'range',
		);
		expect([...initial.selectedPaths].sort()).toEqual(['a.md', 'b.md', 'c.md', 'd.md']);
		expect(initial.anchorPath).toBe('a.md');

		// When shift-clicking 'b.md', range shrinks to {a.md, b.md}, dropping 'c.md' and 'd.md'
		const shrunk = updateFileSelection(
			{ selectedPaths: initial.selectedPaths, anchorPath: initial.anchorPath },
			PATHS,
			'b.md',
			'range',
		);
		expect([...shrunk.selectedPaths].sort()).toEqual(['a.md', 'b.md']);
		expect(shrunk.anchorPath).toBe('a.md');
	});
});
