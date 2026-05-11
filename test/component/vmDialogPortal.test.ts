import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import vmDialog from '../../src/components/overlays/vmDialog.svelte';

describe('vmDialog', () => {
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

	it('renders dialog content into the local .vm-root portal target', () => {
		app = mount(vmDialog as unknown as Component<Record<string, unknown>>, {
			target: host,
			props: { open: true, title: 'Review', description: 'Inspect changes' },
		});
		flushSync();

		const root = host.querySelector('.vm-root');
		expect(root?.querySelector('[role="dialog"]')).toBeTruthy();
		expect(root?.textContent).toContain('Review');
	});

	it('marks the dialog closed when the close control is clicked', () => {
		app = mount(vmDialog as unknown as Component<Record<string, unknown>>, {
			target: host,
			props: { open: true, title: 'Review', description: 'Inspect changes' },
		});
		flushSync();

		host.querySelector<HTMLButtonElement>('.vm-dialog-close')?.click();
		flushSync();

		expect(host.querySelector('[role="dialog"]')?.getAttribute('data-state')).toBe('closed');
	});
});
