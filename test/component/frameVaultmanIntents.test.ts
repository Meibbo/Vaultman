import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import FrameVaultman from '../../src/components/frame/frameVaultman.svelte';
import { installObsidianDomPolyfill } from '../helpers/dom-obsidian-polyfill';
import { makeMockPlugin } from './_helpers/makeMockPlugin';

function makeFramePlugin(overrides: Parameters<typeof makeMockPlugin>[0] = {}) {
	const plugin = makeMockPlugin(overrides);
	Object.assign(plugin.queueService, {
		transactions: new Map(),
		chains: new Map(),
	});
	return plugin;
}

function installFrameHarness(): void {
	installObsidianDomPolyfill();
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe(): void {}
			disconnect(): void {}
		},
	);
	vi.stubGlobal('activeWindow', window);
	vi.stubGlobal('activeDocument', document);
	vi.spyOn(document, 'hasFocus').mockReturnValue(true);
}

describe('frameVaultman — T3 openDiffViewHook intent', () => {
	let target: HTMLElement;
	let instance: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		installFrameHarness();
		target = document.createElement('div');
		document.body.appendChild(target);
	});

	afterEach(() => {
		if (instance) {
			void unmount(instance);
			instance = null;
		}
		target.remove();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('registers plugin.openDiffViewHook after mount', () => {
		const plugin = makeFramePlugin();
		instance = mount(FrameVaultman as unknown as Component<Record<string, unknown>>, {
			target,
			props: { plugin, viewportKind: 'sidebar' },
		});
		flushSync();
		expect(plugin.openDiffViewHook).toBeInstanceOf(Function);
	});

	it('calling plugin.openDiffViewHook() lands on ops + file_diff', () => {
		const plugin = makeFramePlugin({ pageOrder: ['filters', 'ops', 'statistics'] });
		instance = mount(FrameVaultman as unknown as Component<Record<string, unknown>>, {
			target,
			props: { plugin, viewportKind: 'sidebar' },
		});
		flushSync();

		expect(target.querySelector('[data-tab="file_diff"].is-active')).toBeNull();
		plugin.openDiffViewHook?.();
		flushSync();

		expect(target.querySelector('.vm-page[data-page="ops"]')).toBeTruthy();
		expect(target.querySelector('[data-tab="file_diff"].is-active')).toBeTruthy();
	});

	it('unmount clears only the hook closure registered by this frame', () => {
		const plugin = makeFramePlugin();
		instance = mount(FrameVaultman as unknown as Component<Record<string, unknown>>, {
			target,
			props: { plugin, viewportKind: 'sidebar' },
		});
		flushSync();

		expect(plugin.openDiffViewHook).toBeInstanceOf(Function);
		void unmount(instance);
		instance = null;

		expect(plugin.openDiffViewHook).toBeNull();
	});

	it('identity-check cleanup preserves later hook replacement', () => {
		const plugin = makeFramePlugin();
		instance = mount(FrameVaultman as unknown as Component<Record<string, unknown>>, {
			target,
			props: { plugin, viewportKind: 'sidebar' },
		});
		flushSync();

		const externalHook = vi.fn();
		plugin.openDiffViewHook = externalHook;
		void unmount(instance);
		instance = null;

		expect(plugin.openDiffViewHook).toBe(externalHook);
	});
});

describe('frameVaultman — T4 bind and context propagation', () => {
	let target: HTMLElement;
	let instance: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		installFrameHarness();
		target = document.createElement('div');
		document.body.appendChild(target);
	});

	afterEach(() => {
		if (instance) {
			void unmount(instance);
			instance = null;
		}
		target.remove();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('binds OperationsPage activeTab through nav.toolsActiveTab', () => {
		const plugin = makeFramePlugin();
		instance = mount(FrameVaultman as unknown as Component<Record<string, unknown>>, {
			target,
			props: { plugin, viewportKind: 'sidebar' },
		});
		flushSync();

		expect(target.querySelector('[data-tab="layout"].is-active')).toBeTruthy();
		plugin.openDiffViewHook?.();
		flushSync();
		expect(target.querySelector('[data-tab="file_diff"].is-active')).toBeTruthy();
	});

	it('mounts frame shells through service context', () => {
		const plugin = makeFramePlugin();
		instance = mount(FrameVaultman as unknown as Component<Record<string, unknown>>, {
			target,
			props: { plugin, viewportKind: 'sidebar' },
		});
		flushSync();

		expect(target.querySelector('.vm-bottom-nav')).toBeTruthy();
	});
});

describe('frameVaultman — decomposition cleanup target', () => {
	it('keeps frameVaultman.svelte within the final O LOC ceiling', () => {
		const source = readFileSync('src/components/frame/frameVaultman.svelte', 'utf8');
		expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(360);
	});
});
