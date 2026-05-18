import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync } from 'svelte';
import FrameDashboardShell from '../../src/components/frame/FrameDashboardShell.svelte';
import { FRAME_NAVIGATION_KEY } from '../../src/components/frame/frameNavigation.svelte';
import type { FrameNavigationService } from '../../src/components/frame/frameNavigation.svelte';
import { createFiltersSearchState } from '../../src/components/frame/frameFiltersSearch';
import type { FiltersSearchTab } from '../../src/components/frame/frameFiltersSearch';
import { createFnRState } from '../../src/services/serviceFnR';
import { AddonsIslandService } from '../../src/services/serviceAddonsIsland.svelte';
import { installObsidianDomPolyfill } from '../helpers/dom-obsidian-polyfill';
import { makeMockPlugin } from './_helpers/makeMockPlugin';
import { withContext } from './_helpers/withContext';

type FilterTabItem = {
	id: FiltersSearchTab;
	icon: string;
	label: string;
	faint?: boolean;
	disabled?: boolean;
};

function makeNavMock(
	overrides: Partial<{
		activePage: string;
		pageRenderKey: number;
		statsPreviewFile: unknown;
		toolsActiveTab: string;
		filtersActiveTab: FiltersSearchTab;
		filtersBaseChooseMode: boolean;
		filterTabItems: FilterTabItem[];
		selectSurfaceItem: ReturnType<typeof vi.fn>;
		showStatsPage: ReturnType<typeof vi.fn>;
	}> = {},
) {
	let toolsActiveTab = overrides.toolsActiveTab ?? 'layout';
	let filtersActiveTab = overrides.filtersActiveTab ?? 'props';
	let filtersBaseChooseMode = overrides.filtersBaseChooseMode ?? false;
	return {
		get activePage() {
			return overrides.activePage ?? 'ops';
		},
		get pageRenderKey() {
			return overrides.pageRenderKey ?? 0;
		},
		get statsPreviewFile() {
			return overrides.statsPreviewFile ?? null;
		},
		get toolsActiveTab() {
			return toolsActiveTab;
		},
		set toolsActiveTab(value: string) {
			toolsActiveTab = value;
		},
		get filtersActiveTab() {
			return filtersActiveTab;
		},
		set filtersActiveTab(value: FiltersSearchTab) {
			filtersActiveTab = value;
		},
		get filtersBaseChooseMode() {
			return filtersBaseChooseMode;
		},
		set filtersBaseChooseMode(value: boolean) {
			filtersBaseChooseMode = value;
		},
		filterTabItems: overrides.filterTabItems ?? [
			{ id: 'props', icon: 'lucide-tags', label: 'Props' },
			{ id: 'files', icon: 'lucide-file', label: 'Files' },
		],
		selectSurfaceItem: overrides.selectSurfaceItem ?? vi.fn(),
		showStatsPage: overrides.showStatsPage ?? vi.fn(),
	} as unknown as FrameNavigationService & {
		selectSurfaceItem: ReturnType<typeof vi.fn>;
		showStatsPage: ReturnType<typeof vi.fn>;
	};
}

function makeShellProps(overrides: Record<string, unknown> = {}) {
	const plugin = makeMockPlugin();
	return {
		plugin,
		icon: (el: HTMLElement, name: string) => {
			el.dataset.icon = name;
			return {
				update(nextName: string) {
					el.dataset.icon = nextName;
				},
			};
		},
		filtersActiveTab: 'props' as FiltersSearchTab,
		filtersSearchByTab: createFiltersSearchState(),
		filtersSearchCategory: { tags: 0, props: 0, files: 0, content: 0, outline: 0 },
		filtersFnRState: createFnRState(),
		filtersOperationScope: 'auto',
		tagsExplorer: undefined,
		propExplorer: undefined,
		fileList: undefined,
		selectedCount: 0,
		selectedFilePaths: new Set<string>(),
		filtersSortBy: 'name',
		filtersSortDir: 'asc',
		filtersSortTarget: 'top',
		filtersViewMode: 'tree',
		addMode: false,
		addOpCount: 0,
		detachedTabs: {},
		addonsIslandService: new AddonsIslandService(),
		addonsQuickSwitcherApp: plugin.app,
		renderAddonsStats: () => 'files: 1',
		onShowStats: vi.fn(),
		onOperationScopeChange: vi.fn(),
		dashboardEnabled: true,
		...overrides,
	};
}

