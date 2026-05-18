import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, type Component } from 'svelte';
import { withContext } from '../_helpers/withContext';
import ViewTree from '../../../src/components/views/viewTree.svelte';
import type { TreeNode } from '../../../src/types/typeNode';
import { iconStub, makeMask, maskContext, resizeObserverStub } from './nodeElementMaskTestHelpers';

const nodes: TreeNode[] = [
	{
		id: 'tree-a',
		label: 'Tree Alpha',
		depth: 0,
		meta: {},
		icon: 'lucide-file',
		count: 7,
		badges: [{ icon: 'lucide-trash-2', queueIndex: 0, title: 'queued' }],
	},
];

describe('viewTree - NodeElementMask gating', () => {
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

	function render(mask = makeMask()) {
		app = withContext(
			target,
			ViewTree as unknown as Component<Record<string, unknown>>,
			{
				nodes,
				expandedIds: new Set<string>(),
				visibleFields: ['icon', 'text', 'count'],
				onToggle: vi.fn(),
				onRowClick: vi.fn(),
				onContextMenu: vi.fn(),
				onBadgeDoubleClick: vi.fn(),
				icon: iconStub(),
			},
			maskContext(mask),
		);
		flushSync();
	}

	it('gates icon, label, count, and operation badges', () => {
		render(makeMask({ icon: false, label: false, badges: { ops: false, counts: false } }));

		const row = target.querySelector('[data-id="tree-a"]');
		expect(row).not.toBeNull();
		expect(row?.querySelector('.vm-tree-icon')).toBeNull();
		expect(row?.querySelector('.vm-tree-label')).toBeNull();
		expect(row?.querySelector('.vm-tree-count')).toBeNull();
		expect(row?.querySelector('[aria-label="queued"]')).toBeNull();
	});
});
