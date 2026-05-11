import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import NavbarTabs from '../../src/components/layout/navbarTabs.svelte';
import DetachedTabHost from '../../src/components/frame/DetachedTabHost.svelte';
import { FTabs } from '../../src/types/typeTab';
import {
	ALL_TAB_IDS,
	DETACHABLE,
	innerFromTabId,
	tabIdFromInner,
	viewTypeFor,
} from '../../src/registry/tabRegistry';
import { ThemeService } from '../../src/services/serviceTheme.svelte';
import type { VaultmanPlugin } from '../../src/main';
import { installObsidianDomPolyfill } from '../helpers/dom-obsidian-polyfill';
import { mockApp, mockTFile } from '../helpers/obsidian-mocks';

function noopIndex() {
	return {
		nodes: [],
		refresh: vi.fn(),
		subscribe: vi.fn(() => vi.fn()),
		byId: vi.fn(),
	};
}

async function makePlugin(): Promise<VaultmanPlugin> {
	const activeFile = mockTFile('Notes/outline.md');
	const app = mockApp({
		files: [activeFile],
		adapterFiles: new Map([
			[
				activeFile.path,
				['# Project Alpha', '## Current Thread', '- [ ] Wire outline tab ^todo-block'].join('\n'),
			],
		]),
	});
	app.workspace.getActiveFile = () => activeFile;
	(app.metadataCache as unknown as { getTags: () => Record<string, number> }).getTags = vi.fn(
		() => ({}),
	);

	const themeService = new ThemeService();

	return {
		app,
		themeService,
		settings: {
			filtersShowTabLabels: true,
			explorerOperationScope: 'filtered',
			explorerFilesShowHidden: false,
			contextMenuHideRules: [],
		},
		saveSettings: vi.fn(),
		addChild: vi.fn(),
		removeChild: vi.fn(),
		filterService: {
			filteredFiles: app.vault.getMarkdownFiles(),
			selectedFiles: [],
			setSelectedFiles: vi.fn(),
			setFilter: vi.fn(),
			setSearchFilter: vi.fn(),
			clearSearchFilter: vi.fn(),
			subscribe: vi.fn(() => vi.fn()),
		},
		filesIndex: noopIndex(),
		tagsIndex: noopIndex(),
		propsIndex: noopIndex(),
		contentIndex: Object.assign(noopIndex(), { setQuery: vi.fn() }),
		operationsIndex: noopIndex(),
		activeFiltersIndex: noopIndex(),
		cssSnippetsIndex: noopIndex(),
		pluginsIndex: noopIndex(),
		queueService: {
			add: vi.fn(),
			remove: vi.fn(),
			requestDelete: vi.fn(),
			on: vi.fn(() => vi.fn()),
		},
		contextMenuService: {
			registerAction: vi.fn(),
			openPanelMenu: vi.fn(),
		},
		decorationManager: {
			decorate: vi.fn(() => ({ icons: [], badges: [], highlights: [] })),
			subscribe: vi.fn(() => vi.fn()),
		},
		viewService: {
			getModel: vi.fn(({ nodes }: { nodes: Array<{ id: string; label: string }> }) => ({
				rows: nodes.map((node) => ({
					id: node.id,
					label: node.label,
					icon: 'lucide-file',
					layers: [],
				})),
				columns: [],
				groups: [],
				selection: { ids: new Set() },
				focus: { id: null },
				sort: { id: 'manual', direction: 'asc' },
				search: { query: '' },
				virtualization: { rowHeight: 32, overscan: 5 },
				capabilities: {},
			})),
			clearSelection: vi.fn(),
			select: vi.fn(),
			setFocused: vi.fn(),
		},
		iconicService: {
			getIcon: vi.fn(),
			getTagIcon: vi.fn(),
		},
	} as unknown as VaultmanPlugin;
}

describe('tabOutlines registration', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		installObsidianDomPolyfill();
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

	it('registers the outline filter tab and renders its navbar label', () => {
		expect(FTabs.map((tab) => tab.id)).toContain('outline');

		app = mount(NavbarTabs as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				tabs: FTabs,
				active: 'outline',
				showLabels: true,
			},
		});
		flushSync();

		const tab = target.querySelector<HTMLElement>('[data-tab="outline"]');
		expect(tab).toBeTruthy();
		expect(tab?.getAttribute('aria-label')).toBe('Outline');
		expect(tab?.textContent).toContain('Outline');
		expect(tab?.classList.contains('is-active')).toBe(true);
	});

	it('maps the outline inner id to the canonical detached tab id and back', () => {
		expect(tabIdFromInner('outline')).toBe('explorer-outline');
		expect(innerFromTabId('explorer-outline')).toBe('outline');
		expect(viewTypeFor('explorer-outline')).toBe('vaultman-tab-explorer-outline');
		expect(ALL_TAB_IDS).toContain('explorer-outline');
		expect(DETACHABLE.has('explorer-outline')).toBe(true);
	});

	it('mounts outline content in the detached host without the frame dock', async () => {
		app = mount(DetachedTabHost as unknown as Component<Record<string, unknown>>, {
			target,
			props: { plugin: await makePlugin(), tabId: 'explorer-outline' },
		});
		await Promise.resolve();
		await Promise.resolve();
		await Promise.resolve();
		flushSync();

		expect(target.querySelector('.vm-detached-tab-host')).toBeTruthy();
		expect(target.querySelector('.vm-outline-explorer')).toBeTruthy();
		expect(target.textContent).toContain('Project Alpha');
		expect(target.textContent).toContain('Wire outline tab');
		expect(target.querySelector('.vm-bottom-nav')).toBeFalsy();
	});
});
