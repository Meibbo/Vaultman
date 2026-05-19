import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, type Component } from 'svelte';
import { withContext } from '../_helpers/withContext';
import ViewNodeCards from '../../../src/components/views/ViewNodeCards.svelte';
import { rowInputFromTreeNode } from '../../../src/services/serviceExplorerRowInput';
import type { TextMeasureService } from '../../../src/services/serviceTextMeasure';
import type { TreeNode } from '../../../src/types/typeNode';
import { iconStub, makeMask, maskContext, resizeObserverStub } from './nodeElementMaskTestHelpers';
import { nativePresetContext, vaultmanPresetContext } from './nativeClassEmissionTestHelpers';

const node: TreeNode = {
	id: 'card-native-a',
	label: 'Card Alpha',
	depth: 0,
	meta: {},
	icon: 'lucide-file',
	count: 4,
};

const measure: TextMeasureService = {
	cacheMisses: 0,
	measure: vi.fn(() => ({ lineCount: 1, height: 20 })),
	measureRowHeight: vi.fn(() => 32),
	invalidate: vi.fn(),
	invalidateAll: vi.fn(),
	clear: vi.fn(),
};

describe('ViewNodeCards - native class emission', () => {
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

	function render(contextEntries: ReadonlyArray<readonly [symbol, unknown]>) {
		const rowInput = rowInputFromTreeNode(node, {
			mediaDescriptor: {
				targetKey: 'node:card-native-a',
				target: { kind: 'node', nodeId: 'card-native-a' },
				status: 'ready',
				mediaKey: 'media-card-native-a',
			},
		});
		app = withContext(
			target,
			ViewNodeCards as unknown as Component<Record<string, unknown>>,
			{
				providerId: 'tags',
				rowInputs: [rowInput],
				visibleFields: ['icon', 'text', 'count'],
				selectedIds: new Set<string>(['card-native-a']),
				focusedId: 'card-native-a',
				onCardClick: vi.fn(),
				onContextMenu: vi.fn(),
				measure,
				icon: iconStub(),
			},
			contextEntries,
		);
		flushSync();
	}

	it('emits Bases cards vocabulary when preset.useNativeDom=true', () => {
		render([...nativePresetContext(), ...maskContext(makeMask({ media: true }))]);

		expect(target.querySelector('.vm-node-card.bases-cards-item')).not.toBeNull();
		expect(target.querySelector('.vm-node-card.nav-file')).toBeNull();
		expect(target.querySelector('.vm-node-card-field.bases-cards-property.mod-title')).not.toBeNull();
		expect(target.querySelector('.vm-node-card-field.bases-cards-property')).not.toBeNull();
		expect(target.querySelector('.vm-node-card-cover.bases-cards-cover')).not.toBeNull();
	});

	it('emits vm state classes plus allow-listed native state classes', () => {
		render([...nativePresetContext(), ...maskContext(makeMask({ media: true }))]);

		const card = target.querySelector<HTMLElement>('.vm-node-card');
		expect(card?.classList.contains('vm-is-selected')).toBe(true);
		expect(card?.classList.contains('vm-is-focused')).toBe(true);
		expect(card?.classList.contains('is-selected')).toBe(true);
		expect(card?.classList.contains('is-focused')).toBe(true);
	});

	it('does not emit native card vocabulary when preset.useNativeDom=false', () => {
		render([...vaultmanPresetContext(), ...maskContext(makeMask({ media: true }))]);

		expect(target.querySelector('.bases-cards-item')).toBeNull();
		expect(target.querySelector('.bases-cards-property')).toBeNull();
		expect(target.querySelector('.bases-cards-cover')).toBeNull();
		expect(target.querySelector('.nav-file')).toBeNull();
		expect(target.querySelector('.nav-file-title')).toBeNull();
		expect(target.querySelector('.vm-node-card')).not.toBeNull();
	});
});
