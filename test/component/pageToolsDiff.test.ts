import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import PageTools from '../../src/components/pages/pageTools.svelte';
import { mockApp } from '../helpers/obsidian-mocks';
import { ThemeService } from '../../src/services/serviceTheme.svelte';
import { ViewService } from '../../src/services/serviceViews.svelte';
import type { VaultmanPlugin } from '../../src/main';

function makePlugin(): VaultmanPlugin {
	return {
		app: mockApp(),
		addChild: vi.fn(),
		removeChild: vi.fn(),
		settings: { contextMenuHideRules: [] },
		saveSettings: vi.fn(async () => undefined),
		contextMenuService: { registerAction: vi.fn(), openPanelMenu: vi.fn() },
		cssSnippetsIndex: noopIndex(),
		pluginsIndex: noopIndex(),
		operationsIndex: noopIndex(),
		activeFiltersIndex: noopIndex(),
		queueService: {
			transactions: new Map(),
			chains: new Map(),
			remove: vi.fn(),
			requestDelete: vi.fn(),
			on: vi.fn(() => vi.fn()),
		},
		filterService: { setSelectedFiles: vi.fn() },
		themeService: new ThemeService(),
		viewService: new ViewService(),
	} as unknown as VaultmanPlugin;
}

function noopIndex() {
	return {
		nodes: [],
		refresh: vi.fn(),
		subscribe: vi.fn(() => vi.fn()),
		byId: vi.fn(),
	};
}

describe('pageTools diff tab', () => {
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

	it('renders the diff navbar when the file diff tab is active', () => {
		app = mount(PageTools as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				plugin: makePlugin(),
				activeTab: 'file_diff',
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();

		const activePanel = target.querySelector('.vm-tab-content.is-active');
		expect(activePanel?.querySelector('.vm-viewdiff')).toBeTruthy();
		expect(activePanel?.querySelector('[data-vm-nav="next-change"]')).toBeTruthy();
	});
});
