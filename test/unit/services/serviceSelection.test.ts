import { afterEach, describe, expect, it } from 'vitest';
import { PerfMeter, type OpsLogRecord } from '../../../src/services/perfMeter';
import { NodeSelectionService } from '../../../src/services/serviceSelection.svelte';
import type { NodeSelectionSnapshot } from '../../../src/types/typeSelection';

const EXPLORER_ID = 'props';
const ORDERED_IDS = ['a', 'b', 'c', 'd', 'e'];

function selectedIds(snapshot: NodeSelectionSnapshot): string[] {
	return [...snapshot.ids];
}

describe('NodeSelectionService', () => {
	afterEach(() => {
		PerfMeter.__resetForTests();
	});

	it('replaces selection on plain pointer select and sets anchor, focus, and active node', () => {
		const service = new NodeSelectionService();

		service.selectPointer(EXPLORER_ID, ORDERED_IDS, 'a');
		const snapshot = service.selectPointer(EXPLORER_ID, ORDERED_IDS, 'b');

		expect(selectedIds(snapshot)).toEqual(['b']);
		expect(snapshot.anchorId).toBe('b');
		expect(snapshot.focusedId).toBe('b');
		expect(snapshot.activeId).toBe('b');
	});

	it('toggles pointer target with ctrl or meta semantics while preserving other selected ids', () => {
		const service = new NodeSelectionService();

		service.selectPointer(EXPLORER_ID, ORDERED_IDS, 'a');
		service.selectPointer(EXPLORER_ID, ORDERED_IDS, 'b', { additive: true });
		const snapshot = service.selectPointer(EXPLORER_ID, ORDERED_IDS, 'b', {
			additive: true,
		});

		expect(selectedIds(snapshot)).toEqual(['a']);
		expect(snapshot.anchorId).toBe('b');
		expect(snapshot.focusedId).toBe('b');
		expect(snapshot.activeId).toBe('b');
	});

	it('selects a shift pointer range from anchor to target', () => {
		const service = new NodeSelectionService();

		service.selectPointer(EXPLORER_ID, ORDERED_IDS, 'b');
		const snapshot = service.selectPointer(EXPLORER_ID, ORDERED_IDS, 'd', { range: true });

		expect(selectedIds(snapshot)).toEqual(['b', 'c', 'd']);
		expect(snapshot.anchorId).toBe('b');
		expect(snapshot.focusedId).toBe('d');
		expect(snapshot.activeId).toBe('d');
	});

	it('adds a ctrl/meta shift pointer range from the focused id without dropping existing ids', () => {
		const service = new NodeSelectionService();

		service.selectPointer(EXPLORER_ID, ORDERED_IDS, 'a');
		service.selectPointer(EXPLORER_ID, ORDERED_IDS, 'b', { additive: true });
		const snapshot = service.selectPointer(EXPLORER_ID, ORDERED_IDS, 'e', {
			additive: true,
			range: true,
		});

		expect(selectedIds(snapshot)).toEqual(['a', 'b', 'c', 'd', 'e']);
		expect(snapshot.anchorId).toBe('b');
		expect(snapshot.focusedId).toBe('e');
		expect(snapshot.activeId).toBe('e');
	});

	it('replaces selection from box targets in visible order rather than hit-test order', () => {
		const service = new NodeSelectionService();

		service.selectPointer(EXPLORER_ID, ORDERED_IDS, 'a');
		const snapshot = service.selectBox(EXPLORER_ID, ORDERED_IDS, ['d', 'b']);

		expect(selectedIds(snapshot)).toEqual(['b', 'd']);
		expect(snapshot.anchorId).toBe('d');
		expect(snapshot.focusedId).toBe('d');
		expect(snapshot.activeId).toBe('d');
	});

	it('adds box targets to the current selection with ctrl or meta semantics', () => {
		const service = new NodeSelectionService();

		service.selectPointer(EXPLORER_ID, ORDERED_IDS, 'a');
		const snapshot = service.selectBox(EXPLORER_ID, ORDERED_IDS, ['d', 'b'], {
			additive: true,
		});

		expect(selectedIds(snapshot)).toEqual(['a', 'b', 'd']);
		expect(snapshot.anchorId).toBe('d');
		expect(snapshot.focusedId).toBe('d');
		expect(snapshot.activeId).toBe('d');
	});

	it('moves focus and active node with arrows without changing selected ids by default', () => {
		const service = new NodeSelectionService();

		service.selectPointer(EXPLORER_ID, ORDERED_IDS, 'b');
		const snapshot = service.moveFocus(EXPLORER_ID, ORDERED_IDS, 1);

		expect(selectedIds(snapshot)).toEqual(['b']);
		expect(snapshot.anchorId).toBe('b');
		expect(snapshot.focusedId).toBe('c');
		expect(snapshot.activeId).toBe('c');
	});

	it('extends selection from anchor with shift arrow movement', () => {
		const service = new NodeSelectionService();

		service.selectPointer(EXPLORER_ID, ORDERED_IDS, 'b');
		const first = service.moveFocus(EXPLORER_ID, ORDERED_IDS, 1, { range: true });
		const second = service.moveFocus(EXPLORER_ID, ORDERED_IDS, 1, { range: true });

		expect(selectedIds(first)).toEqual(['b', 'c']);
		expect(first.anchorId).toBe('b');
		expect(first.focusedId).toBe('c');
		expect(selectedIds(second)).toEqual(['b', 'c', 'd']);
		expect(second.anchorId).toBe('b');
		expect(second.focusedId).toBe('d');
	});

	it('toggles the focused node with Space without replacing the rest of the selection', () => {
		const service = new NodeSelectionService();

		service.selectPointer(EXPLORER_ID, ORDERED_IDS, 'b');
		service.moveFocus(EXPLORER_ID, ORDERED_IDS, 1);
		const added = service.toggleFocused(EXPLORER_ID, ORDERED_IDS);
		const removed = service.toggleFocused(EXPLORER_ID, ORDERED_IDS);

		expect(selectedIds(added)).toEqual(['b', 'c']);
		expect(added.anchorId).toBe('c');
		expect(added.focusedId).toBe('c');
		expect(selectedIds(removed)).toEqual(['b']);
		expect(removed.anchorId).toBe('c');
		expect(removed.focusedId).toBe('c');
	});

	it('selects the anchor-to-focus range with Shift+Space', () => {
		const service = new NodeSelectionService();

		service.selectPointer(EXPLORER_ID, ORDERED_IDS, 'b');
		service.setFocused(EXPLORER_ID, 'd');
		const snapshot = service.toggleFocused(EXPLORER_ID, ORDERED_IDS, { range: true });

		expect(selectedIds(snapshot)).toEqual(['b', 'c', 'd']);
		expect(snapshot.anchorId).toBe('b');
		expect(snapshot.focusedId).toBe('d');
		expect(snapshot.activeId).toBe('d');
	});

	it('adds the anchor-to-focus range with Ctrl/Meta+Shift+Space', () => {
		const service = new NodeSelectionService();

		service.selectPointer(EXPLORER_ID, ORDERED_IDS, 'a');
		service.selectPointer(EXPLORER_ID, ORDERED_IDS, 'b', { additive: true });
		service.setFocused(EXPLORER_ID, 'e');
		const snapshot = service.toggleFocused(EXPLORER_ID, ORDERED_IDS, {
			additive: true,
			range: true,
		});

		expect(selectedIds(snapshot)).toEqual(['a', 'b', 'c', 'd', 'e']);
		expect(snapshot.anchorId).toBe('b');
		expect(snapshot.focusedId).toBe('e');
	});

	it('derives active id from focused id first and hovered id second, then clear resets state', () => {
		const service = new NodeSelectionService();

		let snapshot = service.setHovered(EXPLORER_ID, 'hovered');
		expect(snapshot.hoveredId).toBe('hovered');
		expect(snapshot.activeId).toBe('hovered');

		snapshot = service.setFocused(EXPLORER_ID, 'focused');
		expect(snapshot.focusedId).toBe('focused');
		expect(snapshot.activeId).toBe('focused');

		snapshot = service.setFocused(EXPLORER_ID, null);
		expect(snapshot.focusedId).toBeNull();
		expect(snapshot.activeId).toBe('hovered');

		service.selectPointer(EXPLORER_ID, ORDERED_IDS, 'b');
		snapshot = service.clear(EXPLORER_ID);
		expect(selectedIds(snapshot)).toEqual([]);
		expect(snapshot.anchorId).toBeNull();
		expect(snapshot.focusedId).toBeNull();
		expect(snapshot.hoveredId).toBeNull();
		expect(snapshot.activeId).toBeNull();
	});

	it('prunes selected, anchor, focus, and hover ids that are no longer visible', () => {
		const service = new NodeSelectionService();

		service.selectPointer(EXPLORER_ID, ORDERED_IDS, 'a');
		service.selectPointer(EXPLORER_ID, ORDERED_IDS, 'b', { additive: true });
		service.selectPointer(EXPLORER_ID, ORDERED_IDS, 'c', { additive: true });
		service.setHovered(EXPLORER_ID, 'e');
		const snapshot = service.prune(EXPLORER_ID, ['b', 'd']);

		expect(selectedIds(snapshot)).toEqual(['b']);
		expect(snapshot.anchorId).toBeNull();
		expect(snapshot.focusedId).toBeNull();
		expect(snapshot.hoveredId).toBeNull();
		expect(snapshot.activeId).toBeNull();
	});

	it('returns snapshots whose selected id set cannot mutate internal service state', () => {
		const service = new NodeSelectionService();

		const snapshot = service.selectPointer(EXPLORER_ID, ORDERED_IDS, 'b');
		(snapshot.ids as Set<string>).add('external');

		expect(selectedIds(service.snapshot(EXPLORER_ID))).toEqual(['b']);
	});

	it('exposes a live selected map and times single-id pointer selection', () => {
		const service = new NodeSelectionService();
		const records: OpsLogRecord[] = [];
		PerfMeter.subscribe((record) => records.push(record));
		const orderedIds = Array.from({ length: 10_000 }, (_, index) => `node-${index}`);

		const snapshot = service.selectPointer(EXPLORER_ID, orderedIds, 'node-9999');

		expect(snapshot.selected.get('node-9999')).toBe(true);
		expect(snapshot.selected.get('node-1')).toBeUndefined();
		const record = records.find((entry) => entry.label === 'explorer.selection.selectPointer');
		expect(record?.durationMs).toBeLessThan(2);

		const cleared = service.clear(EXPLORER_ID);
		expect(cleared.selected.get('node-9999')).toBeUndefined();
	});
});
