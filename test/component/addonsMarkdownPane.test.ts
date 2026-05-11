import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { flushSync, mount, tick, unmount, type Component } from 'svelte';
import AddonsMarkdownPane from '../../src/components/addons/AddonsMarkdownPane.svelte';
import { AddonsIslandService } from '../../src/services/serviceAddonsIsland.svelte';

describe('AddonsMarkdownPane', () => {
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

	it('renders the stats pane by default', () => {
		const service = new AddonsIslandService();
		app = mount(AddonsMarkdownPane as unknown as Component<Record<string, unknown>>, {
			target: host,
			props: { service, statsRenderer: () => 'STATS' },
		});
		flushSync();

		expect(host.textContent).toContain('STATS');
	});

	it('renders markdown content when a note path is opened', async () => {
		const service = new AddonsIslandService();
		let renderedFor: string | null = null;
		app = mount(AddonsMarkdownPane as unknown as Component<Record<string, unknown>>, {
			target: host,
			props: {
				service,
				statsRenderer: () => 'STATS',
				markdownRenderer: (path: string, mountPoint: HTMLElement) => {
					renderedFor = path;
					mountPoint.textContent = `MD:${path}`;
				},
			},
		});
		flushSync();

		service.openNote('Reference.md');
		await tick();
		flushSync();

		expect(renderedFor).toBe('Reference.md');
		expect(host.textContent).toContain('MD:Reference.md');
	});
});
