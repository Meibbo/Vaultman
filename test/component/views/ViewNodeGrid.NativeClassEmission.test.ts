import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import ViewNodeGrid from '../../../src/components/views/ViewNodeGrid.svelte';
import { ThemeService } from '../../../src/services/serviceTheme.svelte';
import type { TreeNode } from '../../../src/types/typeNode';
import { iconStub, resizeObserverStub } from './nodeElementMaskTestHelpers';

const nodes: TreeNode[] = [
	{ id: 'grid-native-a', label: 'Grid Alpha', depth: 0, meta: {}, icon: 'lucide-file' },
];

describe('ViewNodeGrid - native class emission', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		target = document.createElement('div');
		document.body.appendChild(target);
		vi.stubGlobal('ResizeObserver', resizeObserverStub);
	});

	afterEach(() => {
		if (app) void unmount(app);
		app = null;
		target.remove();
		vi.unstubAllGlobals();
	});

	function renderNativeTheme() {
		const themeService = new ThemeService();
		themeService.setPreset('native');
		app = mount(ViewNodeGrid as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				nodes,
				themeService,
				visibleFields: ['icon', 'text', 'count'],
				onTileClick: vi.fn(),
				onContextMenu: vi.fn(),
				icon: iconStub(),
			},
		});
		flushSync();
	}

	it('stays vm-only even when native DOM mode is active', () => {
		renderNativeTheme();

		expect(target.querySelector('.vm-node-grid-tile')).not.toBeNull();
		expect(target.querySelector('.nav-file')).toBeNull();
		expect(target.querySelector('.nav-file-title')).toBeNull();
		expect(target.querySelector('[class*="bases-"]')).toBeNull();
	});
});
