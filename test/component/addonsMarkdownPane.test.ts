import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, tick, unmount, type Component as SvelteComponent } from 'svelte';
import { Component as ObsidianComponent, MarkdownRenderer } from 'obsidian';
import AddonsMarkdownPane from '../../src/components/addons/AddonsMarkdownPane.svelte';
import { AddonsIslandService } from '../../src/services/serviceAddonsIsland.svelte';
import { mockTFile, type App } from '../helpers/obsidian-mocks';

describe('AddonsMarkdownPane', () => {
	let host: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;

	async function flushComponentAsync(until?: () => boolean): Promise<void> {
		for (let i = 0; i < 10; i++) {
			await tick();
			await Promise.resolve();
			flushSync();
			if (until?.()) return;
		}
	}

	beforeEach(() => {
		host = document.createElement('div');
		document.body.appendChild(host);
	});

	afterEach(() => {
		if (app) void unmount(app);
		host.remove();
		vi.restoreAllMocks();
	});

	it('renders the stats pane by default', () => {
		const service = new AddonsIslandService();
		app = mount(AddonsMarkdownPane as unknown as SvelteComponent<Record<string, unknown>>, {
			target: host,
			props: { service, statsRenderer: () => 'STATS' },
		});
		flushSync();

		expect(host.textContent).toContain('STATS');
	});

	it('renders markdown content when a note path is opened', async () => {
		const service = new AddonsIslandService();
		let renderedFor: string | null = null;
		app = mount(AddonsMarkdownPane as unknown as SvelteComponent<Record<string, unknown>>, {
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

	it('renders a selected note through Obsidian MarkdownRenderer when no custom renderer is supplied', async () => {
		const service = new AddonsIslandService();
		const note = mockTFile('Notes/Reference.md');
		const appLike = {
			vault: {
				getAbstractFileByPath: (path: string) => (path === note.path ? note : null),
				getFileByPath: (path: string) => (path === note.path ? note : null),
				cachedRead: async () => '# Reference\n\nRendered body',
			},
		} as unknown as App;
		const renderSpy = vi.spyOn(MarkdownRenderer, 'render');

		app = mount(AddonsMarkdownPane as unknown as SvelteComponent<Record<string, unknown>>, {
			target: host,
			props: {
				service,
				statsRenderer: () => 'STATS',
				app: appLike,
			},
		});
		flushSync();

		service.openNote(note.path);
		await flushComponentAsync(() => renderSpy.mock.calls.length > 0);

		expect(renderSpy).toHaveBeenCalledWith(
			appLike,
			'# Reference\n\nRendered body',
			expect.any(HTMLElement),
			note.path,
			expect.any(ObsidianComponent),
		);
		expect(host.textContent).toContain('Rendered body');
	});

	it('launches the Quick Switcher and opens the active note after file-open', async () => {
		const service = new AddonsIslandService();
		const note = mockTFile('Notes/Quick.md');
		let activeFile = null as typeof note | null;
		let fileOpenHandler: ((file: typeof note) => void) | null = null;
		const commandSpy = vi.fn(() => true);
		const appLike = {
			commands: { executeCommandById: commandSpy },
			workspace: {
				getActiveFile: () => activeFile,
				on: (name: string, cb: (file: typeof note) => void) => {
					if (name === 'file-open') fileOpenHandler = cb;
					return { off: vi.fn() };
				},
			},
			vault: {
				getAbstractFileByPath: (path: string) => (path === note.path ? note : null),
				getFileByPath: (path: string) => (path === note.path ? note : null),
				cachedRead: async () => 'Quick body',
			},
		} as unknown as App;

		app = mount(AddonsMarkdownPane as unknown as SvelteComponent<Record<string, unknown>>, {
			target: host,
			props: {
				service,
				statsRenderer: () => 'STATS',
				app: appLike,
			},
		});
		flushSync();

		host
			.querySelector<HTMLButtonElement>('[data-vm-addon-action="open-note"]')
			?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		for (let i = 0; i < 5 && !fileOpenHandler; i++) {
			await Promise.resolve();
		}
		expect(fileOpenHandler).toBeTruthy();

		activeFile = note;
		fileOpenHandler?.(note);
		await flushComponentAsync(() => host.textContent?.includes('Quick body') ?? false);

		expect(commandSpy).toHaveBeenCalledWith('switcher:open');
		expect(service.notePath).toBe(note.path);
		expect(host.textContent).toContain('Quick body');
	});
});
