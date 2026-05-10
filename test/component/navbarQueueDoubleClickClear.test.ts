import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import PrimitiveFab from '../../src/components/primitives/PrimitiveFab.svelte';
import type { FabDef } from '../../src/types/typePrimitives';

describe('PrimitiveFab queue badge click weights', () => {
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

	function mountQueueFab(fab: FabDef): HTMLDivElement {
		app = mount(PrimitiveFab as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				fab,
				side: 'left',
				queuedCount: 3,
			},
		});
		flushSync();
		const el = target.querySelector<HTMLDivElement>('.vm-nav-fab');
		expect(el).toBeTruthy();
		return el!;
	}

	it('single click opens the queue popup', () => {
		const action = vi.fn();
		const onDoubleClick = vi.fn();
		const fab = mountQueueFab({
			icon: 'lucide-list-checks',
			label: 'Queue',
			action,
			onDoubleClick,
			badgeKind: 'queue',
		});

		fab.click();
		vi.advanceTimersByTime(260);
		expect(action).toHaveBeenCalledTimes(1);
		expect(onDoubleClick).not.toHaveBeenCalled();
	});

	it('double click runs the secondary queue action without invoking the popup action', () => {
		const action = vi.fn();
		const onDoubleClick = vi.fn();
		const fab = mountQueueFab({
			icon: 'lucide-list-checks',
			label: 'Queue',
			action,
			onDoubleClick,
			badgeKind: 'queue',
		});

		fab.click();
		vi.advanceTimersByTime(80);
		fab.click();
		vi.advanceTimersByTime(300);
		expect(onDoubleClick).toHaveBeenCalledTimes(1);
		expect(action).not.toHaveBeenCalled();
	});

	it('alt click runs the tertiary queue action immediately', () => {
		const action = vi.fn();
		const onDoubleClick = vi.fn();
		const onTertiaryClick = vi.fn();
		const fab = mountQueueFab({
			icon: 'lucide-list-checks',
			label: 'Queue',
			action,
			onDoubleClick,
			onTertiaryClick,
			badgeKind: 'queue',
		});

		fab.dispatchEvent(new MouseEvent('click', { bubbles: true, altKey: true }));
		vi.advanceTimersByTime(300);

		expect(onTertiaryClick).toHaveBeenCalledTimes(1);
		expect(action).not.toHaveBeenCalled();
		expect(onDoubleClick).not.toHaveBeenCalled();
	});

	it('middle click runs the tertiary queue action immediately', () => {
		const action = vi.fn();
		const onDoubleClick = vi.fn();
		const onTertiaryClick = vi.fn();
		const fab = mountQueueFab({
			icon: 'lucide-list-checks',
			label: 'Queue',
			action,
			onDoubleClick,
			onTertiaryClick,
			badgeKind: 'queue',
		});

		fab.dispatchEvent(new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 1 }));
		vi.advanceTimersByTime(300);

		expect(onTertiaryClick).toHaveBeenCalledTimes(1);
		expect(action).not.toHaveBeenCalled();
		expect(onDoubleClick).not.toHaveBeenCalled();
	});
});
