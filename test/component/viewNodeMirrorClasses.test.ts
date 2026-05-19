import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import ViewNodeCards from '../../src/components/views/ViewNodeCards.svelte';
import ViewNodeGrid from '../../src/components/views/ViewNodeGrid.svelte';
import ViewTree from '../../src/components/views/viewTree.svelte';
import { ThemeService } from '../../src/services/serviceTheme.svelte';
import type { TextMeasureService } from '../../src/services/serviceTextMeasure';
import type { TreeNode } from '../../src/types/typeNode';

const nodes: TreeNode[] = [
	{ id: 'alpha', label: 'Alpha', depth: 0, meta: {}, icon: 'lucide-file' },
	{ id: 'beta', label: 'Beta', depth: 0, meta: {}, icon: 'lucide-tag' },
];

const measure: TextMeasureService = {
	cacheMisses: 0,
	measure: vi.fn((text: string, style) => ({
		lineCount: Math.max(1, Math.ceil(text.length / 24)),
		height: Math.max(1, Math.ceil(text.length / 24)) * style.lineHeight,
	})),
	measureRowHeight: vi.fn(() => 32),
	invalidate: vi.fn(),
	invalidateAll: vi.fn(),
	clear: vi.fn(),
};

function nativePresetTheme(): ThemeService {
	const theme = new ThemeService();
	theme.setPreset('native');
	return theme;
}

function vaultmanPresetTheme(): ThemeService {
	return new ThemeService();
}

describe('view mirror class arbitration', () => {
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

	function renderGrid(themeService: ThemeService): void {
		app = mount(ViewNodeGrid as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				nodes,
				themeService,
				onTileClick: vi.fn(),
				onContextMenu: vi.fn(),
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();
	}

	function renderCards(themeService: ThemeService): void {
		app = mount(ViewNodeCards as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				providerId: 'tags',
				nodes,
				themeService,
				visibleFields: ['icon', 'text', 'count'],
				onCardClick: vi.fn(),
				onContextMenu: vi.fn(),
				measure,
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();
	}

	function renderTree(themeService: ThemeService): void {
		app = mount(ViewTree as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				nodes,
				themeService,
				expandedIds: new Set<string>(),
				onToggle: vi.fn(),
				onRowClick: vi.fn(),
				onContextMenu: vi.fn(),
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();
	}

	it('grid stays vm-only even in native preset mode', () => {
		renderGrid(nativePresetTheme());
		expect(target.querySelector('.vm-node-grid-tile')).toBeTruthy();
		expect(target.querySelector('.nav-file')).toBeFalsy();
		expect(target.querySelector('.nav-file-title')).toBeFalsy();

		void unmount(app!);
		target.replaceChildren();
		renderGrid(vaultmanPresetTheme());
		expect(target.querySelector('.nav-file')).toBeFalsy();
		expect(target.querySelector('.nav-file-title')).toBeFalsy();
	});

	it('cards emit Bases card classes only in native preset mode', () => {
		renderCards(nativePresetTheme());
		expect(target.querySelector('.bases-cards-item')).toBeTruthy();
		expect(target.querySelector('.bases-cards-property.mod-title')).toBeTruthy();
		expect(target.querySelector('.nav-file')).toBeFalsy();
		expect(target.querySelector('.nav-file-title')).toBeFalsy();

		void unmount(app!);
		target.replaceChildren();
		renderCards(vaultmanPresetTheme());
		expect(target.querySelector('.bases-cards-item')).toBeFalsy();
		expect(target.querySelector('.bases-cards-property')).toBeFalsy();
		expect(target.querySelector('.nav-file')).toBeFalsy();
		expect(target.querySelector('.nav-file-title')).toBeFalsy();
	});

	it('tree emits Obsidian tree mirror classes only in native preset mode', () => {
		renderTree(nativePresetTheme());
		expect(target.querySelector('.tree-item')).toBeTruthy();
		expect(target.querySelector('.tree-item-self')).toBeTruthy();
		expect(target.querySelector('.tree-item-inner')).toBeTruthy();

		void unmount(app!);
		target.replaceChildren();
		renderTree(vaultmanPresetTheme());
		expect(target.querySelector('.tree-item')).toBeFalsy();
		expect(target.querySelector('.tree-item-self')).toBeFalsy();
		expect(target.querySelector('.tree-item-inner')).toBeFalsy();
	});
});
