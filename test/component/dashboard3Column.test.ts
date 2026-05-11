import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRawSnippet, flushSync, mount, unmount, type Component } from 'svelte';
import Dashboard3Column from '../../src/components/dashboard/Dashboard3Column.svelte';
import { ThemeService } from '../../src/services/serviceTheme.svelte';

const filters = createRawSnippet(() => ({ render: () => '<span>Filters</span>' }));
const explorer = createRawSnippet(() => ({ render: () => '<span>Explorer</span>' }));
const addons = createRawSnippet(() => ({ render: () => '<span>Add-ons</span>' }));

describe('Dashboard3Column', () => {
	let host: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		host = document.createElement('div');
		document.body.appendChild(host);
	});

	afterEach(() => {
		if (app) void unmount(app);
		host.remove();
	});

	function render(enabled: boolean) {
		app = mount(Dashboard3Column as unknown as Component<Record<string, unknown>>, {
			target: host,
			props: {
				themeService: new ThemeService(),
				enabled,
				filters,
				explorer,
				addons,
			},
		});
		flushSync();
	}

	it('renders three named columns when enabled', () => {
		render(true);

		expect(host.querySelector('[data-vm-col="filters"]')).toBeTruthy();
		expect(host.querySelector('[data-vm-col="explorer"]')).toBeTruthy();
		expect(host.querySelector('[data-vm-col="addons"]')).toBeTruthy();
	});

	it('falls back to one explorer column when disabled', () => {
		render(false);

		expect(host.querySelectorAll('[data-vm-col]').length).toBe(1);
		expect(host.querySelector('[data-vm-col="single"]')?.textContent).toContain('Explorer');
	});
});