describe('FrameDashboardShell', () => {
	let target: HTMLElement;
	let teardown: { destroy(): void } | null = null;

	beforeEach(() => {
		installObsidianDomPolyfill();
		target = document.createElement('div');
		document.body.appendChild(target);
		vi.stubGlobal('activeWindow', window);
		vi.stubGlobal('activeDocument', document);
	});

	afterEach(() => {
		teardown?.destroy();
		teardown = null;
		target.remove();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('throws a clear error when navigation context is missing', () => {
		expect(() =>
			withContext(target, FrameDashboardShell, makeShellProps(), []),
		).toThrow(/FRAME_NAVIGATION_KEY|frame.navigation/);
	});

	it('renders nothing when dashboardEnabled is false', () => {
		const nav = makeNavMock();
		teardown = withContext(
			target,
			FrameDashboardShell,
			makeShellProps({ dashboardEnabled: false }),
			[[FRAME_NAVIGATION_KEY, nav]],
		);
		flushSync();
		expect(target.querySelector('.vm-dashboard-viewport')).toBeNull();
		expect(target.querySelector('[data-vm-dashboard]')).toBeNull();
	});

	it('renders dashboard columns and add-ons pane when dashboardEnabled is true', () => {
		const nav = makeNavMock({ activePage: 'ops' });
		teardown = withContext(
			target,
			FrameDashboardShell,
			makeShellProps({ detachedTabs: { 'page-tools': true } }),
			[[FRAME_NAVIGATION_KEY, nav]],
		);
		flushSync();
		expect(target.querySelector('.vm-dashboard-viewport')).toBeTruthy();
		expect(target.querySelector('[data-vm-col="filters"]')).toBeTruthy();
		expect(target.querySelector('[data-vm-col="explorer"]')).toBeTruthy();
		expect(target.querySelector('[data-vm-col="addons"]')).toBeTruthy();
		expect(target.querySelector('[data-vm-addon-action="open-note"]')).toBeTruthy();
	});

	it('renders one dashboard filter button per nav filter tab and marks the active prop', () => {
		const nav = makeNavMock();
		teardown = withContext(
			target,
			FrameDashboardShell,
			makeShellProps({ filtersActiveTab: 'files' }),
			[[FRAME_NAVIGATION_KEY, nav]],
		);
		flushSync();
		const buttons = target.querySelectorAll('.vm-dashboard-filter-button');
		expect(buttons).toHaveLength(nav.filterTabItems.length);
		expect(target.querySelector('.vm-dashboard-filter-button.is-active')?.textContent).toContain(
			'Files',
		);
	});

	it('filter button clicks dispatch through nav.selectSurfaceItem', () => {
		const selectSurfaceItem = vi.fn();
		const nav = makeNavMock({ selectSurfaceItem });
		teardown = withContext(target, FrameDashboardShell, makeShellProps(), [
			[FRAME_NAVIGATION_KEY, nav],
		]);
		flushSync();
		const filesButton = Array.from(target.querySelectorAll('.vm-dashboard-filter-button')).find(
			(button) => button.textContent?.includes('Files'),
		) as HTMLElement | undefined;
		filesButton?.click();
		expect(selectSurfaceItem).toHaveBeenCalledWith('filter-tabs', 'files');
	});

	it('renders the detached placeholder for detached page-tools', () => {
		const nav = makeNavMock({ activePage: 'ops' });
		teardown = withContext(
			target,
			FrameDashboardShell,
			makeShellProps({ detachedTabs: { 'page-tools': true } }),
			[[FRAME_NAVIGATION_KEY, nav]],
		);
		flushSync();
		expect(target.querySelector('.vm-page-external[data-vm-tab-id="page-tools"]')).toBeTruthy();
	});

	it('wraps statistics and filters pages with the active dashboard page marker', () => {
		const statsNav = makeNavMock({ activePage: 'statistics' });
		teardown = withContext(target, FrameDashboardShell, makeShellProps(), [
			[FRAME_NAVIGATION_KEY, statsNav],
		]);
		flushSync();
		expect(target.querySelector('.vm-dashboard-active-page[data-page="statistics"]')).toBeTruthy();

		teardown.destroy();
		target.replaceChildren();

		const filtersNav = makeNavMock({ activePage: 'filters' });
		teardown = withContext(target, FrameDashboardShell, makeShellProps(), [
			[FRAME_NAVIGATION_KEY, filtersNav],
		]);
		flushSync();
		expect(target.querySelector('.vm-dashboard-active-page[data-page="filters"]')).toBeTruthy();
	});
});
