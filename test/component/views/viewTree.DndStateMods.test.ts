import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, type Component } from 'svelte';
import { withContext } from '../_helpers/withContext';
import ViewTree from '../../../src/components/views/viewTree.svelte';
import type { TreeNode } from '../../../src/types/typeNode';
import { iconStub, resizeObserverStub } from './nodeElementMaskTestHelpers';
import { nativePresetContext, vaultmanPresetContext } from './nativeClassEmissionTestHelpers';

const nodes: TreeNode[] = [
	{ id: 'tree-dnd-a', label: 'Tree A', depth: 0, meta: {}, icon: 'lucide-file' },
];

describe('viewTree - DnD state mod emission (C9)', () => {
	let target: HTMLDivElement;
	let app: { destroy(): void } | null = null;

	beforeEach(() => {
		target = document.createElement('div');
		document.body.appendChild(target);
		vi.stubGlobal('ResizeObserver', resizeObserverStub);
	});

	afterEach(() => {
		app?.destroy();
		app = null;
		target.remove();
		vi.unstubAllGlobals();
	});

	function render(contextEntries = nativePresetContext()) {
		app = withContext(
			target,
			ViewTree as unknown as Component<Record<string, unknown>>,
			{
				nodes,
				expandedIds: new Set<string>(),
				onToggle: vi.fn(),
				onRowClick: vi.fn(),
				onContextMenu: vi.fn(),
				dndStateForId: () => ({ dragging: true, dropTarget: true }),
				icon: iconStub(),
			},
			contextEntries,
		);
		flushSync();
	}

	it('emits vm and native DnD state mods when native DOM mode is active', () => {
		render(nativePresetContext());

		const row = target.querySelector<HTMLElement>('.vm-tree-virtual-row');
		expect(row?.classList.contains('vm-drag-source')).toBe(true);
		expect(row?.classList.contains('vm-drop-target')).toBe(true);
		expect(row?.classList.contains('is-being-dragged')).toBe(true);
		expect(row?.classList.contains('is-being-dragged-over')).toBe(true);
	});

	it('emits only vm DnD state mods when native DOM mode is inactive', () => {
		render(vaultmanPresetContext());

		const row = target.querySelector<HTMLElement>('.vm-tree-virtual-row');
		expect(row?.classList.contains('vm-drag-source')).toBe(true);
		expect(row?.classList.contains('vm-drop-target')).toBe(true);
		expect(row?.classList.contains('is-being-dragged')).toBe(false);
		expect(row?.classList.contains('is-being-dragged-over')).toBe(false);
	});
});
