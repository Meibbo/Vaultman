import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import PrimitiveFab from '../../src/components/primitives/PrimitiveFab.svelte';
import type { FabDef } from '../../src/types/typePrimitives';

describe('PrimitiveFab', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		target = document.createElement('div');
		document.body.appendChild(target);
	});

	afterEach(() => {
		if (app) {
			void unmount(app);
			app = null;
		}
		target.remove();
	});

	it('renders a FAB with its matching queue badge count', () => {
		const fab: FabDef = {
			icon: 'lucide-list-checks',
			label: 'Queue',
			action: vi.fn(),
			badgeKind: 'queue',
		};

		app = mount(PrimitiveFab as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				fab,
				side: 'left',
				queuedCount: 7,
				filterRuleCount: 3,
			},
		});
		flushSync();

		expect(target.querySelector('.vm-nav-fab')).toBeTruthy();
		expect(target.querySelector('[data-vm-badge-kind="queue"]')?.textContent).toBe('7');
		expect(target.querySelector('[data-vm-badge-kind="filters"]')).toBeFalsy();
	});

	it('keeps unrelated FABs badge-free', () => {
		app = mount(PrimitiveFab as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				fab: { icon: 'lucide-settings', label: 'Settings', action: vi.fn() },
				side: 'right',
				queuedCount: 7,
				filterRuleCount: 3,
			},
		});
		flushSync();

		expect(target.querySelectorAll('.vm-fab-badge')).toHaveLength(0);
	});
});
