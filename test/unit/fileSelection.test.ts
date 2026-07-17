import { describe, expect, it } from 'vitest';

import {
	fileSelectionGesture,
	updateFileSelection,
} from '../../src/logic/logicFileSelection';

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

describe('updateFileSelection', () => {
	const orderedPaths = ['a.md', 'b.md', 'c.md', 'd.md'];

	it('toggles individual paths without losing prior selections', () => {
		const first = updateFileSelection(
			{ selectedPaths: new Set<string>(), anchorPath: null },
			orderedPaths,
			'b.md',
			'toggle',
		);
		const second = updateFileSelection(first, orderedPaths, 'd.md', 'toggle');

		expect(second.selectedPaths).toEqual(new Set(['b.md', 'd.md']));
		expect(second.anchorPath).toBe('d.md');
	});

	it('selects an inclusive visible range from the stable anchor', () => {
		const result = updateFileSelection(
			{ selectedPaths: new Set(['b.md']), anchorPath: 'b.md' },
			orderedPaths,
			'd.md',
			'range',
		);

		expect(result.selectedPaths).toEqual(new Set(['b.md', 'c.md', 'd.md']));
		expect(result.anchorPath).toBe('b.md');
	});

	it('falls back to the target when a stale range anchor is not visible', () => {
		const result = updateFileSelection(
			{ selectedPaths: new Set(['missing.md']), anchorPath: 'missing.md' },
			orderedPaths,
			'c.md',
			'range',
		);

		expect(result.selectedPaths).toEqual(new Set(['c.md']));
		expect(result.anchorPath).toBe('c.md');
	});

	it('clears stale selection when a regular file open begins', () => {
		const result = updateFileSelection(
			{ selectedPaths: new Set(['a.md', 'b.md']), anchorPath: 'a.md' },
			orderedPaths,
			'c.md',
			'open',
		);

		expect(result.selectedPaths.size).toBe(0);
		expect(result.anchorPath).toBeNull();
	});
});
