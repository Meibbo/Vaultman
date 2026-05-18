import { describe, expect, it, vi } from 'vitest';
import { flushSync } from 'svelte';
import {
	FRAME_NAVIGATION_KEY,
	FrameNavigationService,
} from '../../src/components/frame/frameNavigation.svelte';
import type { FrameNavReorderController } from '../../src/components/frame/frameNavReorder.svelte';
import type { FrameOverlayController } from '../../src/components/frame/frameOverlays.svelte';
import type { FrameViewportController } from '../../src/components/frame/frameViewport';
import { makeMockPlugin } from './_helpers/makeMockPlugin';

function makeOverlaysMock() {
	return {
		activePopup: null as string | null,
		popupOpen: false,
		isIslandOpen: false,
		closePopup: vi.fn(),
		closeQueueIsland: vi.fn(),
		closeFiltersIsland: vi.fn(),
		toggleQueueIsland: vi.fn(),
		toggleFiltersIsland: vi.fn(),
	} as unknown as FrameOverlayController & {
		activePopup: string | null;
		popupOpen: boolean;
		closePopup: ReturnType<typeof vi.fn>;
		closeQueueIsland: ReturnType<typeof vi.fn>;
		closeFiltersIsland: ReturnType<typeof vi.fn>;
	};
}

function makeViewportMock() {
	return {
		applyPageTransform: vi.fn(),
		bindViewport: vi.fn(),
		bindContainer: vi.fn(),
		onContainerTransitionEnd: vi.fn(),
	} as unknown as FrameViewportController & {
		applyPageTransform: ReturnType<typeof vi.fn>;
	};
}

function makeNavReorderMock() {
	return {
		isReordering: false,
		reorderTargetIdx: -1,
		pillEl: null,
		navCollapsed: false,
		onNavIconPointerDown: vi.fn(),
		onPillPointerMove: vi.fn(),
		onPillPointerUp: vi.fn(),
		exitReorder: vi.fn(),
		bindNav: vi.fn(),
		bindViewRoot: vi.fn(),
		onCollapsedNavClick: vi.fn(),
	} as unknown as FrameNavReorderController;
}

function makeNav(opts: {
	plugin?: ReturnType<typeof makeMockPlugin>;
	overlays?: ReturnType<typeof makeOverlaysMock>;
	selectedCount?: number;
} = {}) {
	const plugin = opts.plugin ?? makeMockPlugin();
	const overlays = opts.overlays ?? makeOverlaysMock();
	const nav = new FrameNavigationService(
		plugin,
		overlays as unknown as FrameOverlayController,
		() => opts.selectedCount ?? 0,
	);
	return { nav, plugin, overlays };
}

describe('FrameNavigationService — context key', () => {
	it('exports FRAME_NAVIGATION_KEY as a Symbol', () => {
		expect(typeof FRAME_NAVIGATION_KEY).toBe('symbol');
		expect(String(FRAME_NAVIGATION_KEY)).toContain('frame.navigation');
	});
});

describe('FrameNavigationService — construction + late binding', () => {
	it('constructs with plugin + overlays + selected-count accessor', () => {
		const { nav } = makeNav();
		expect(nav).toBeInstanceOf(FrameNavigationService);
	});

	it('throws clear errors before late-bound dependencies are attached', () => {
		const { nav } = makeNav();
		expect(() => nav.viewport).toThrow(/viewport/i);
		expect(() => nav.navReorder).toThrow(/navReorder/i);
	});

	it('returns late-bound dependencies after attach', () => {
		const { nav } = makeNav();
		const viewport = makeViewportMock();
		const navReorder = makeNavReorderMock();
		nav.attachViewport(viewport);
		nav.attachNavReorder(navReorder);
		expect(nav.viewport).toBe(viewport);
		expect(nav.navReorder).toBe(navReorder);
	});
});

describe('FrameNavigationService — initial state', () => {
	it('activePage defaults to pageOrder[0] from settings', () => {
		const plugin = makeMockPlugin({ pageOrder: ['filters', 'ops', 'statistics'] });
		const { nav } = makeNav({ plugin });
		expect(nav.activePage).toBe('filters');
		expect([...nav.pageOrder]).toEqual(['filters', 'ops', 'statistics']);
	});

	it('exposes T4 and filters bindable state through getter/setter pairs', () => {
		const { nav } = makeNav();
		nav.toolsActiveTab = 'file_diff';
		nav.filtersActiveTab = 'files';
		nav.filtersBaseChooseMode = true;
		expect(nav.toolsActiveTab).toBe('file_diff');
		expect(nav.filtersActiveTab).toBe('files');
		expect(nav.filtersBaseChooseMode).toBe(true);
	});
});

