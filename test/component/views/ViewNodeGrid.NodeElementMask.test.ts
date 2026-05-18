import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, type Component } from 'svelte';
import { withContext } from '../_helpers/withContext';
import ViewNodeGrid from '../../../src/components/views/ViewNodeGrid.svelte';
import type { TreeNode } from '../../../src/types/typeNode';
import { iconStub, makeMask, maskContext, resizeObserverStub } from './nodeElementMaskTestHelpers';

const nodes: TreeNode[] = [
	{
		id: 'grid-a',
		label: 'Grid Alpha',
		depth: 0,
		meta: {},
		icon: 'lucide-file',
		count: 3,
		badges: [{ icon: 'lucide-trash-2', queueIndex: 0, title: 'queued' }],
	},
];

describe('ViewNodeGrid - NodeElementMask gating', () => {
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
			ViewNodeGrid as unknown as Component<Record<string, unknown>>,
			{
				nodes,
				visibleFields: ['icon', 'text', 'count'],
				selectedIds: new Set<string>(),
				expandedIds: new Set<string>(),
				onTileClick: vi.fn(),
				onContextMenu: vi.fn(),
				onBoxSelect: vi.fn(),
				onToggleExpand: vi.fn(),
				onBadgeDoubleClick: vi.fn(),
				icon: iconStub(),
			},
			maskContext(mask),
		);
		flushSync();
	}

	it('gates icon, label, count, and operation badges', () => {
		render(makeMask({ icon: false, label: false, badges: { ops: false, counts: false } }));

		const tile = target.querySelector('[data-id="grid-a"]');
		expect(tile).not.toBeNull();
		expect(tile?.querySelector('.vm-node-grid-icon')).toBeNull();
		expect(tile?.querySelector('.vm-node-grid-icon-placeholder')).toBeNull();
		expect(tile?.querySelector('.vm-node-grid-label')).toBeNull();
		expect(tile?.querySelector('[data-node-field="count"]')).toBeNull();
		expect(tile?.querySelector('[aria-label="queued"]')).toBeNull();
	});
});
