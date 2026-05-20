import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import ViewNodeCards from '../../src/components/views/ViewNodeCards.svelte';
import { rowInputFromTreeNode } from '../../src/services/serviceExplorerRowInput';
import type { TextMeasureService } from '../../src/services/serviceTextMeasure';
import type { TreeNode } from '../../src/types/typeNode';

const nodes: TreeNode[] = [
	{
		id: 'alpha',
		label: 'Alpha long label',
		depth: 0,
		meta: {},
		icon: 'lucide-file',
		count: 2,
	},
	{ id: 'beta', label: 'Beta', depth: 0, meta: {}, icon: 'lucide-tag', count: 1 },
];

const measure: TextMeasureService = {
	cacheMisses: 0,
	measure: vi.fn((text: string, style) => ({
		lineCount: Math.max(1, Math.ceil(text.length / 24)),
		height: Math.max(1, Math.ceil(text.length / 24)) * style.lineHeight,
	})),
	measureRowHeight: vi.fn(() => 32),
	invalidate: vi.fn(),
	invalidateAll: vi.fn(),
	clear: vi.fn(),
};

describe('ViewNodeCards action-routing adoption', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		target = document.createElement('div');
		document.body.appendChild(target);
		vi.stubGlobal(
			'ResizeObserver',
			class {
				observe(): void {}
				disconnect(): void {}
			},
		);
	});

	afterEach(() => {
		if (app) {
			void unmount(app);
			app = null;
		}
		target.remove();
		vi.unstubAllGlobals();
	});

	function render(props: Record<string, unknown> = {}) {
		app = mount(ViewNodeCards as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				providerId: 'tags',
				nodes,
				visibleFields: ['icon', 'text', 'count'],
				selectedIds: new Set<string>(),
				focusedId: null,
				activeId: null,
				onCardClick: vi.fn(),
				onSecondaryAction: vi.fn(),
				onTertiaryAction: vi.fn(),
				onContextMenu: vi.fn(),
				onCardKeydown: vi.fn(),
				measure,
				icon: vi.fn(() => ({ update: vi.fn() })),
				...props,
			},
		});
		flushSync();
	}

	it('card exposes data-row-key and gridcell role', () => {
		render();

		const card = target.querySelector<HTMLElement>('[data-id="alpha"]');

		expect(card?.getAttribute('data-row-key')).toBe('alpha');
		expect(card?.getAttribute('role')).toBe('gridcell');
	});

	it('keydown on a card delegates to onCardKeydown(id, e)', () => {
		const onCardKeydown = vi.fn();
		render({ onCardKeydown });

		target
			.querySelector<HTMLElement>('[data-id="alpha"]')
			?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

		expect(onCardKeydown).toHaveBeenCalledWith('alpha', expect.any(KeyboardEvent));
	});

	it('clicking a card still calls onCardClick(id, e)', () => {
		const onCardClick = vi.fn();
		render({ onCardClick });

		target.querySelector<HTMLElement>('[data-id="alpha"]')?.click();

		expect(onCardClick).toHaveBeenCalledWith('alpha', expect.any(MouseEvent));
	});

	it('uses callback id as the action row key for row-input cards', () => {
		const onCardKeydown = vi.fn();
		const [alpha] = nodes;
		const rowInputs = [
			{
				...rowInputFromTreeNode(alpha),
				callbackId: 'callback:alpha',
				label: 'Alpha from row input',
			},
		];
		render({ rowInputs, onCardKeydown });

		const card = target.querySelector<HTMLElement>('[data-id="alpha"]');
		card?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

		expect(card?.getAttribute('data-row-key')).toBe('callback:alpha');
		expect(onCardKeydown).toHaveBeenCalledWith('callback:alpha', expect.any(KeyboardEvent));
	});
});
