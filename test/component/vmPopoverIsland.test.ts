import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRawSnippet, flushSync, mount, unmount, type Component } from 'svelte';
import vmPopover from '../../src/components/overlays/vmPopover.svelte';

const popoverBody = createRawSnippet(() => ({
	render: () => '<span data-vm-popover-body>Find body</span>',
}));

describe('vmPopover', () => {
	let host: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		host = document.createElement('div');
		document.body.appendChild(host);
		const root = document.createElement('div');
		root.classList.add('vm-root');
		host.appendChild(root);
	});

	afterEach(() => {
		if (app) void unmount(app);
		host.remove();
	});

	it('renders open popover content into the local .vm-root portal target', () => {
		app = mount(vmPopover as unknown as Component<Record<string, unknown>>, {
			target: host,
			props: { open: true, triggerLabel: 'Find', children: popoverBody },
		});
		flushSync();

		const root = host.querySelector('.vm-root');
		expect(root?.querySelector('[data-vm-popover-body]')?.textContent).toBe('Find body');
	});

	it('opens when the trigger is clicked', () => {
		app = mount(vmPopover as unknown as Component<Record<string, unknown>>, {
			target: host,
			props: { open: false, triggerLabel: 'Find', children: popoverBody },
		});
		flushSync();

		host.querySelector<HTMLButtonElement>('.vm-btn-find')?.click();
		flushSync();

		expect(host.querySelector('[data-vm-popover-body]')).toBeTruthy();
	});
});
