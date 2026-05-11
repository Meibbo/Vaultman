import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import NavbarDock from '../../src/components/layout/navbarDock.svelte';
import type { FabDef } from '../../src/types/typePrimitives';

function baseProps(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		items: [
			{ id: 'props', icon: 'lucide-book-plus', label: 'Props' },
			{ id: 'files', icon: 'lucide-files', label: 'Files', dot: true },
		],
		active: 'props',
		leftFab: null,
		rightFab: null,
		navCollapsed: false,
		isReordering: false,
		reorderTargetIdx: -1,
		dockEl: null,
		filterRuleCount: 0,
		queuedCount: 0,
		bindNav: vi.fn(() => ({ destroy: vi.fn() })),
		onCollapsedNavClick: vi.fn(),
		...overrides,
	};
}

describe('NavbarDock', () => {
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

	it('renders generic dock items with labels hidden by default', () => {
		app = mount(NavbarDock as unknown as Component<Record<string, unknown>>, {
			target,
			props: baseProps(),
		});
		flushSync();

		expect(target.querySelector('.vm-nav-dock')).toBeTruthy();
		expect(target.querySelector('.vm-nav-dock-label')).toBeFalsy();
		expect(target.querySelector('[aria-label="Props"]')?.classList.contains('is-active')).toBe(true);
		expect(target.querySelector('.vm-nav-dot-badge')).toBeTruthy();
	});

	it('can place visible labels below dock icons and emit selection', () => {
		const onSelect = vi.fn();

		app = mount(NavbarDock as unknown as Component<Record<string, unknown>>, {
			target,
			props: baseProps({
				showLabels: true,
				labelPosition: 'bottom',
				onSelect,
			}),
		});
		flushSync();

		const dock = target.querySelector('.vm-nav-dock');
		const files = target.querySelector<HTMLElement>('[aria-label="Files"]');

		expect(dock?.classList.contains('label-bottom')).toBe(true);
		expect(files?.textContent).toContain('Files');
		files!.click();
		flushSync();

		expect(onSelect).toHaveBeenCalledWith('files');
		expect(files?.classList.contains('is-active')).toBe(true);
	});

	it('stays visually neutral when the active id is outside the visible dock items', () => {
		const onSelect = vi.fn();

		app = mount(NavbarDock as unknown as Component<Record<string, unknown>>, {
			target,
			props: baseProps({
				active: 'ops',
				onSelect,
			}),
		});
		flushSync();

		expect(target.querySelector('.vm-nav-dock-item.is-active')).toBeNull();

		target.querySelector<HTMLElement>('[aria-label="Files"]')!.click();
		flushSync();

		expect(onSelect).toHaveBeenCalledWith('files');
		expect(target.querySelector('[aria-label="Files"]')?.classList.contains('is-active')).toBe(
			true,
		);
	});

	it('keeps queue and filter count badges attached to matching FABs', () => {
		const leftFab: FabDef = {
			icon: 'lucide-list-checks',
			label: 'Queue',
			action: vi.fn(),
			badgeKind: 'queue',
		};
		const rightFab: FabDef = {
			icon: 'lucide-filter',
			label: 'Active filters',
			action: vi.fn(),
			badgeKind: 'filters',
		};

		app = mount(NavbarDock as unknown as Component<Record<string, unknown>>, {
			target,
			props: baseProps({
				leftFab,
				rightFab,
				queuedCount: 4,
				filterRuleCount: 2,
			}),
		});
		flushSync();

		expect(target.querySelector('[data-vm-badge-kind="queue"]')?.textContent).toBe('4');
		expect(target.querySelector('[data-vm-badge-kind="filters"]')?.textContent).toBe('2');
	});

	it('can render dock items inside a FAB-triggered drawer', () => {
		app = mount(NavbarDock as unknown as Component<Record<string, unknown>>, {
			target,
			props: baseProps({
				presentationMode: 'drawer',
				drawerDirection: 'up',
				drawerOpen: false,
			}),
		});
		flushSync();

		expect(target.querySelector('.vm-nav-drawer-host')).toBeTruthy();
		expect(target.querySelector('.vm-nav-dock')).toBeFalsy();

		target.querySelector<HTMLElement>('.vm-nav-drawer-trigger .vm-nav-fab')!.click();
		flushSync();

		expect(target.querySelector('.vm-nav-dock')).toBeTruthy();
		expect(target.querySelector('.vm-nav-drawer-panel')?.classList.contains('direction-up')).toBe(
			true,
		);
	});

	it('marks externally mounted dock items without making them locally active', () => {
		const onSelect = vi.fn();

		app = mount(NavbarDock as unknown as Component<Record<string, unknown>>, {
			target,
			props: baseProps({
				active: '',
				externalTabIds: ['files'],
				onSelect,
			}),
		});
		flushSync();

		const files = target.querySelector<HTMLElement>('[aria-label="Files"]');
		expect(files?.classList.contains('is-external-mounted')).toBe(true);
		expect(files?.getAttribute('data-external-mounted')).toBe('true');
		expect(files?.classList.contains('is-active')).toBe(false);

		files!.click();
		flushSync();

		expect(onSelect).toHaveBeenCalledWith('files');
		expect(files?.classList.contains('is-active')).toBe(false);
	});
});
