import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import PageTools from '../../src/components/pages/pageTools.svelte';
import { TTabs } from '../../src/types/typeTab';
import { mockApp } from '../helpers/obsidian-mocks';
import { ViewService } from '../../src/services/serviceViews.svelte';
import type { VaultmanPlugin } from '../../src/main';

function makePlugin(): VaultmanPlugin {
	const app = mockApp() as ReturnType<typeof mockApp> & {
		customCss: {
			setCssEnabledStatus: ReturnType<typeof vi.fn>;
			requestLoadSnippets: ReturnType<typeof vi.fn>;
		};
	};
	let snippetNodes = [{ id: 'cards', name: 'cards', enabled: false }];
	const snippetSubscribers = new Set<() => void>();
	app.customCss = {
		setCssEnabledStatus: vi.fn(async () => undefined),
		requestLoadSnippets: vi.fn(async () => undefined),
	};
	const refreshSnippets = vi.fn(async () => {
		snippetNodes = snippetNodes.map((node) =>
			node.id === 'cards' ? { ...node, enabled: true } : node,
		);
		for (const cb of snippetSubscribers) cb();
	});
	return {
		app,
		addChild: vi.fn(),
		removeChild: vi.fn(),
		settings: { contextMenuHideRules: [] },
		saveSettings: vi.fn(async () => undefined),
		contextMenuService: { registerAction: vi.fn(), openPanelMenu: vi.fn() },
		cssSnippetsIndex: {
			get nodes() {
				return snippetNodes;
			},
			refresh: refreshSnippets,
			subscribe: vi.fn((cb: () => void) => {
				snippetSubscribers.add(cb);
				return () => {
					snippetSubscribers.delete(cb);
				};
			}),
			byId: vi.fn(),
		},
		pluginsIndex: {
			nodes: [],
			refresh: vi.fn(),
			subscribe: vi.fn(() => vi.fn()),
			byId: vi.fn(),
		},
		operationsIndex: { nodes: [], subscribe: vi.fn(() => vi.fn()) },
		activeFiltersIndex: { nodes: [], subscribe: vi.fn(() => vi.fn()) },
		queueService: { remove: vi.fn(), requestDelete: vi.fn(), on: vi.fn(() => vi.fn()) },
		filterService: { setSelectedFiles: vi.fn() },
		viewService: new ViewService(),
	} as unknown as VaultmanPlugin;
}

describe('pageTools snippets tab', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		target = document.createElement('div');
		document.body.appendChild(target);
		vi.stubGlobal(
			'ResizeObserver',
			class {
				observe(): void {}
				disconnect(): void {}
			},
		);
	});

	afterEach(() => {
		if (app) {
			void unmount(app);
			app = null;
		}
		target.remove();
		vi.unstubAllGlobals();
	});

	it('declares a snippets tab in the Tools tab config', () => {
		expect(TTabs.some((tab) => tab.id === 'snippets')).toBe(true);
	});

	it('renders snippets explorer content when the snippets tab is selected', () => {
		app = mount(PageTools as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				plugin: makePlugin(),
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();

		const snippetsTab = target.querySelector<HTMLElement>('[data-tab="snippets"]');
		expect(snippetsTab).toBeTruthy();
		snippetsTab!.click();
		flushSync();

		const panel = target.querySelector('.vm-snippets-tab-content');
		expect(panel).toBeTruthy();
		expect(panel?.classList.contains('vm-tab-panel-fill')).toBe(true);
		expect(target.textContent).toContain('cards');
	});

	it('updates the snippets row after toggling enabled state', async () => {
		app = mount(PageTools as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				plugin: makePlugin(),
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();

		target.querySelector<HTMLElement>('[data-tab="snippets"]')!.click();
		flushSync();

		const toggle = [...target.querySelectorAll<HTMLElement>('.vm-badge')].find(
			(el) => el.getAttribute('aria-label') === 'Enable CSS snippet "cards"',
		);
		expect(toggle).toBeTruthy();
		toggle!.click();
		await Promise.resolve();
		await Promise.resolve();
		await Promise.resolve();
		flushSync();

		expect(target.textContent).toContain('on');
	});
});
