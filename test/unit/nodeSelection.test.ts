import { describe, expect, it, vi } from 'vitest';
import { NodeSelectionAxon } from '../../src/logic/logicNodeSelection';

describe('NodeSelectionAxon generic selection logic', () => {
	const visibleIds = ['node-1', 'node-2', 'node-3', 'node-4', 'node-5'];

	it('handles single select (replace) and sets anchor', () => {
		const axon = new NodeSelectionAxon<string>();
		axon.apply({ kind: 'replace', id: 'node-2' }, visibleIds);

		const snap = axon.snapshot();
		expect(Array.from(snap.selected)).toEqual(['node-2']);
		expect(snap.anchor).toBe('node-2');
	});

	it('handles Ctrl/Cmd toggle selection', () => {
		const axon = new NodeSelectionAxon<string>();
		axon.apply({ kind: 'replace', id: 'node-1' }, visibleIds);
		axon.apply({ kind: 'toggle', id: 'node-3' }, visibleIds);

		let snap = axon.snapshot();
		expect(Array.from(snap.selected)).toEqual(['node-1', 'node-3']);
		expect(snap.anchor).toBe('node-3');

		axon.apply({ kind: 'toggle', id: 'node-1' }, visibleIds);
		snap = axon.snapshot();
		expect(Array.from(snap.selected)).toEqual(['node-3']);
	});

	it('handles Shift range selection over orderedVisibleIds', () => {
		const axon = new NodeSelectionAxon<string>();
		axon.apply({ kind: 'replace', id: 'node-2' }, visibleIds);
		axon.apply({ kind: 'range', id: 'node-4' }, visibleIds);

		const snap = axon.snapshot();
		expect(Array.from(snap.selected)).toEqual(['node-2', 'node-3', 'node-4']);
		expect(snap.anchor).toBe('node-2'); // Anchor stays at origin of range
	});

	it('reconciles state when items are filtered or hidden', () => {
		const axon = new NodeSelectionAxon<string>();
		axon.apply({ kind: 'replace', id: 'node-2' }, visibleIds);
		axon.apply({ kind: 'toggle', id: 'node-4' }, visibleIds);

		// node-4 is now hidden
		const filteredVisible = ['node-1', 'node-2', 'node-3'];
		axon.reconcile(filteredVisible);

		const snap = axon.snapshot();
		expect(Array.from(snap.selected)).toEqual(['node-2']);
	});

	it('notifies subscribers synchronously only when snapshot changes', () => {
		const axon = new NodeSelectionAxon<string>();
		const listener = vi.fn();
		axon.subscribe(listener);

		axon.apply({ kind: 'replace', id: 'node-1' }, visibleIds);
		expect(listener).toHaveBeenCalledTimes(1);

		// Equal intent should not notify
		axon.apply({ kind: 'replace', id: 'node-1' }, visibleIds);
		expect(listener).toHaveBeenCalledTimes(1);
	});

	it('clones exposed snapshot so external mutation cannot leak into internal state', () => {
		const axon = new NodeSelectionAxon<string>();
		axon.apply({ kind: 'replace', id: 'node-1' }, visibleIds);

		const snap = axon.snapshot();
		// Attempting to mutate snapshot set should fail or not mutate internal state
		expect(snap.selected.has('node-1')).toBe(true);

		const snap2 = axon.snapshot();
		expect(snap2.selected).not.toBe(snap.selected); // Should return distinct clone/read-only snapshot
	});
});
