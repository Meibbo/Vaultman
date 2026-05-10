import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import PrimitiveFab from '../../src/components/primitives/PrimitiveFab.svelte';
import type { FabDef } from '../../src/types/typePrimitives';

describe('PrimitiveFab active-filters click weights', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		vi.useFakeTimers();
		target = document.createElement('div');
		document.body.appendChild(target);
	});

	afterEach(() => {
		if (app) {
			void unmount(app);
			app = null;
		}
		target.remove();
		vi.useRealTimers();
	});

	function mountFab(fab: FabDef, mouseGestureConfig?: unknown): HTMLDivElement {
		app = mount(PrimitiveFab as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				fab,
				side: 'right',
				filterRuleCount: 3,
				mouseGestureConfig,
			},
		});
		flushSync();
		const el = target.querySelector<HTMLDivElement>('.vm-nav-fab');
		expect(el).toBeTruthy();
		return el!;
	}

	it('single click invokes the toggle action only after the debounce window', () => {
		const action = vi.fn();
		const onDoubleClick = vi.fn();
		const fab = mountFab({
			icon: 'lucide-sparkles',
			label: 'Active filters',
			action,
			onDoubleClick,
			badgeKind: 'filters',
		});

		fab.click();
		expect(action).not.toHaveBeenCalled();
		vi.advanceTimersByTime(260);
		expect(action).toHaveBeenCalledTimes(1);
		expect(onDoubleClick).not.toHaveBeenCalled();
	});

	it('double click within 250ms calls onDoubleClick and skips the single action', () => {
		const action = vi.fn();
		const onDoubleClick = vi.fn();
		const fab = mountFab({
			icon: 'lucide-sparkles',
			label: 'Active filters',
			action,
			onDoubleClick,
			badgeKind: 'filters',
		});

		fab.click();
		vi.advanceTimersByTime(100);
		fab.click();
		vi.advanceTimersByTime(300);
		expect(onDoubleClick).toHaveBeenCalledTimes(1);
		expect(action).not.toHaveBeenCalled();
	});

	it('alt click calls onTertiaryClick without waiting for the single-click debounce', () => {
		const action = vi.fn();
		const onDoubleClick = vi.fn();
		const onTertiaryClick = vi.fn();
		const fab = mountFab({
			icon: 'lucide-sparkles',
			label: 'Active filters',
			action,
			onDoubleClick,
			onTertiaryClick,
			badgeKind: 'filters',
		});

		fab.dispatchEvent(new MouseEvent('click', { bubbles: true, altKey: true }));
		vi.advanceTimersByTime(300);

		expect(onTertiaryClick).toHaveBeenCalledTimes(1);
		expect(action).not.toHaveBeenCalled();
		expect(onDoubleClick).not.toHaveBeenCalled();
	});

	it('middle click calls onTertiaryClick without waiting for the single-click debounce', () => {
		const action = vi.fn();
		const onDoubleClick = vi.fn();
		const onTertiaryClick = vi.fn();
		const fab = mountFab({
			icon: 'lucide-sparkles',
			label: 'Active filters',
			action,
			onDoubleClick,
			onTertiaryClick,
			badgeKind: 'filters',
		});

		fab.dispatchEvent(new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 1 }));
		vi.advanceTimersByTime(300);

		expect(onTertiaryClick).toHaveBeenCalledTimes(1);
		expect(action).not.toHaveBeenCalled();
		expect(onDoubleClick).not.toHaveBeenCalled();
	});

	it('honours config that removes middle click from tertiary gestures', () => {
		const action = vi.fn();
		const onDoubleClick = vi.fn();
		const onTertiaryClick = vi.fn();
		const fab = mountFab(
			{
				icon: 'lucide-sparkles',
				label: 'Active filters',
				action,
				onDoubleClick,
				onTertiaryClick,
				badgeKind: 'filters',
			},
			{ tertiary: ['alt-click'] },
		);

		fab.dispatchEvent(new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 1 }));
		vi.advanceTimersByTime(300);

		expect(onTertiaryClick).not.toHaveBeenCalled();
		expect(action).not.toHaveBeenCalled();
		expect(onDoubleClick).not.toHaveBeenCalled();
	});
});
