import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, type Component } from 'svelte';
import { withContext } from '../_helpers/withContext';
import ViewNodeCards from '../../../src/components/views/ViewNodeCards.svelte';
import { rowInputFromTreeNode } from '../../../src/services/serviceExplorerRowInput';
import type { TextMeasureService } from '../../../src/services/serviceTextMeasure';
import type { TreeNode } from '../../../src/types/typeNode';
import { iconStub, makeMask, maskContext, resizeObserverStub } from './nodeElementMaskTestHelpers';
import { vaultmanPresetContext } from './nativeClassEmissionTestHelpers';
import { normalizedSnapshotHtml } from './panelSnapshotHelpers';

const node: TreeNode = {
	id: 'card-alpha',
	label: 'Alpha',
	depth: 0,
	meta: {},
	icon: 'lucide-file',
	count: 8,
	badges: [{ text: 'Queued', solid: true, color: 'accent', queueIndex: 0 }],
};

const measure: TextMeasureService = {
	cacheMisses: 0,
	measure: vi.fn(() => ({ lineCount: 1, height: 20 })),
	measureRowHeight: vi.fn(() => 32),
	invalidate: vi.fn(),
	invalidateAll: vi.fn(),
	clear: vi.fn(),
};

describe('ViewNodeCards - panel x vaultman snapshot', () => {
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

	it('card root + title + state mods + badges render under default vaultman mask', () => {
		app = withContext(
			target,
			ViewNodeCards as unknown as Component<Record<string, unknown>>,
			{
				providerId: 'tags',
				rowInputs: [rowInputFromTreeNode(node)],
				visibleFields: ['icon', 'text', 'count'],
				selectedIds: new Set<string>(['card-alpha']),
				focusedId: 'card-alpha',
				onCardClick: vi.fn(),
				onContextMenu: vi.fn(),
				measure,
				icon: iconStub(),
			},
			[...vaultmanPresetContext(), ...maskContext(makeMask())],
		);
		flushSync();

		expect(normalizedSnapshotHtml(target.firstElementChild)).toMatchSnapshot();
	});
});
