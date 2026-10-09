import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import StatisticsPage from '../../src/components/pages/pageStatistics.svelte';

type Listener = (...args: unknown[]) => void;

function eventSource() {
	const listeners = new Map<string, Set<Listener>>();
	const on = vi.fn((name: string, listener: Listener) => {
		const bucket = listeners.get(name) ?? new Set<Listener>();
		bucket.add(listener);
		listeners.set(name, bucket);
		return { name, listener };
	});
	const off = vi.fn((name: string, listener: Listener) => {
		listeners.get(name)?.delete(listener);
	});
	return { on, off, listeners };
}

function createPlugin() {
	const statisticsCache = eventSource();
	const filterService = eventSource();
	const queueService = eventSource();
	const workspace = eventSource();
	const workspaceOffref = vi.fn();
	const statisticsSnapshot = {
		folders: 1,
		files: 2,
		props: 3,
		values: 4,
		tags: 5,
		links: 6,
		words: 7,
		tasks: 8,
		cacheHits: 0,
		filesRead: 0,
		durationMs: 0,
	};
	const plugin = {
		settings: { minimalStyle: false, toolbarMenuLayouts: {} },
		app: {
			vault: {
				getMarkdownFiles: () => [],
				getFiles: () => [],
			},
			workspace: {
				getActiveFile: () => null,
				on: workspace.on,
				offref: workspaceOffref,
			},
		},
		filterService: {
			filteredFiles: [],
			on: filterService.on,
			off: filterService.off,
		},
		queueService: { on: queueService.on, off: queueService.off },
		statisticsCache: {
			snapshotSignatureFor: () => 'snapshot',
			getLastGoodSnapshot: () => statisticsSnapshot,
			getLastGoodSnapshotForScope: () => statisticsSnapshot,
			computeSnapshot: () => Promise.resolve(statisticsSnapshot),
			on: statisticsCache.on,
			off: statisticsCache.off,
		},
		lastOpenedService: { openedTodayCount: () => 9 },
		sasiRegistry: {},
	};
	return {
		plugin,
		statisticsCache,
		filterService,
		queueService,
		workspace: { ...workspace, offref: workspaceOffref },
	};
}

describe('StatisticsPage component lifecycle', () => {
	let instance: ReturnType<typeof mount> | null = null;

	afterEach(() => {
		if (instance) void unmount(instance);
		instance = null;
		document.body.replaceChildren();
	});

	it('mounts all eight cards for the active page and clears listeners/publication on teardown', () => {
		const harness = createPlugin();
		const onPublishPanelWidget = vi.fn();
		const onClearPanelWidget = vi.fn();
		const target = document.createElement('div');
		document.body.appendChild(target);

		instance = mount(StatisticsPage, {
			target,
			props: {
				plugin: harness.plugin,
				active: true,
				sceneInstanceId: 'scene',
				generation: 1,
				onPublishPanelWidget,
				onClearPanelWidget,
			},
		});
		flushSync();

		const cards = target.querySelectorAll<HTMLButtonElement>('.vaultman-stat-card');
		expect(cards).toHaveLength(8);
		expect(Array.from(cards).every((card) => card.tabIndex >= 0)).toBe(true);
		expect(onPublishPanelWidget).toHaveBeenCalledOnce();

		void unmount(instance);
		instance = null;

		expect(onClearPanelWidget).toHaveBeenCalledWith({
			sceneInstanceId: 'scene',
			providerId: 'statistics',
			generation: 1,
		});
		expect(harness.statisticsCache.off).toHaveBeenCalledWith(
			'changed',
			expect.any(Function),
		);
		expect(harness.filterService.off).toHaveBeenCalledWith(
			'changed',
			expect.any(Function),
		);
		expect(harness.queueService.off).toHaveBeenCalledWith(
			'executed',
			expect.any(Function),
		);
		expect(harness.workspace.offref).toHaveBeenCalledOnce();
	});
});
