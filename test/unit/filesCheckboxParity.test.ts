// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveFilesCheckboxSelection } from '../../src/logic/logicSelectionTargets';
import { installObsidianDomPolyfill } from '../helpers/dom-obsidian-polyfill';
import type { TreeNode } from '../../src/types/typeTree';
import explorerFilesSource from '../../src/components/containers/explorerFiles.ts?raw';

describe('E1/E2 checkbox selection parity', () => {
	beforeEach(() => {
		installObsidianDomPolyfill();
		vi.stubGlobal('activeDocument', document);
		vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
			cb(0);
			return 1;
		});
		vi.stubGlobal('cancelAnimationFrame', () => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
		document.body.replaceChildren();
	});

	const ids = ['occurrence:a:1', 'b', 'occurrence:a:2', 'c'];
	const apply = (
		selectedIds: ReadonlySet<string>,
		anchorId: string | null,
		invokedId: string,
		selected: boolean,
		modifiers?: {
			shiftKey?: boolean;
			ctrlKey?: boolean;
			metaKey?: boolean;
			altKey?: boolean;
		},
		orderedVisibleIds: readonly string[] = ids,
		isSelectable: (id: string) => boolean = (id) =>
			orderedVisibleIds.includes(id),
	) =>
		resolveFilesCheckboxSelection({
			selectedIds,
			anchorId,
			orderedVisibleIds,
			invokedId,
			selected,
			modifiers,
			isSelectable,
		});

	it('Files production callback uses this tested grammar over selectable row ids', () => {
		const callback = explorerFilesSource.match(
			/onSelectionToggle:\s*\([\s\S]*?cellRenderOrder:/,
		)?.[0];
		expect(callback).toContain('resolveFilesCheckboxSelection({');
		expect(callback).toContain('this._orderedSelectableIds()');
		expect(callback).toContain('selected,');
	});

	it('checking a plain row adds it and makes it the anchor', () => {
		const next = apply(new Set(['a']), 'a', 'c', true);
		expect(next.selectedIds).toEqual(new Set(['a', 'c']));
		expect(next.anchorId).toBe('c');
	});

	it('unchecking removes only the target and preserves an unrelated anchor', () => {
		const next = apply(new Set(['a', 'b', 'c']), 'a', 'b', false);
		expect(next.selectedIds).toEqual(new Set(['a', 'c']));
		expect(next.anchorId).toBe('a');
	});

	it('plain Shift range replaces its previous slice and can shrink', () => {
		const extended = apply(new Set(['a']), 'a', 'c', true, { shiftKey: true }, [
			'a',
			'b',
			'c',
			'd',
		]);
		expect(extended.selectedIds).toEqual(new Set(['a', 'b', 'c']));
		expect(extended.anchorId).toBe('a');
		const shrunk = apply(
			extended.selectedIds,
			extended.anchorId,
			'b',
			true,
			{ shiftKey: true },
			['a', 'b', 'c', 'd'],
		);
		expect(shrunk.selectedIds).toEqual(new Set(['a', 'b']));
		expect(shrunk.anchorId).toBe('a');
	});

	it.each([
		['Ctrl+Shift', { ctrlKey: true, shiftKey: true }],
		['Meta+Shift', { metaKey: true, shiftKey: true }],
	])('%s unions the range with prior selection', (_label, modifiers) => {
		const next = apply(
			new Set(['outside', 'a']),
			'a',
			'c',
			true,
			modifiers as { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean },
			['a', 'b', 'c'],
		);
		expect(next.selectedIds).toEqual(new Set(['outside', 'a', 'b', 'c']));
		expect(next.anchorId).toBe('a');
	});

	it('Ctrl+Shift without an anchor adds the target without clearing prior selection', () => {
		const next = apply(new Set(['outside']), null, 'c', true, {
			ctrlKey: true,
			shiftKey: true,
		});
		expect(next.selectedIds).toEqual(new Set(['outside', 'c']));
		expect(next.anchorId).toBe('c');
	});

	it('Shift without a valid anchor safely selects the target', () => {
		const next = apply(new Set(['a']), null, 'c', true, { shiftKey: true });
		expect(next.selectedIds).toEqual(new Set(['c']));
		expect(next.anchorId).toBe('c');
	});

	it.each(['group-header', 'action-only', 'nonselectable'])(
		'%s rows are no-ops',
		(id) => {
			const selected = new Set(['a']);
			const visibleIds = id === 'group-header' ? ['a', 'b'] : ['a', 'b', id];
			const next = apply(
				selected,
				'a',
				id,
				true,
				undefined,
				visibleIds,
				(targetId) =>
					id === 'group-header' ? targetId !== id : targetId !== id,
			);
			expect(next.selectedIds).toEqual(selected);
			expect(next.anchorId).toBe('a');
		},
	);

	it('keeps distinct visible occurrences distinct', () => {
		const next = apply(
			new Set(['occurrence:a:1']),
			'occurrence:a:1',
			'occurrence:a:2',
			true,
		);
		expect(next.selectedIds).toEqual(
			new Set(['occurrence:a:1', 'occurrence:a:2']),
		);
		expect(next.anchorId).toBe('occurrence:a:2');
	});

	it('UnifiedTreeView sends the post-click checked value and native event', async () => {
		const { UnifiedTreeView } =
			await import('../../src/components/layout/viewTree');
		const container = document.createElement('div');
		Object.defineProperty(container, 'clientHeight', {
			value: 600,
			configurable: true,
		});
		document.body.appendChild(container);
		const view = new UnifiedTreeView(container);
		const node: TreeNode = {
			id: 'c',
			label: 'C',
			depth: 0,
			meta: {},
			children: [],
		};
		let captured:
			{ id: string; checked: boolean; event?: MouseEvent } | undefined;
		let selectedIds = new Set(['a']);
		let anchorId: string | null = 'a';
		view.render({
			nodes: [node],
			expandedIds: new Set(),
			selectedIds: new Set(),
			selectionCheckboxPosition: 'start',
			onToggle: () => {},
			onRowClick: () => {},
			onContextMenu: () => {},
			onSelectionToggle: (id, checked, event) => {
				captured = { id, checked, event };
				const next = apply(selectedIds, anchorId, id, checked, event);
				selectedIds = next.selectedIds;
				anchorId = next.anchorId;
			},
		});
		const checkbox = container.querySelector<HTMLInputElement>(
			'.vaultman-selection-checkbox',
		);
		expect(checkbox).not.toBeNull();
		expect(checkbox!.checked).toBe(false);
		checkbox!.click();
		expect(captured?.id).toBe('c');
		expect(captured?.checked).toBe(true);
		expect(captured?.event).toBeInstanceOf(MouseEvent);
		expect(selectedIds).toEqual(new Set(['a', 'c']));
		expect(anchorId).toBe('c');
		checkbox!.click();
		expect(captured?.checked).toBe(false);
		expect(captured?.event).toBeInstanceOf(MouseEvent);
		expect(selectedIds).toEqual(new Set(['a']));
		expect(anchorId).toBeNull();
	});
});
