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

	type RenderOverrides = Partial<Omit<
		ComponentProps<typeof NavbarFilters>,
		'providerId' | 'activeTab' | 'actionPort' | 'filtersSearch' |
		'filtersSearchCategory' | 'icon' | 'sceneConfigPort'
	>>;

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
					}),
					propose: () => Promise.resolve(),
					readActiveScene: () => 'props',
					proposeActiveScene: () => Promise.resolve(),
					readFloatingToc: () => null,
					proposeFloatingToc: () => Promise.resolve(),
					setInstanceId: () => {},
					onInstanceChange: () => () => {},
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
		expect(bar?.classList.contains('vaultman-transaction-bar--above')).toBe(true);
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
		expect(bar?.classList.contains('vaultman-transaction-bar--above')).toBe(false);
		expect(bar?.getAttribute('role')).toBe('status');
	});
});
