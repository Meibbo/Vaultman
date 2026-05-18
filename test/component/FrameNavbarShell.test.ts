import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync } from 'svelte';
import FrameNavbarShell from '../../src/components/frame/FrameNavbarShell.svelte';
import { FRAME_NAVIGATION_KEY } from '../../src/components/frame/frameNavigation.svelte';
import type { FrameNavigationService } from '../../src/components/frame/frameNavigation.svelte';
import type { FrameOverlayController } from '../../src/components/frame/frameOverlays.svelte';
import { makeMockPlugin } from './_helpers/makeMockPlugin';
import { withContext } from './_helpers/withContext';

function makeNavReorderMock() {
	return {
		navCollapsed: false,
		isReordering: false,
		reorderTargetIdx: -1,
		pillEl: null,
		drawerOpen: false,
		bindNav: vi.fn(() => ({ destroy: vi.fn() })),
		bindViewRoot: vi.fn(() => ({ destroy: vi.fn() })),
		onCollapsedNavClick: vi.fn(),
		onNavIconPointerDown: vi.fn(),
		onPillPointerMove: vi.fn(),
		onPillPointerUp: vi.fn(),
		exitReorder: vi.fn(),
	};
}

function makeNavMock(
	overrides: Partial<{
		topTabItems: Array<{ id: string; icon: string; label: string }>;
		dockUsesFramePages: boolean;
		isIslandOpen: boolean;
	}> = {},
) {
	const selectSurfaceItem = vi.fn();
	return {
		topTabItems: overrides.topTabItems ?? [],
		topTabActive: overrides.topTabItems?.[0]?.id ?? '',
		topExternalTabIds: [],
		dockItems: [
			{ id: 'ops', icon: 'lucide-settings-2', label: 'Ops' },
			{ id: 'statistics', icon: 'lucide-bar-chart-2', label: 'Statistics' },
			{ id: 'filters', icon: 'lucide-filter', label: 'Filters' },
		],
		dockActive: 'ops',
		dockExternalTabIds: [],
		dockUsesFramePages: overrides.dockUsesFramePages ?? true,
		navReorder: makeNavReorderMock(),
		selectSurfaceItem,
	} as unknown as FrameNavigationService & {
		selectSurfaceItem: ReturnType<typeof vi.fn>;
	};
}

function makeLayoutSettings(content: 'frame-pages' | 'filter-tabs' | 'none' = 'frame-pages') {
	return {
		dock: {
			content,
			labels: { visible: true, position: 'bottom' },
			presentation: { mode: 'bar', drawerDirection: 'up' },
		},
		tabs: {
			content: content === 'none' ? 'none' : 'filter-tabs',
			labels: { visible: true, position: 'side' },
			presentation: { mode: 'bar', drawerDirection: 'up' },
		},
	};
}

function makeOverlaysMock() {
	return {
		isIslandOpen: false,
		activePopup: null,
		popupOpen: false,
		closeQueueIsland: vi.fn(),
		closeFiltersIsland: vi.fn(),
		closePopup: vi.fn(),
	} as unknown as FrameOverlayController & {
		isIslandOpen: boolean;
		closeQueueIsland: ReturnType<typeof vi.fn>;
		closeFiltersIsland: ReturnType<typeof vi.fn>;
	};
}

