import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import NavbarFilters from '../../src/components/layout/navbarFilters.svelte';
import type { TransactionBarState } from '../../src/logic/logicTransactionBarState';

if (typeof globalThis.ResizeObserver === 'undefined') {
	class ResizeObserverMock {
		observe() {}
		unobserve() {}
		disconnect() {}
	}
	globalThis.ResizeObserver = ResizeObserverMock as any;
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

	const render = (props: Record<string, unknown> = {}) => {
		instance = mount(NavbarFilters, {
			target,
			props: {
				activeTab: 'props',
				actionPort: { invoke: () => Promise.resolve() } as any,
				sceneConfigPort: {
					read: () => ({
						viewMode: 'tree',
						interactionMode: 'select',
						visibleCells: [],
						sortState: { field: 'name', direction: 'asc' },
					}),
					propose: () => Promise.resolve(),
					readActiveScene: () => 'props',
					proposeActiveScene: () => Promise.resolve(),
					setInstanceId: () => {},
					onInstanceChange: () => () => {},
				} as any,
				icon,
				minimalStyle: true,
				...props,
			} as any,
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
			showSearchInput: true,
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
