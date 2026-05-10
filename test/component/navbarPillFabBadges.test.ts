import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import PrimitiveFab from '../../src/components/primitives/PrimitiveFab.svelte';
import type { FabDef } from '../../src/types/typePrimitives';

describe('PrimitiveFab count badges', () => {
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

	it('shows queue and active filter counts only on matching FAB roles', () => {
		const queueFab: FabDef = {
			icon: 'lucide-list-checks',
			label: 'Queue',
			action: vi.fn(),
			badgeKind: 'queue',
		};
		const filtersFab: FabDef = {
			icon: 'lucide-sparkles',
			label: 'Active filters',
			action: vi.fn(),
			badgeKind: 'filters',
		};

		app = mount(PrimitiveFab as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				fab: queueFab,
				side: 'left',
				queuedCount: 4,
				filterRuleCount: 2,
			},
		});
		flushSync();
		expect(target.querySelector('[data-vm-badge-kind="queue"]')?.textContent).toBe('4');
		void unmount(app);

		target.innerHTML = '';
		app = mount(PrimitiveFab as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				fab: filtersFab,
				side: 'right',
				queuedCount: 4,
				filterRuleCount: 2,
			},
		});
		flushSync();
		expect(target.querySelector('[data-vm-badge-kind="filters"]')?.textContent).toBe('2');
	});

	it('does not attach queue or filter counts to unrelated FABs', () => {
		app = mount(PrimitiveFab as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				fab: { icon: 'lucide-settings', label: 'Settings', action: vi.fn() },
				side: 'right',
				queuedCount: 4,
				filterRuleCount: 2,
			},
		});
		flushSync();

		expect(target.querySelectorAll('.vm-fab-badge')).toHaveLength(0);
	});
});