describe('FrameNavbarShell', () => {
	let target: HTMLElement;
	let teardown: { destroy(): void } | null = null;

	beforeEach(() => {
		target = document.createElement('div');
		document.body.appendChild(target);
	});

	afterEach(() => {
		teardown?.destroy();
		teardown = null;
		target.remove();
	});

	it('throws a clear error when navigation context is missing', () => {
		expect(() =>
			withContext(
				target,
				FrameNavbarShell,
				{
					plugin: makeMockPlugin(),
					filterRuleCount: 0,
					queuedCount: 0,
					layoutSettings: makeLayoutSettings(),
					leftFab: null,
					rightFab: null,
					overlays: makeOverlaysMock(),
				},
				[],
			),
		).toThrow(/FRAME_NAVIGATION_KEY|frame.navigation/);
	});

	it('renders NavbarDock unconditionally', () => {
		const nav = makeNavMock();
		teardown = withContext(
			target,
			FrameNavbarShell,
			{
				plugin: makeMockPlugin(),
				filterRuleCount: 0,
				queuedCount: 0,
				layoutSettings: makeLayoutSettings(),
				leftFab: null,
				rightFab: null,
				overlays: makeOverlaysMock(),
			},
			[[FRAME_NAVIGATION_KEY, nav]],
		);
		flushSync();
		expect(target.querySelector('.vm-bottom-nav')).toBeTruthy();
	});

	it('renders NavbarTabs when nav.topTabItems is non-empty', () => {
		const nav = makeNavMock({
			topTabItems: [{ id: 'props', icon: 'lucide-tags', label: 'Props' }],
		});
		teardown = withContext(
			target,
			FrameNavbarShell,
			{
				plugin: makeMockPlugin(),
				filterRuleCount: 0,
				queuedCount: 0,
				layoutSettings: makeLayoutSettings('filter-tabs'),
				leftFab: null,
				rightFab: null,
				overlays: makeOverlaysMock(),
			},
			[[FRAME_NAVIGATION_KEY, nav]],
		);
		flushSync();
		expect(target.querySelector('.vm-tab-bar')).toBeTruthy();
	});

	it('applies island backdrop classes from overlays + settings', () => {
		const nav = makeNavMock();
		const overlays = makeOverlaysMock();
		overlays.isIslandOpen = true;
		teardown = withContext(
			target,
			FrameNavbarShell,
			{
				plugin: makeMockPlugin({ islandDismissOnOutsideClick: true }),
				filterRuleCount: 0,
				queuedCount: 0,
				layoutSettings: makeLayoutSettings(),
				leftFab: null,
				rightFab: null,
				overlays,
			},
			[[FRAME_NAVIGATION_KEY, nav]],
		);
		flushSync();
		const backdrop = target.querySelector('.vm-island-backdrop');
		expect(backdrop?.classList.contains('is-open')).toBe(true);
		expect(backdrop?.classList.contains('is-dismissable')).toBe(true);
	});

	it('clicking dismissable backdrop closes queue and filters islands', () => {
		const nav = makeNavMock();
		const overlays = makeOverlaysMock();
		teardown = withContext(
			target,
			FrameNavbarShell,
			{
				plugin: makeMockPlugin({ islandDismissOnOutsideClick: true }),
				filterRuleCount: 0,
				queuedCount: 0,
				layoutSettings: makeLayoutSettings(),
				leftFab: null,
				rightFab: null,
				overlays,
			},
			[[FRAME_NAVIGATION_KEY, nav]],
		);
		flushSync();
		(target.querySelector('.vm-island-backdrop') as HTMLElement).click();
		expect(overlays.closeQueueIsland).toHaveBeenCalledTimes(1);
		expect(overlays.closeFiltersIsland).toHaveBeenCalledTimes(1);
	});

	it('dock item click dispatches nav.selectSurfaceItem(layoutSettings.dock.content, id)', () => {
		const nav = makeNavMock();
		teardown = withContext(
			target,
			FrameNavbarShell,
			{
				plugin: makeMockPlugin(),
				filterRuleCount: 0,
				queuedCount: 0,
				layoutSettings: makeLayoutSettings('frame-pages'),
				leftFab: null,
				rightFab: null,
				overlays: makeOverlaysMock(),
			},
			[[FRAME_NAVIGATION_KEY, nav]],
		);
		flushSync();
		(target.querySelector('.vm-nav-dock-item[aria-label="Ops"]') as HTMLElement).click();
		expect(nav.selectSurfaceItem).toHaveBeenCalledWith('frame-pages', 'ops');
	});
});
