import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, type Component } from 'svelte';
import { withContext } from '../_helpers/withContext';
import ViewNodeGrid from '../../../src/components/views/ViewNodeGrid.svelte';
import type { TreeNode } from '../../../src/types/typeNode';
import { iconStub, makeMask, maskContext, resizeObserverStub } from './nodeElementMaskTestHelpers';
import { vaultmanPresetContext } from './nativeClassEmissionTestHelpers';
import { normalizedSnapshotHtml } from './panelSnapshotHelpers';

const nodes: TreeNode[] = [
	{
		id: 'grid-alpha',
		label: 'Alpha',
		depth: 0,
		meta: {},
		icon: 'lucide-folder',
		count: 5,
		badges: [{ text: 'Queued', solid: true, color: 'accent', queueIndex: 0 }],
		children: [{ id: 'grid-beta', label: 'Beta', depth: 1, meta: {}, icon: 'lucide-file' }],
	},
];

describe('ViewNodeGrid - panel x vaultman snapshot', () => {
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

	it('tile root + label + state mods + badges render under default vaultman mask', () => {
		app = withContext(
			target,
			ViewNodeGrid as unknown as Component<Record<string, unknown>>,
			{
				nodes,
				expandedIds: new Set<string>(['grid-alpha']),
				selectedIds: new Set<string>(['grid-alpha']),
				focusedId: 'grid-alpha',
				hierarchyMode: 'inline',
				onTileClick: vi.fn(),
				onContextMenu: vi.fn(),
				icon: iconStub(),
			},
			[...vaultmanPresetContext(), ...maskContext(makeMask())],
		);
		flushSync();

		expect(normalizedSnapshotHtml(target.firstElementChild)).toMatchSnapshot();
	});
});
