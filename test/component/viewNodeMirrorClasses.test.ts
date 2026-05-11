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

function thinNativeTheme(): ThemeService {
	const theme = new ThemeService();
	theme.mode = 'thin';
	theme.identity = 'native';
	return theme;
}

function thickBasesTheme(): ThemeService {
	const theme = new ThemeService();
	theme.mode = 'thick';
	theme.identity = 'bases';
	return theme;
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

	it('grid emits Obsidian file mirror classes only in Thin + native mode', () => {
		renderGrid(thinNativeTheme());
		expect(target.querySelector('.nav-file')).toBeTruthy();
		expect(target.querySelector('.nav-file-title')).toBeTruthy();

		void unmount(app!);
		target.replaceChildren();
		renderGrid(thickBasesTheme());
		expect(target.querySelector('.nav-file')).toBeFalsy();
		expect(target.querySelector('.nav-file-title')).toBeFalsy();
	});

	it('cards emit Obsidian file mirror classes only in Thin + native mode', () => {
		renderCards(thinNativeTheme());
		expect(target.querySelector('.nav-file')).toBeTruthy();
		expect(target.querySelector('.nav-file-title')).toBeTruthy();

		void unmount(app!);
		target.replaceChildren();
		renderCards(thickBasesTheme());
		expect(target.querySelector('.nav-file')).toBeFalsy();
		expect(target.querySelector('.nav-file-title')).toBeFalsy();
	});

	it('tree emits Obsidian tree mirror classes only in Thin + native mode', () => {
		renderTree(thinNativeTheme());
		expect(target.querySelector('.tree-item')).toBeTruthy();
		expect(target.querySelector('.tree-item-self')).toBeTruthy();
		expect(target.querySelector('.tree-item-inner')).toBeTruthy();

		void unmount(app!);
		target.replaceChildren();
		renderTree(thickBasesTheme());
		expect(target.querySelector('.tree-item')).toBeFalsy();
		expect(target.querySelector('.tree-item-self')).toBeFalsy();
		expect(target.querySelector('.tree-item-inner')).toBeFalsy();
	});
});
