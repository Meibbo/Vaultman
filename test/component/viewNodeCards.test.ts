import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import ViewNodeCards from '../../src/components/views/ViewNodeCards.svelte';
import { createExplorerProjection } from '../../src/services/serviceExplorerProjection';
import { rowInputFromTreeNode } from '../../src/services/serviceExplorerRowInput';
import { CARD_HEIGHT_BUCKETS } from '../../src/services/serviceNodeCardLayout';
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

	// V.D slice 2b: the shared runtime's Fenwick stores GAP-FREE band sizes (layout.topForIndex);
	// CARD_GAP arithmetic is view turf (D-2b CARD_GAP discipline). This proves the pre-adoption
	// spacing is preserved bit-for-bit: each band sits CARD_GAP below the previous band's bottom
	// edge, and the leading/trailing gap match the old gap-inclusive-Fenwick formula
	// (`CARD_GAP + topForIndex(index)` where the OLD Fenwick's own stored sizes already included
	// `+ CARD_GAP` per row -- see ViewNodeCards.svelte's `cardBandTop` docblock for the algebra).
	it('preserves CARD_GAP spacing between bands and the leading/trailing edges', () => {
		const CARD_GAP = 8;
		// updateCardMetrics only runs from the mount $effect + the ResizeObserver callback (never
		// from a bare 'scroll' event) -- capture the real callback (this file's shared beforeEach
		// stub is a no-op) so we can force columnCount=1 deterministically, same pattern as
		// viewNodeDynamicGeometry.test.ts's triggerResize(). requestAnimationFrame must run
		// synchronously too: scheduleCardMetricsUpdate defers updateCardMetrics through it, and
		// flushSync() does not pump real animation frames.
		const resizeCallbacks: ResizeObserverCallback[] = [];
		vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
			cb(0);
			return 1;
		});
		vi.stubGlobal('cancelAnimationFrame', vi.fn());
		vi.stubGlobal(
			'ResizeObserver',
			class {
				constructor(cb: ResizeObserverCallback) {
					resizeCallbacks.push(cb);
				}
				observe(): void {}
				disconnect(): void {}
			},
		);
		// Single column: force columnCount=1 so each node is its own band (bands === nodes,
		// simplest possible case to hand-verify the accumulating-gap formula against).
		const singleColumnWidth = 160; // < CARD_MIN_WIDTH(176) + CARD_GAP*2 -> columnsForWidth = 1
		const spacingNodes: TreeNode[] = [
			{ id: 'short', label: 'x', depth: 0, meta: {} }, // lineCount 1 -> compact (72)
			{ id: 'mid', label: 'x'.repeat(30), depth: 0, meta: {} }, // lineCount 2 -> standard (96)
			{ id: 'long', label: 'x'.repeat(100), depth: 0, meta: {} }, // lineCount 5 -> tall (136)
		];
		render({ nodes: spacingNodes, visibleFields: ['text'] });

		const outer = target.querySelector<HTMLElement>('.vm-node-cards')!;
		Object.defineProperty(outer, 'clientWidth', { value: singleColumnWidth, configurable: true });
		for (const cb of resizeCallbacks) cb([], {} as ResizeObserver);
		flushSync();

		const rows = Array.from(target.querySelectorAll<HTMLElement>('.vm-node-card-row'));
		expect(rows.length).toBe(3);

		const yOf = (row: HTMLElement) =>
			Number(/--vm-node-card-y:\s*([\d.]+)px/.exec(row.getAttribute('style') ?? '')?.[1]);
		const hOf = (row: HTMLElement) =>
			Number(/--vm-node-card-row-h:\s*([\d.]+)px/.exec(row.getAttribute('style') ?? '')?.[1]);

		const [row0, row1, row2] = rows;
		const h0 = hOf(row0);
		const h1 = hOf(row1);
		expect(h0).toBe(CARD_HEIGHT_BUCKETS.compact);
		expect(h1).toBe(CARD_HEIGHT_BUCKETS.standard);
		expect(hOf(row2)).toBe(CARD_HEIGHT_BUCKETS.tall);

		// Leading gap: band 0 sits exactly one CARD_GAP from the top.
		expect(yOf(row0)).toBe(CARD_GAP);
		// Each subsequent band sits CARD_GAP below the previous band's bottom edge.
		expect(yOf(row1)).toBe(yOf(row0) + h0 + CARD_GAP);
		expect(yOf(row2)).toBe(yOf(row1) + h1 + CARD_GAP);

		// Trailing gap: total scrollable height clears the last band's bottom edge by one CARD_GAP.
		const inner = target.querySelector<HTMLElement>('.vm-node-cards-inner')!;
		const totalH = Number(
			/--vm-node-cards-total-h:\s*([\d.]+)px/.exec(inner.getAttribute('style') ?? '')?.[1],
		);
		expect(totalH).toBe(yOf(row2) + hOf(row2) + CARD_GAP);
	});

	it('renders zero total height for an empty card list (no orphan leading gap)', () => {
		render({ nodes: [] });

		const inner = target.querySelector<HTMLElement>('.vm-node-cards-inner')!;
		expect(inner.getAttribute('style')).toContain('--vm-node-cards-total-h: 0px');
		expect(target.querySelectorAll('.vm-node-card-row').length).toBe(0);
	});
});
