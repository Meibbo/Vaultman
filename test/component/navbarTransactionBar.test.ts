import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount, type ComponentProps } from 'svelte';
import NavbarFilters from '../../src/components/layout/navbarFilters.svelte';
import type { TransactionBarState } from '../../src/logic/logicTransactionBarState';
import { normalizeExplorerSortState } from '../../src/logic/logicScopedSort';
import type { SceneConfigPort } from '../../src/logic/logicSceneConfigPort';
import type { ScenePanelWidgetActionPort } from '../../src/types/typePanelWidget';

if (typeof window.ResizeObserver === 'undefined') {
	class ResizeObserverMock {
		observe() {}
		unobserve() {}
		disconnect() {}
	}
	window.ResizeObserver = ResizeObserverMock;
}

describe('navbarFilters monta BarTransaction', () => {
	let target: HTMLElement;
	let instance: ReturnType<typeof mount> | null = null;
	let proposedConfigs: Array<{ tab: string; toolbarNodeOrder: string[] }>;

	const icon = (el: HTMLElement, name: string) => {
		el.setAttribute('data-icon', name);
		return {
			update(next: string) {
				el.setAttribute('data-icon', next);
			},
		};
	};

	const baseBarState: TransactionBarState = {
		visibility: 'visible',
		placement: 'above-search',
		moveKind: 'node',
		moveKindAvailable: false,
		originCount: 11,
		originLabels: ['lugar', 'cocina'],
		destinationCount: 1,
		destinationLabels: ['sitio'],
		rejection: null,
	};

	type RenderOverrides = Partial<
		Omit<
			ComponentProps<typeof NavbarFilters>,
			| 'providerId'
			| 'activeTab'
			| 'actionPort'
			| 'filtersSearch'
			| 'filtersSearchCategory'
			| 'icon'
			| 'sceneConfigPort'
		>
	>;

	const render = (props: RenderOverrides = {}) => {
		instance = mount(NavbarFilters, {
			target,
			props: {
				providerId: 'props',
				activeTab: 'props',
				filtersSearch: '',
				filtersSearchCategory: { files: 0, props: 0, tags: 0 },
				actionPort: {
					invoke: async () => true,
				} satisfies ScenePanelWidgetActionPort,
				sceneConfigPort: {
					read: () => ({
						viewMode: 'tree',
						interactionMode: 'select',
						visibleCells: [],
						sortState: normalizeExplorerSortState('props', null),
						stickyRows: true,
						compactFolders: false,
						indent: true,
						groupPreset: { kind: 'none', direction: 'asc' },
						hiddenGroupIds: [],
						sceneLabelMode: 'auto',
						autoRevealMode: 'auto',
						hiddenToolbarNodes: [],
						toolbarNodeIcons: {},
						toolbarCommandActions: [],
						createActionsPlacement: 'auto',
						tooltips: true,
						toolbarNodeOrder: [],
						groupMemberships: {},
					}),
					propose: (tab, next) => {
						proposedConfigs.push({
							tab,
							toolbarNodeOrder: next.toolbarNodeOrder ?? [],
						});
						return Promise.resolve();
					},
					readActiveScene: () => 'props',
					proposeActiveScene: () => Promise.resolve(),
					readFloatingToc: () => null,
					proposeFloatingToc: () => Promise.resolve(),
					setInstanceId: () => {},
					onInstanceChange: () => () => {},
					readInstanceRecord: () => null,
				} satisfies SceneConfigPort,
				icon,
				minimalStyle: true,
				...props,
			},
		});
		flushSync();
		return target;
	};

	const reset = () => {
		if (instance) {
			void unmount(instance);
			instance = null;
		}
		target.innerHTML = '';
	};

	beforeEach(() => {
		proposedConfigs = [];
		target = document.createElement('div');
		document.body.appendChild(target);
	});

	afterEach(() => {
		reset();
		target.remove();
	});

	it('sin transactionBar no se monta la barra en el DOM', () => {
		const el = render({ transactionBar: undefined });
		expect(el.querySelector('.vaultman-transaction-bar')).toBeNull();
	});

	it('en movil (above-search) monta la barra encima del searchbox', () => {
		const el = render({
			minimalStyle: true,
			transactionBar: {
				...baseBarState,
				placement: 'above-search',
			},
		});
		const bar = el.querySelector('.vaultman-transaction-bar');
		expect(bar).not.toBeNull();
		expect(bar?.classList.contains('vaultman-transaction-bar--above')).toBe(
			true,
		);
		expect(bar?.getAttribute('role')).toBe('status');
	});

	it('en desktop (below-search) monta la barra debajo del search row', () => {
		const el = render({
			minimalStyle: false,
			transactionBar: {
				...baseBarState,
				placement: 'below-search',
			},
		});
		const bar = el.querySelector('.vaultman-transaction-bar');
		expect(bar).not.toBeNull();
		expect(bar?.classList.contains('vaultman-transaction-bar--above')).toBe(
			false,
		);
		expect(bar?.getAttribute('role')).toBe('status');
	});

	it('previews a toolbar slot and commits it without leaving a drop mark', () => {
		const el = render();
		const bar = el.querySelector<HTMLElement>('.vaultman-filters-actions');
		const nodes = Array.from(
			bar?.querySelectorAll<HTMLElement>('[data-panel-widget-node-id]') ?? [],
		);
		expect(nodes.length).toBeGreaterThanOrEqual(3);
		if (!bar || nodes.length < 3) return;
		const rect = (left: number, width: number) =>
			({
				left,
				right: left + width,
				top: 0,
				bottom: 40,
				width,
				height: 40,
			}) as DOMRect;
		bar.getBoundingClientRect = () => rect(0, 500);
		nodes.forEach((node, index) => {
			node.getBoundingClientRect = () => rect(index * 50, 40);
		});
		const pointer = (type: string, clientX: number, clientY = 20) => {
			const event = new MouseEvent(type, {
				bubbles: true,
				button: 0,
				clientX,
				clientY,
			});
			Object.defineProperty(event, 'pointerType', { value: 'mouse' });
			return event;
		};
		const initialOrder = nodes.map((node) =>
			node.getAttribute('data-panel-widget-node-id')?.split(':').at(-1),
		);
		nodes[0].dispatchEvent(pointer('pointerdown', 20));
		window.dispatchEvent(pointer('pointermove', 110));
		flushSync();
		const marker = bar.querySelector<HTMLElement>(
			'.vaultman-toolbar-drop-marker',
		);
		expect(marker).not.toBeNull();
		expect(marker?.style.order).toBe('2');
		expect(Number(nodes[0].style.order)).toBeGreaterThan(
			Number(nodes[1].style.order),
		);

		window.dispatchEvent(pointer('pointerup', 110));
		flushSync();
		expect(proposedConfigs.at(-1)).toMatchObject({
			tab: 'props',
			toolbarNodeOrder: [
				initialOrder[1],
				initialOrder[0],
				...initialOrder.slice(2),
			],
		});
		expect(nodes[0].classList.contains('drag-ghost-hidden')).toBe(false);
		expect(bar.querySelector('.vaultman-toolbar-drop-marker')).toBeNull();
		expect(document.body.classList.contains('is-grabbing')).toBe(false);

		nodes[0].dispatchEvent(pointer('pointerdown', 20));
		window.dispatchEvent(pointer('pointermove', 110));
		window.dispatchEvent(pointer('pointermove', 110, 100));
		flushSync();
		expect(bar.querySelector('.vaultman-toolbar-drop-marker')).toBeNull();
		window.dispatchEvent(pointer('pointerup', 110, 100));
		flushSync();
		expect(proposedConfigs).toHaveLength(1);
		expect(document.body.classList.contains('is-grabbing')).toBe(false);
	});
});
