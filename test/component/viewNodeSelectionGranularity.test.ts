import { SvelteMap } from 'svelte/reactivity';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import ViewNodeGrid from '../../src/components/views/ViewNodeGrid.svelte';
import ViewNodeTable from '../../src/components/views/ViewNodeTable.svelte';
import {
	DEFAULT_NODE_TABLE_COLUMNS,
	nodeRowsFromTree,
} from '../../src/services/serviceViewTableAdapter';
import type { TreeNode } from '../../src/types/typeNode';

function nodes(): TreeNode[] {
	return [
		{ id: 'alpha', label: 'Alpha', depth: 0, meta: {}, icon: 'lucide-file' },
		{ id: 'beta', label: 'Beta', depth: 0, meta: {}, icon: 'lucide-tag' },
		{ id: 'gamma', label: 'Gamma', depth: 0, meta: {}, icon: 'lucide-folder' },
	];
}

describe('node view selection granularity', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		target = document.createElement('div');
		document.body.appendChild(target);
		vi.stubGlobal('ResizeObserver', class { observe(): void {} disconnect(): void {} });
	});

	afterEach(() => {
		if (app) {
			void unmount(app);
			app = null;
		}
		target.remove();
		vi.unstubAllGlobals();
	});

	it('table rows read selection from the reactive selected map by id', () => {
		const selectedMap = new SvelteMap<string, boolean>();
		app = mount(ViewNodeTable as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				rows: nodeRowsFromTree(nodes()),
				columns: DEFAULT_NODE_TABLE_COLUMNS,
				selectedIds: new Set<string>(),
				selectedMap,
				onRowClick: vi.fn(),
				onContextMenu: vi.fn(),
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();
		const alpha = target.querySelector<HTMLElement>('[data-id="alpha"]')!;
		const beta = target.querySelector<HTMLElement>('[data-id="beta"]')!;
		const alphaIdentity = alpha;
		const betaIdentity = beta;

		selectedMap.set('beta', true);
		flushSync();

		expect(alpha.classList.contains('is-selected')).toBe(false);
		expect(beta.classList.contains('is-selected')).toBe(true);
		expect(target.querySelector<HTMLElement>('[data-id="alpha"]')).toBe(alphaIdentity);
		expect(target.querySelector<HTMLElement>('[data-id="beta"]')).toBe(betaIdentity);

		selectedMap.delete('beta');
		selectedMap.set('alpha', true);
		flushSync();

		expect(alpha.classList.contains('is-selected')).toBe(true);
		expect(beta.classList.contains('is-selected')).toBe(false);
	});

	it('grid tiles read selection from the reactive selected map by id', () => {
		const selectedMap = new SvelteMap<string, boolean>();
		app = mount(ViewNodeGrid as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				nodes: nodes(),
				selectedIds: new Set<string>(),
				selectedMap,
				onTileClick: vi.fn(),
				onContextMenu: vi.fn(),
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();
		const alpha = target.querySelector<HTMLElement>('[data-id="alpha"]')!;
		const beta = target.querySelector<HTMLElement>('[data-id="beta"]')!;
		const alphaIdentity = alpha;
		const betaIdentity = beta;

		selectedMap.set('beta', true);
		flushSync();

		expect(alpha.classList.contains('is-selected')).toBe(false);
		expect(beta.classList.contains('is-selected')).toBe(true);
		expect(target.querySelector<HTMLElement>('[data-id="alpha"]')).toBe(alphaIdentity);
		expect(target.querySelector<HTMLElement>('[data-id="beta"]')).toBe(betaIdentity);

		selectedMap.delete('beta');
		selectedMap.set('alpha', true);
		flushSync();

		expect(alpha.classList.contains('is-selected')).toBe(true);
		expect(beta.classList.contains('is-selected')).toBe(false);
	});
});
