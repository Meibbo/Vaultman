import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import NavbarTabs from '../../src/components/layout/navbarTabs.svelte';
import { FTabs } from '../../src/types/typeTab';

describe('NavbarTabs', () => {
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

	it('keeps disabled faint tabs visible without switching active tab', () => {
		app = mount(NavbarTabs as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				tabs: FTabs,
				active: 'files',
				disabledTabIds: ['props', 'tags', 'content'],
				faintTabIds: ['props', 'tags', 'content'],
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();

		const propsTab = target.querySelector<HTMLElement>('[aria-label="Props"]');
		const filesTab = target.querySelector<HTMLElement>('[aria-label="Files"]');

		expect(propsTab).toBeTruthy();
		expect(filesTab).toBeTruthy();
		expect(propsTab?.getAttribute('aria-disabled')).toBe('true');
		expect(propsTab?.classList.contains('is-disabled')).toBe(true);
		expect(propsTab?.classList.contains('is-faint')).toBe(true);
		expect(filesTab?.classList.contains('is-active')).toBe(true);

		propsTab!.click();
		flushSync();

		expect(filesTab?.classList.contains('is-active')).toBe(true);
		expect(propsTab?.classList.contains('is-active')).toBe(false);
	});

	it('renders direct labels with configurable label placement', () => {
		const onSelect = vi.fn();

		app = mount(NavbarTabs as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				tabs: [{ id: 'filters', icon: 'lucide-filter', label: 'Filters' }],
				active: 'ops',
				showLabels: true,
				labelPosition: 'bottom',
				onSelect,
			},
		});
		flushSync();

		const bar = target.querySelector('.vm-tab-bar');
		const tab = target.querySelector<HTMLElement>('[aria-label="Filters"]');

		expect(bar?.classList.contains('label-bottom')).toBe(true);
		expect(tab?.textContent).toContain('Filters');
		tab!.click();
		flushSync();

		expect(onSelect).toHaveBeenCalledWith('filters');
		expect(tab?.classList.contains('is-active')).toBe(true);
	});

	it('marks externally mounted tabs without making them locally active', () => {
		const onSelect = vi.fn();

		app = mount(NavbarTabs as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				tabs: [{ id: 'files', icon: 'lucide-files', label: 'Files' }],
				active: '',
				externalTabIds: ['files'],
				onSelect,
			},
		});
		flushSync();

		const tab = target.querySelector<HTMLElement>('[aria-label="Files"]');
		expect(tab?.classList.contains('is-external-mounted')).toBe(true);
		expect(tab?.getAttribute('data-external-mounted')).toBe('true');
		expect(tab?.classList.contains('is-active')).toBe(false);

		tab!.click();
		flushSync();

		expect(onSelect).toHaveBeenCalledWith('files');
		expect(tab?.classList.contains('is-active')).toBe(false);
	});
});
