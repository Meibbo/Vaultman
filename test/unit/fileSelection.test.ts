import { describe, expect, it } from 'vitest';

import {
	fileSelectionGesture,
	NodeSelectionAxon,
} from '../../src/logic/logicNodeSelection';

describe('fileSelectionGesture', () => {
	it('reserves Alt/Option for core-style individual selection', () => {
		expect(
			fileSelectionGesture(
				{ altKey: true, shiftKey: false, ctrlKey: false, metaKey: false },
				false,
			),
		).toBe('toggle');
	});

	it('keeps Ctrl/Cmd click available for opening a new tab outside add mode', () => {
		expect(
			fileSelectionGesture(
				{ altKey: false, shiftKey: false, ctrlKey: true, metaKey: false },
				false,
			),
		).toBe('open');
		expect(
			fileSelectionGesture(
				{ altKey: false, shiftKey: false, ctrlKey: false, metaKey: true },
				false,
			),
		).toBe('open');
	});

	it('preserves the existing add-mode Ctrl/Cmd multi-selection gesture', () => {
		expect(
			fileSelectionGesture(
				{ altKey: false, shiftKey: false, ctrlKey: true, metaKey: false },
				true,
			),
		).toBe('toggle');
	});
});

describe('NodeSelectionAxon path selection', () => {
	const orderedPaths = ['a.md', 'b.md', 'c.md', 'd.md'];

	it('toggles individual paths without losing prior selections', () => {
		const axon = new NodeSelectionAxon<string>();
		axon.apply({ kind: 'toggle', id: 'b.md' }, orderedPaths);
		axon.apply({ kind: 'toggle', id: 'd.md' }, orderedPaths);

		const snap = axon.snapshot();
		expect(snap.selected).toEqual(new Set(['b.md', 'd.md']));
		expect(snap.anchor).toBe('d.md');
	});

	it('selects an inclusive visible range from the stable anchor', () => {
		const axon = new NodeSelectionAxon<string>();
		axon.apply({ kind: 'replace', id: 'b.md' }, orderedPaths);
		axon.apply({ kind: 'range', id: 'd.md' }, orderedPaths);

		const snap = axon.snapshot();
		expect(snap.selected).toEqual(new Set(['b.md', 'c.md', 'd.md']));
		expect(snap.anchor).toBe('b.md');
	});

	it('falls back to target when anchor is not in ordered paths', () => {
		const axon = new NodeSelectionAxon<string>();
		axon.apply({ kind: 'range', id: 'c.md' }, orderedPaths);

		const snap = axon.snapshot();
		expect(snap.selected).toEqual(new Set(['a.md', 'b.md', 'c.md']));
	});

	it('clears selection on clear intent', () => {
		const axon = new NodeSelectionAxon<string>();
		axon.apply({ kind: 'replace', id: 'a.md' }, orderedPaths);
		axon.apply({ kind: 'clear' }, orderedPaths);

		const snap = axon.snapshot();
		expect(snap.selected.size).toBe(0);
		expect(snap.anchor).toBeNull();
	});
});
