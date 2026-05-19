import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, type Component } from 'svelte';
import { withContext } from '../_helpers/withContext';
import ViewTree from '../../../src/components/views/viewTree.svelte';
import type { TreeNode } from '../../../src/types/typeNode';
import { iconStub, resizeObserverStub } from './nodeElementMaskTestHelpers';
import { nativePresetContext, vaultmanPresetContext } from './nativeClassEmissionTestHelpers';

const nodes: TreeNode[] = [
	{
		id: 'tree-parent',
		label: 'Tree Parent',
		depth: 0,
		meta: {},
		icon: 'lucide-folder',
		children: [{ id: 'tree-child', label: 'Tree Child', depth: 1, meta: {}, icon: 'lucide-file' }],
	},
];

describe('viewTree - native class emission', () => {
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
				expandedIds: new Set<string>(['tree-parent']),
				selectedIds: new Set<string>(['tree-parent']),
				focusedId: 'tree-parent',
				onToggle: vi.fn(),
				onRowClick: vi.fn(),
				onContextMenu: vi.fn(),
				icon: iconStub(),
			},
			contextEntries,
		);
		flushSync();
	}

	it('emits tree native vocabulary from the contract when preset.useNativeDom=true', () => {
		render(nativePresetContext());

		expect(target.querySelector('.vm-tree-virtual-row.tree-item')).not.toBeNull();
		expect(target.querySelector('.vm-tree-row-surface.tree-item-self')).not.toBeNull();
		expect(target.querySelector('.vm-tree-label.tree-item-inner')).not.toBeNull();
		expect(target.querySelector('.vm-tree-toggle.collapse-icon')).not.toBeNull();
	});

	it('emits vm state classes plus allow-listed native state classes', () => {
		render(nativePresetContext());

		const row = target.querySelector<HTMLElement>('.vm-tree-virtual-row');
		expect(row?.classList.contains('vm-is-selected')).toBe(true);
		expect(row?.classList.contains('vm-is-focused')).toBe(true);
		expect(row?.classList.contains('is-selected')).toBe(true);
		expect(row?.classList.contains('is-focused')).toBe(true);
	});

	it('does not emit tree native vocabulary when preset.useNativeDom=false', () => {
		render(vaultmanPresetContext());

		expect(target.querySelector('.tree-item')).toBeNull();
		expect(target.querySelector('.tree-item-self')).toBeNull();
		expect(target.querySelector('.tree-item-inner')).toBeNull();
		expect(target.querySelector('.collapse-icon')).toBeNull();
		expect(target.querySelector('.vm-tree-virtual-row')).not.toBeNull();
	});
});
