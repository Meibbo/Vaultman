import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, type Component } from 'svelte';
import { withContext } from '../_helpers/withContext';
import ViewTree from '../../../src/components/views/viewTree.svelte';
import type { TreeNode } from '../../../src/types/typeNode';
import { iconStub, makeMask, maskContext, resizeObserverStub } from './nodeElementMaskTestHelpers';
import { vaultmanPresetContext } from './nativeClassEmissionTestHelpers';
import { normalizedSnapshotHtml } from './panelSnapshotHelpers';

const nodes: TreeNode[] = [
	{
		id: 'tree-alpha',
		label: 'Alpha',
		depth: 0,
		meta: {},
		icon: 'lucide-folder',
		count: 2,
		badges: [{ text: 'Queued', solid: true, color: 'accent', queueIndex: 0 }],
		children: [{ id: 'tree-beta', label: 'Beta', depth: 1, meta: {}, icon: 'lucide-file' }],
	},
];

describe('viewTree - panel x vaultman snapshot', () => {
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

	it('row root + inner + label + state mods + badges render under default vaultman mask', () => {
		app = withContext(
			target,
			ViewTree as unknown as Component<Record<string, unknown>>,
			{
				nodes,
				expandedIds: new Set<string>(['tree-alpha']),
				selectedIds: new Set<string>(['tree-alpha']),
				focusedId: 'tree-alpha',
				onToggle: vi.fn(),
				onRowClick: vi.fn(),
				onContextMenu: vi.fn(),
				icon: iconStub(),
			},
			[...vaultmanPresetContext(), ...maskContext(makeMask())],
		);
		flushSync();

		expect(normalizedSnapshotHtml(target.firstElementChild)).toMatchSnapshot();
	});
});
