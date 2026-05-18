import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, type Component } from 'svelte';
import { withContext } from '../_helpers/withContext';
import ViewNodeCards from '../../../src/components/views/ViewNodeCards.svelte';
import { rowInputFromTreeNode } from '../../../src/services/serviceExplorerRowInput';
import type { TextMeasureService } from '../../../src/services/serviceTextMeasure';
import type { TreeNode } from '../../../src/types/typeNode';
import { iconStub, makeMask, maskContext, resizeObserverStub } from './nodeElementMaskTestHelpers';

const node: TreeNode = {
	id: 'card-a',
	label: 'Card Alpha',
	depth: 0,
	meta: {},
	icon: 'lucide-file',
	count: 4,
	badges: [{ icon: 'lucide-trash-2', queueIndex: 0, title: 'queued' }],
};

const measure: TextMeasureService = {
	cacheMisses: 0,
	measure: vi.fn(() => ({ lineCount: 1, height: 20 })),
	measureRowHeight: vi.fn(() => 32),
	invalidate: vi.fn(),
	invalidateAll: vi.fn(),
	clear: vi.fn(),
};

describe('ViewNodeCards - NodeElementMask gating', () => {
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
		const rowInput = rowInputFromTreeNode(node, {
			mediaDescriptor: {
				targetKey: 'node:card-a',
				target: { kind: 'node', nodeId: 'card-a' },
				status: 'ready',
				mediaKey: 'media-card-a',
			},
		});
		app = withContext(
			target,
			ViewNodeCards as unknown as Component<Record<string, unknown>>,
			{
				providerId: 'tags',
				rowInputs: [rowInput],
				visibleFields: ['icon', 'text', 'count'],
				onCardClick: vi.fn(),
				onContextMenu: vi.fn(),
				measure,
				icon: iconStub(),
			},
			maskContext(mask),
		);
		flushSync();
	}

	it('gates icon, title, count, operation badges, and media cover', () => {
		render(makeMask({ icon: false, label: false, media: true, badges: { ops: false, counts: false } }));

		const card = target.querySelector('[data-id="card-a"]');
		expect(card).not.toBeNull();
		expect(card?.querySelector('.vm-node-card-icon')).toBeNull();
		expect(card?.querySelector('.vm-node-card-field.is-title')).toBeNull();
		expect(card?.querySelector('[data-card-field="count"]')).toBeNull();
		expect(card?.querySelector('[aria-label="queued"]')).toBeNull();
		expect(card?.querySelector('.vm-node-card-cover')).not.toBeNull();
	});
});
