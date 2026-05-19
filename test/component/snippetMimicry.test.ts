import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { flushSync, mount, unmount, type Component } from 'svelte';
import PanelExplorer from '../../src/components/containers/panelExplorer.svelte';
import { PRESET_VAULTMAN } from '../../src/config/themePresetsBuiltin';
import { ThemeService } from '../../src/services/serviceTheme.svelte';
import type { VaultmanPlugin } from '../../src/main';
import type { ExplorerProvider, ExplorerViewMode } from '../../src/types/typeExplorer';
import type { PropMeta, TreeNode } from '../../src/types/typeNode';

const fixture = readFileSync(resolve('test/fixtures/snippets/vm-snippet-smoke.css'), 'utf8');

function themeService(): ThemeService {
	const theme = new ThemeService();
	theme.registerCustomPreset({
		...PRESET_VAULTMAN,
		source: 'custom',
		id: 'snippet-native',
		displayName: 'Snippet native',
		useNativeDom: true,
	});
	theme.setPreset('snippet-native');
	return theme;
}

function plugin(): VaultmanPlugin {
	return {
		app: {},
		settings: {},
		propertyIndex: { fileCount: 0 },
		operationsIndex: { nodes: [], subscribe: vi.fn(() => vi.fn()) },
		activeFiltersIndex: { subscribe: vi.fn(() => vi.fn()) },
		queueService: { remove: vi.fn(), requestDelete: vi.fn() },
		filterService: { setSelectedFiles: vi.fn() },
		viewService: {
			clearSelection: vi.fn(),
			select: vi.fn(),
			setFocused: vi.fn(),
		},
		themeService: themeService(),
	} as unknown as VaultmanPlugin;
}

function nodes(): TreeNode[] {
	return [
		{ id: 'alpha', label: 'Alpha', depth: 0, meta: {}, icon: 'lucide-file' },
		{ id: 'beta', label: 'Beta', depth: 0, meta: {}, icon: 'lucide-tag' },
	];
}

function propNodes(): TreeNode<PropMeta>[] {
	return [
		{
			id: 'status',
			label: 'status',
			count: 3,
			depth: 0,
			meta: { propName: 'status', propType: 'list', isValueNode: false },
		},
	];
}

function provider(id = 'files', source = nodes()): ExplorerProvider {
	return {
		id,
		getTree: vi.fn(() => source),
		getFiles: vi.fn(() => []),
		handleNodeClick: vi.fn(),
		handleContextMenu: vi.fn(),
	};
}

describe('snippet mimicry smoke', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;
	let styleTag: HTMLStyleElement | null = null;

	beforeEach(() => {
		target = document.createElement('div');
		document.body.appendChild(target);
		styleTag = document.createElement('style');
		styleTag.textContent = fixture;
		document.head.appendChild(styleTag);
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
		styleTag?.remove();
		target.remove();
		vi.unstubAllGlobals();
	});

	function render(viewMode: ExplorerViewMode, sourceProvider = provider()): void {
		app = mount(PanelExplorer as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				plugin: plugin(),
				provider: sourceProvider,
				viewMode,
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();
		if (styleTag) {
			styleTag.remove();
			document.head.appendChild(styleTag);
		}
	}

	it('keeps grid labels vm-only under native DOM mode', () => {
		render('grid');

		const title = target.querySelector<HTMLElement>('.vm-node-grid-label');
		expect(title).toBeTruthy();
		expect(target.querySelector('.nav-file-title')).toBeFalsy();
	});

	it('emits tree-item-self where tree rows render', () => {
		render('tree');

		const row = target.querySelector<HTMLElement>('.tree-item-self');
		expect(row).toBeTruthy();
		expect(fixture).toContain('.tree-item-self');
	});

	it('emits Bases table cells where property table cells render', () => {
		render('table', provider('props', propNodes()));

		const property = target.querySelector<HTMLElement>('.bases-table-cell');
		expect(property).toBeTruthy();
		expect(getComputedStyle(property!).borderLeftStyle).toBe('solid');
	});
});