describe('FrameNavigationService — navigation intents', () => {
	it('navigateTo preserves current behavior: closes islands only on page change and always applies transform', () => {
		const { nav, overlays } = makeNav();
		const viewport = makeViewportMock();
		nav.attachViewport(viewport);

		nav.navigateTo(nav.activePage);
		expect(overlays.closeQueueIsland).not.toHaveBeenCalled();
		expect(overlays.closeFiltersIsland).not.toHaveBeenCalled();
		expect(viewport.applyPageTransform).toHaveBeenCalledWith(true);

		viewport.applyPageTransform.mockClear();
		nav.navigateTo('filters');
		expect(overlays.closeQueueIsland).toHaveBeenCalledTimes(1);
		expect(overlays.closeFiltersIsland).toHaveBeenCalledTimes(1);
		expect(nav.activePage).toBe('filters');
		expect(viewport.applyPageTransform).toHaveBeenCalledWith(true);
	});

	it('leaving filters clears bases-import mode', () => {
		const { nav } = makeNav();
		const viewport = makeViewportMock();
		nav.attachViewport(viewport);
		nav.enterBasesImport();
		expect(nav.filtersBaseChooseMode).toBe(true);
		nav.navigateTo('ops');
		expect(nav.filtersBaseChooseMode).toBe(false);
	});

	it('openDiffIntent records canonical T3 side-effect order', () => {
		const overlays = makeOverlaysMock();
		overlays.popupOpen = true;
		const { nav } = makeNav({ overlays });
		const viewport = makeViewportMock();
		nav.attachViewport(viewport);

		const order: string[] = [];
		overlays.closeQueueIsland.mockImplementation(() => order.push('closeQueueIsland'));
		overlays.closeFiltersIsland.mockImplementation(() => order.push('closeFiltersIsland'));
		overlays.closePopup.mockImplementation(() => order.push('closePopup'));
		viewport.applyPageTransform.mockImplementation(() =>
			order.push(`applyPageTransform:${nav.activePage}:${nav.toolsActiveTab}`),
		);

		nav.openDiffIntent();

		expect(order).toEqual([
			'closeQueueIsland',
			'closeFiltersIsland',
			'closePopup',
			'applyPageTransform:ops:file_diff',
		]);
		expect(viewport.applyPageTransform).toHaveBeenCalledWith(true);
	});

	it('openDiffIntent skips closePopup when no popup is open', () => {
		const overlays = makeOverlaysMock();
		overlays.popupOpen = false;
		const { nav } = makeNav({ overlays });
		const viewport = makeViewportMock();
		nav.attachViewport(viewport);
		nav.openDiffIntent();
		expect(overlays.closePopup).not.toHaveBeenCalled();
	});

	it('enterBasesImport and exitBasesImport update filters state', () => {
		const { nav } = makeNav();
		const viewport = makeViewportMock();
		nav.attachViewport(viewport);
		nav.enterBasesImport();
		expect(nav.filtersBaseChooseMode).toBe(true);
		expect(nav.filtersActiveTab).toBe('files');
		expect(nav.activePage).toBe('filters');
		expect(viewport.applyPageTransform).toHaveBeenCalledWith(true);
		nav.exitBasesImport();
		expect(nav.filtersBaseChooseMode).toBe(false);
	});
});

describe('FrameNavigationService — stats and surface derivations', () => {
	it('showStatsPage clears the preview file', () => {
		const { nav } = makeNav();
		nav.showStatsPage();
		expect(nav.statsPreviewFile).toBeNull();
	});

	it('dockItems derives frame pages and selected-count dot', () => {
		const plugin = makeMockPlugin({
			layout: {
				dock: { content: 'frame-pages' },
				tabs: { content: 'none' },
			},
		});
		const { nav } = makeNav({ plugin, selectedCount: 2 });
		expect(nav.dockItems.map((item) => item.id)).toEqual(['ops', 'statistics', 'filters']);
		expect(nav.dockItems.find((item) => item.id === 'statistics')?.dot).toBe(true);
		expect(nav.dockUsesFramePages).toBe(true);
	});

	it('filter tab items become disabled and faint during bases-import mode', () => {
		const plugin = makeMockPlugin({
			layout: {
				dock: { content: 'filter-tabs' },
				tabs: { content: 'none' },
			},
		});
		const { nav } = makeNav({ plugin });
		nav.filtersBaseChooseMode = true;
		const propsTab = nav.dockItems.find((item) => item.id === 'props');
		const filesTab = nav.dockItems.find((item) => item.id === 'files');
		expect(propsTab?.disabled).toBe(true);
		expect(propsTab?.faint).toBe(true);
		expect(filesTab?.disabled).toBe(false);
	});

	it('selectSurfaceItem dispatches detached tabs and otherwise navigates', () => {
		const plugin = makeMockPlugin({
			layout: {
				dock: { content: 'frame-pages' },
				tabs: { content: 'none' },
			},
		});
		plugin.leafDetachService = {
			...plugin.leafDetachService,
			getState: vi.fn(() => ({ 'page-tools': true })),
		} as never;
		const { nav } = makeNav({ plugin });
		const viewport = makeViewportMock();
		nav.attachViewport(viewport);

		nav.selectSurfaceItem('frame-pages', 'ops');
		expect(plugin.spawnTabLeaf).toHaveBeenCalledWith('page-tools');

		plugin.leafDetachService = {
			...plugin.leafDetachService,
			getState: vi.fn(() => ({})),
		} as never;
		nav.selectSurfaceItem('filter-tabs', 'files');
		expect(nav.filtersActiveTab).toBe('files');
		expect(nav.activePage).toBe('filters');
	});
});

describe('FrameNavigationService — page-order mutations', () => {
	it('setPageOrder resets activePage when the current page is excluded', () => {
		const { nav } = makeNav();
		const viewport = makeViewportMock();
		nav.attachViewport(viewport);
		nav.setPageOrder(['filters', 'statistics']);
		flushSync();
		expect(nav.activePage).toBe('filters');
		expect(nav.pageIndex).toBe(0);
		expect(viewport.applyPageTransform).toHaveBeenCalledWith(true);
	});

	it('bumpRenderKey increments pageRenderKey', () => {
		const { nav } = makeNav();
		const before = nav.pageRenderKey;
		nav.bumpRenderKey();
		expect(nav.pageRenderKey).toBe(before + 1);
	});
});
