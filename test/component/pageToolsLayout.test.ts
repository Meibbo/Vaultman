import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import PageToolsLayout from '../../src/components/pages/pageToolsLayout.svelte';
import { LeafDetachService } from '../../src/services/serviceLeafDetach';
import { ALL_TAB_IDS } from '../../src/registry/tabRegistry';
import type { VaultmanPlugin } from '../../src/main';
import { mockApp } from '../helpers/obsidian-mocks';

function makeStore(initial: Record<string, unknown> = {}) {
	let data: Record<string, unknown> = { ...initial };
	return {
		loadData: async () => ({ ...data }),
		saveData: async (next: unknown) => {
			data = { ...(next as Record<string, unknown>) };
		},
	};
}

async function makePlugin(): Promise<VaultmanPlugin> {
	const leafDetachService = new LeafDetachService({
		store: makeStore({ independentLeaves: { 'explorer-files': true } }),
		host: {
			spawnLeaf: vi.fn(async () => undefined),
			closeLeaf: vi.fn(async () => undefined),
		},
	});
	await leafDetachService.load();
	return {
		app: mockApp(),
		addChild: vi.fn(),
		removeChild: vi.fn(),
		leafDetachService,
	} as unknown as VaultmanPlugin;
}

describe('PageToolsLayout', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		target = document.createElement('div');
		document.body.appendChild(target);
	});

	afterEach(() => {
		if (app) {
			void unmount(app);
			app = null;
		}
		target.remove();
	});

	it('renders detachable controls for every canonical Vaultman tab', async () => {
		app = mount(PageToolsLayout as unknown as Component<Record<string, unknown>>, {
			target,
			props: { plugin: await makePlugin() },
		});
		flushSync();

		expect(target.querySelector('.vm-page-tools-layout')).toBeTruthy();
		expect(target.textContent).toContain('All tabs as independent leaves');
		const rows = [...target.querySelectorAll<HTMLElement>('.vm-layout-detach-row')];
		expect(rows).toHaveLength(ALL_TAB_IDS.length);
		for (const tabId of ALL_TAB_IDS) {
			expect(target.querySelector(`[data-vm-tab-id="${tabId}"]`)).toBeTruthy();
		}
		expect(target.querySelector('[data-vm-tab-id="explorer-files"]')?.textContent).toContain(
			'Detached',
		);
	});
});
