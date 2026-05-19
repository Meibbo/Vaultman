import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, type Component } from 'svelte';
import { withContext } from '../_helpers/withContext';
import ViewNodeCards from '../../../src/components/views/ViewNodeCards.svelte';
import { rowInputFromTreeNode } from '../../../src/services/serviceExplorerRowInput';
import type { TextMeasureService } from '../../../src/services/serviceTextMeasure';
import type { TreeNode } from '../../../src/types/typeNode';
import { iconStub, resizeObserverStub } from './nodeElementMaskTestHelpers';
import { nativePresetContext, vaultmanPresetContext } from './nativeClassEmissionTestHelpers';

const node: TreeNode = {
	id: 'card-dnd-a',
	label: 'Card A',
	depth: 0,
	meta: {},
	icon: 'lucide-file',
};

const measure: TextMeasureService = {
	cacheMisses: 0,
	measure: vi.fn(() => ({ lineCount: 1, height: 20 })),
	measureRowHeight: vi.fn(() => 32),
	invalidate: vi.fn(),
	invalidateAll: vi.fn(),
	clear: vi.fn(),
};

describe('ViewNodeCards - DnD state mod emission (C9)', () => {
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
			ViewNodeCards as unknown as Component<Record<string, unknown>>,
			{
				providerId: 'tags',
				rowInputs: [rowInputFromTreeNode(node)],
				visibleFields: ['icon', 'text', 'count'],
				onCardClick: vi.fn(),
				onContextMenu: vi.fn(),
				measure,
				dndStateForId: () => ({ dragging: true, dropTarget: true }),
				icon: iconStub(),
			},
			contextEntries,
		);
		flushSync();
	}

	it('emits vm and native DnD state mods when native DOM mode is active', () => {
		render(nativePresetContext());

		const card = target.querySelector<HTMLElement>('.vm-node-card');
		expect(card?.classList.contains('vm-drag-source')).toBe(true);
		expect(card?.classList.contains('vm-drop-target')).toBe(true);
		expect(card?.classList.contains('is-being-dragged')).toBe(true);
		expect(card?.classList.contains('is-being-dragged-over')).toBe(true);
	});

	it('emits only vm DnD state mods when native DOM mode is inactive', () => {
		render(vaultmanPresetContext());

		const card = target.querySelector<HTMLElement>('.vm-node-card');
		expect(card?.classList.contains('vm-drag-source')).toBe(true);
		expect(card?.classList.contains('vm-drop-target')).toBe(true);
		expect(card?.classList.contains('is-being-dragged')).toBe(false);
		expect(card?.classList.contains('is-being-dragged-over')).toBe(false);
	});
});
