import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import PageTools from '../../src/components/pages/pageTools.svelte';
import { TTabs } from '../../src/types/typeTab';
import { mockApp } from '../helpers/obsidian-mocks';
import { ViewService } from '../../src/services/serviceViews.svelte';
import type { VaultmanPlugin } from '../../src/main';

function makePlugin(): VaultmanPlugin {
	const app = Object.assign(mockApp(), {
		plugins: {
			enablePluginAndSave: vi.fn(async () => undefined),
			disablePluginAndSave: vi.fn(async () => undefined),
		},
	});
	let pluginNodes = [
		{ id: 'calendar', pluginId: 'calendar', name: 'Calendar', enabled: false, loaded: false },
	];
	const pluginSubscribers = new Set<() => void>();
	const refreshPlugins = vi.fn(async () => {
		pluginNodes = pluginNodes.map((node) =>
			node.id === 'calendar' ? { ...node, enabled: true, loaded: true } : node,
		);
		for (const cb of pluginSubscribers) cb();
	});
	return {
		app,
		manifest: { id: 'vaultman' },
		addChild: vi.fn(),
		removeChild: vi.fn(),
		settings: { contextMenuHideRules: [] },
		saveSettings: vi.fn(async () => undefined),
		contextMenuService: { registerAction: vi.fn(), openPanelMenu: vi.fn() },
		cssSnippetsIndex: {
			nodes: [],
			refresh: vi.fn(),
			subscribe: vi.fn(() => vi.fn()),
			byId: vi.fn(),
		},
		pluginsIndex: {
			get nodes() {
				return pluginNodes;
			},
			refresh: refreshPlugins,
			subscribe: vi.fn((cb: () => void) => {
				pluginSubscribers.add(cb);
				return () => {
					pluginSubscribers.delete(cb);
				};
			}),
			byId: vi.fn(),
		},
		operationsIndex: { nodes: [], subscribe: vi.fn(() => vi.fn()) },
		activeFiltersIndex: { nodes: [], subscribe: vi.fn(() => vi.fn()) },
		queueService: { remove: vi.fn(), requestDelete: vi.fn(), on: vi.fn(() => vi.fn()) },
		filterService: { setSelectedFiles: vi.fn() },
		viewService: new ViewService(),
	} as unknown as VaultmanPlugin;
}

describe('pageTools plugins tab', () => {
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

	it('declares a plugins tab in the Tools tab config', () => {
		expect(TTabs.some((tab) => tab.id === 'plugins')).toBe(true);
	});

	it('renders plugins explorer content when the plugins tab is selected', () => {
		app = mount(PageTools as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				plugin: makePlugin(),
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();

		const pluginsTab = target.querySelector<HTMLElement>('[data-tab="plugins"]');
		expect(pluginsTab).toBeTruthy();
		pluginsTab!.click();
		flushSync();

		const panel = target.querySelector('.vm-plugins-tab-content');
		expect(panel).toBeTruthy();
		expect(panel?.classList.contains('vm-tab-panel-fill')).toBe(true);
		expect(target.textContent).toContain('Calendar');
	});

	it('updates the plugins row after toggling enabled state', async () => {
		app = mount(PageTools as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				plugin: makePlugin(),
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();

		target.querySelector<HTMLElement>('[data-tab="plugins"]')!.click();
		flushSync();

		const toggle = [...target.querySelectorAll<HTMLElement>('.vm-badge')].find(
			(el) => el.getAttribute('aria-label') === 'Enable community plugin "Calendar"',
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
