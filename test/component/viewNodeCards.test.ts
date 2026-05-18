import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import ViewNodeCards from '../../src/components/views/ViewNodeCards.svelte';
import { createExplorerProjection } from '../../src/services/serviceExplorerProjection';
import { rowInputFromTreeNode } from '../../src/services/serviceExplorerRowInput';
import type { TextMeasureService } from '../../src/services/serviceTextMeasure';
import type { TreeNode } from '../../src/types/typeNode';

const nodes: TreeNode[] = [
	{
		id: 'alpha',
		label: 'Alpha long label that wraps',
		depth: 0,
		meta: {},
		icon: 'lucide-file',
		count: 2,
	},
	{ id: 'beta', label: 'Beta', depth: 0, meta: {}, icon: 'lucide-tag', count: 1 },
];

const queuedNodes: TreeNode[] = [
	{
		id: 'queued',
		label: 'Queued card',
		depth: 0,
		meta: {},
		icon: 'lucide-file',
		badges: [{ icon: 'lucide-trash-2', queueIndex: 0, title: 'queued' }],
	},
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

describe('ViewNodeCards', () => {
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
		if (app) void unmount(app);
		app = null;
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
				onCardClick: vi.fn(),
				onContextMenu: vi.fn(),
				measure,
				icon: vi.fn(() => ({ update: vi.fn() })),
				...props,
			},
		});
		flushSync();
	}

	it('renders measured cards with selected and active state classes', () => {
		render({ selectedIds: new Set(['alpha']), activeId: 'beta' });

		expect(target.querySelector('[data-id="alpha"]')?.classList.contains('is-selected')).toBe(true);
		expect(target.querySelector('[data-id="beta"]')?.classList.contains('is-active-node')).toBe(true);
		expect(target.querySelector('[data-card-field="count"]')?.textContent).toContain('2');
	});

	it('dispatches click, context menu, and keyboard callbacks', () => {
		const onCardClick = vi.fn();
		const onContextMenu = vi.fn((_: string, e: MouseEvent) => e.preventDefault());
		const onCardKeydown = vi.fn();
		render({ onCardClick, onContextMenu, onCardKeydown });

		const alpha = target.querySelector<HTMLElement>('[data-id="alpha"]')!;
		alpha.click();
		alpha.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
		alpha.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

		expect(onCardClick).toHaveBeenCalledWith('alpha', expect.any(MouseEvent));
		expect(onContextMenu).toHaveBeenCalledWith('alpha', expect.any(MouseEvent));
		expect(onCardKeydown).toHaveBeenCalledWith('alpha', expect.any(KeyboardEvent));
	});

	it('renders row-input-compatible card payloads and routes callbacks by callback id', () => {
		const onCardClick = vi.fn();
		const onContextMenu = vi.fn((_: string, e: MouseEvent) => e.preventDefault());
		const onCardKeydown = vi.fn();
		const [alpha] = nodes;
		const rowInputs = [
			{
				...rowInputFromTreeNode(alpha),
				callbackId: 'callback:alpha',
				label: 'Alpha from row input',
			},
		];
		render({ nodes, rowInputs, onCardClick, onContextMenu, onCardKeydown });

		const alphaCard = target.querySelector<HTMLElement>('[data-id="alpha"]')!;
		alphaCard.click();
		alphaCard.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
		alphaCard.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

		expect(alphaCard.dataset.id).toBe('alpha');
		expect(alphaCard.dataset.callbackId).toBe('callback:alpha');
		expect(alphaCard.textContent).toContain('Alpha from row input');
		expect(onCardClick).toHaveBeenCalledWith('callback:alpha', expect.any(MouseEvent));
		expect(onContextMenu).toHaveBeenCalledWith('callback:alpha', expect.any(MouseEvent));
		expect(onCardKeydown).toHaveBeenCalledWith('callback:alpha', expect.any(KeyboardEvent));
	});

	it('renders projection card payloads without making media descriptors visible by default', () => {
		const onCardClick = vi.fn();
		const [alpha] = nodes;
		const rowInput = {
			...rowInputFromTreeNode(alpha, {
				mediaDescriptor: {
					targetKey: 'alpha',
					target: { kind: 'file', path: 'alpha.png' },
					status: 'ready' as const,
					mediaKey: 'media:alpha',
				},
			}),
			callbackId: 'callback:projection-alpha',
			label: 'Projection card alpha',
		};
		const projection = createExplorerProjection({
			providerId: 'files',
			viewMode: 'cards',
			rowInputs: [rowInput],
			sourceRevision: 16,
		});

		render({
			nodes: [],
			projection,
			providerId: 'files',
			visibleFields: ['icon', 'name'],
			onCardClick,
		});

		const card = target.querySelector<HTMLElement>('[data-id="alpha"]');
		expect(card).not.toBeNull();
		expect(card?.dataset.callbackId).toBe('callback:projection-alpha');
		expect(card?.textContent).toContain('Projection card alpha');
		expect(card?.querySelector('[data-card-field="media"]')).toBeFalsy();
		expect(card?.textContent).not.toContain('media:alpha');

		card!.click();

		expect(onCardClick).toHaveBeenCalledWith('callback:projection-alpha', expect.any(MouseEvent));
	});

	it('removes queued operations from direct node badges without selecting the card', () => {
		const onBadgeDoubleClick = vi.fn();
		const onCardClick = vi.fn();
		render({ nodes: queuedNodes, onBadgeDoubleClick, onCardClick });

		const badge = target.querySelector<HTMLElement>('[data-id="queued"] [aria-label="queued"]');
		expect(badge).toBeTruthy();
		badge!.click();

		expect(onBadgeDoubleClick).toHaveBeenCalledWith(0);
		expect(onCardClick).not.toHaveBeenCalled();
	});

	it('remeasures cards from the rendered CSS font snapshot', () => {
		const measure = {
			cacheMisses: 0,
			measure: vi.fn((text: string, style) => ({
				lineCount: Math.max(1, Math.ceil(text.length / 24)),
				height: Math.max(1, Math.ceil(text.length / 24)) * style.lineHeight,
			})),
			measureRowHeight: vi.fn(() => 32),
			invalidate: vi.fn(),
			invalidateAll: vi.fn(),
			clear: vi.fn(),
		} satisfies TextMeasureService;
		const getComputedStyle = vi.fn((element: Element) => {
			if ((element as HTMLElement).classList.contains('is-title')) {
				return {
					font: '',
					fontStyle: 'normal',
					fontVariant: 'normal',
					fontWeight: '650',
					fontSize: '15px',
					fontFamily: 'Inter',
					lineHeight: '22px',
					letterSpacing: '0.25px',
					whiteSpace: 'normal',
					wordBreak: 'normal',
				} as CSSStyleDeclaration;
			}
			return {
				font: '',
				fontStyle: 'normal',
				fontVariant: 'normal',
				fontWeight: '400',
				fontSize: '12px',
				fontFamily: 'Inter',
				lineHeight: '17px',
				letterSpacing: 'normal',
				whiteSpace: 'normal',
				wordBreak: 'normal',
			} as CSSStyleDeclaration;
		});
		vi.stubGlobal('activeWindow', { ...window, getComputedStyle });

		render({ measure });
		flushSync();

		expect(measure.measure).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				font: expect.stringContaining('650'),
				lineHeight: 22,
				letterSpacing: 0.25,
			}),
			expect.any(Number),
		);
	});
});
