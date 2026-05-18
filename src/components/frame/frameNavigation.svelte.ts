import type { TFile } from 'obsidian';
import type { VaultmanPlugin } from '../../main';
import { translate } from '../../index/i18n/lang';
import { FTabs, type TabConfig } from '../../types/typeTab';
import type { FabDef } from '../../types/typePrimitives';
import {
	resolveLayoutSettings,
	type LayoutSettings,
	type LayoutSurfaceContent,
} from '../../services/serviceLayout';
import type { LeafDetachState } from '../../services/serviceLeafDetach';
import { tabIdFromInner, type TabId } from '../../registry/tabRegistry';
import { openVaultmanFileSuggestModal } from '../../utils/fileSuggestModal';
import {
	createFramePageFabs,
	createFramePageIcons,
	createFramePageLabels,
	resolveFramePageOrder,
} from './framePages';
import type { FrameNavReorderController } from './frameNavReorder.svelte';
import type { FrameOverlayController } from './frameOverlays.svelte';
import type { FrameViewportController } from './frameViewport';
import type { FiltersSearchTab } from './frameFiltersSearch';

export const FRAME_NAVIGATION_KEY: unique symbol = Symbol('frame.navigation');

export type FiltersTab = FiltersSearchTab;

export type SurfaceNavItem = TabConfig & {
	label: string;
	disabled?: boolean;
	faint?: boolean;
	dot?: boolean;
};

export class FrameNavigationService {
	readonly #plugin: VaultmanPlugin;
	readonly #overlays: FrameOverlayController;
	readonly #getSelectedCount: () => number;
	readonly #pageLabels: Record<string, string> = createFramePageLabels();
	readonly #pageIcons: Record<string, string> = createFramePageIcons();

	#pageOrder = $state<string[]>([]);
	#pageRenderKey = $state(0);
	#filtersBaseChooseMode = $state(false);
	#statsPreviewFile = $state<TFile | null>(null);
	#activePage = $state('ops');
	#toolsActiveTab = $state('layout');
	#filtersActiveTab = $state<FiltersTab>('props');
	#viewport: FrameViewportController | null = null;
	#navReorder: FrameNavReorderController | null = null;

	constructor(
		plugin: VaultmanPlugin,
		overlays: FrameOverlayController,
		getSelectedCount: () => number,
	) {
		this.#plugin = plugin;
		this.#overlays = overlays;
		this.#getSelectedCount = getSelectedCount;
		this.#pageOrder = resolveFramePageOrder(plugin.settings.pageOrder);
		this.#activePage = this.#pageOrder[0] ?? 'ops';
	}

	attachViewport(viewport: FrameViewportController): void {
		this.#viewport = viewport;
	}

	attachNavReorder(navReorder: FrameNavReorderController): void {
		this.#navReorder = navReorder;
	}

	get viewport(): FrameViewportController {
		if (!this.#viewport) throw new Error('FrameNavigationService viewport is not attached.');
		return this.#viewport;
	}

	get navReorder(): FrameNavReorderController {
		if (!this.#navReorder) throw new Error('FrameNavigationService navReorder is not attached.');
		return this.#navReorder;
	}

	get activePage(): string {
		return this.#activePage;
	}

	get pageOrder(): readonly string[] {
		return this.#pageOrder;
	}

	setPageOrder(order: readonly string[]): void {
		this.#pageOrder = order.filter((page): page is string => typeof page === 'string');
		if (!this.#pageOrder.includes(this.#activePage)) {
			this.#activePage = this.#pageOrder[0] ?? 'ops';
		}
		this.#viewport?.applyPageTransform(true);
	}

	get pageIndex(): number {
		return this.#pageOrder.indexOf(this.#activePage);
	}

	get pageRenderKey(): number {
		return this.#pageRenderKey;
	}

	bumpRenderKey(): void {
		this.#pageRenderKey++;
	}

	get toolsActiveTab(): string {
		return this.#toolsActiveTab;
	}

	set toolsActiveTab(v: string) {
		this.#toolsActiveTab = v;
	}

	get statsPreviewFile(): TFile | null {
		return this.#statsPreviewFile;
	}

	get filtersBaseChooseMode(): boolean {
		return this.#filtersBaseChooseMode;
	}

	set filtersBaseChooseMode(v: boolean) {
		this.#filtersBaseChooseMode = v;
	}

	get filtersActiveTab(): FiltersTab {
		return this.#filtersActiveTab;
	}

	set filtersActiveTab(v: FiltersTab) {
		this.#filtersActiveTab = v;
	}

	get layoutSettings(): LayoutSettings {
		return resolveLayoutSettings(this.#plugin.settings.layout);
	}

	get detachedTabs(): LeafDetachState {
		return this.#plugin.leafDetachService?.getState() ?? {};
	}

	get filterTabsExternallyMounted(): boolean {
		return (
			this.layoutSettings.dock.content === 'filter-tabs' ||
			this.layoutSettings.tabs.content === 'filter-tabs'
		);
	}

	get framePageTabs(): SurfaceNavItem[] {
		return this.#pageOrder.map((pageId) => ({
			id: pageId,
			icon: this.#pageIcons[pageId] ?? 'lucide-circle',
			label: this.#pageLabels[pageId] ?? pageId,
		}));
	}

	get filterTabItems(): SurfaceNavItem[] {
		return FTabs.map((tab) => ({
			...tab,
			label: tab.label ?? (tab.labelKey ? translate(tab.labelKey) : tab.id),
		}));
	}

	get topTabItems(): SurfaceNavItem[] {
		return this.#itemsForSurface(this.layoutSettings.tabs.content);
	}

	get topTabActive(): string {
		return this.#activeForSurface(this.layoutSettings.tabs.content);
	}

	get topExternalTabIds(): string[] {
		return this.#externalIdsForSurface(this.layoutSettings.tabs.content);
	}

	get dockItems(): SurfaceNavItem[] {
		return this.#itemsForSurface(this.layoutSettings.dock.content);
	}

	get dockActive(): string {
		return this.#activeForSurface(this.layoutSettings.dock.content);
	}

	get dockExternalTabIds(): string[] {
		return this.#externalIdsForSurface(this.layoutSettings.dock.content);
	}

	get dockUsesFramePages(): boolean {
		return this.layoutSettings.dock.content === 'frame-pages';
	}

	get pageFabs(): Record<string, { left: FabDef | null; right: FabDef | null }> {
		return createFramePageFabs(
			this.#plugin,
			() => this.#overlays.toggleQueueIsland(),
			() => this.#overlays.toggleFiltersIsland(),
			{
				filtersBaseChooseMode: this.#filtersBaseChooseMode,
				enterBasesImportMode: () => this.enterBasesImport(),
				exitBasesImportMode: () => this.exitBasesImport(),
				statsPreviewActive: this.#statsPreviewFile !== null,
				openStatsNote: () => this.openStatsNote(),
				showStatsPage: () => this.showStatsPage(),
			},
		);
	}

	get leftFab(): FabDef | null {
		return this.pageFabs[this.#activePage]?.left ?? null;
	}

	get rightFab(): FabDef | null {
		return this.pageFabs[this.#activePage]?.right ?? null;
	}

	navigateTo(page: string): void {
		if (this.#activePage !== page) {
			this.#overlays.closeQueueIsland();
			this.#overlays.closeFiltersIsland();
			if (this.#overlays.activePopup === 'active-filters') this.#overlays.closePopup();
		}
		if (page !== 'filters') this.#filtersBaseChooseMode = false;
		this.#activePage = page;
		this.#viewport?.applyPageTransform(true);
	}

	openDiffIntent(): void {
		this.#overlays.closeQueueIsland();
		this.#overlays.closeFiltersIsland();
		if (this.#overlays.popupOpen) this.#overlays.closePopup();
		this.#activePage = 'ops';
		this.#toolsActiveTab = 'file_diff';
		this.#viewport?.applyPageTransform(true);
	}

	enterBasesImport(): void {
		this.#filtersBaseChooseMode = true;
		this.#filtersActiveTab = 'files';
		if (this.#activePage !== 'filters') this.#activePage = 'filters';
		this.#viewport?.applyPageTransform(true);
	}

	exitBasesImport(): void {
		this.#filtersBaseChooseMode = false;
	}

	openStatsNote(): void {
		openVaultmanFileSuggestModal(this.#plugin.app, (file) => {
			this.#statsPreviewFile = file;
			this.#activePage = 'statistics';
			this.#viewport?.applyPageTransform(true);
		});
	}

	showStatsPage(): void {
		this.#statsPreviewFile = null;
	}

	selectSurfaceItem(content: LayoutSurfaceContent, id: string): void {
		const detachedTabId = this.#detachedTabIdForSurfaceItem(content, id);
		if (detachedTabId) {
			void this.#plugin.spawnTabLeaf(detachedTabId);
			return;
		}
		if (content === 'filter-tabs') {
			this.#filtersActiveTab = id as FiltersTab;
			if (this.#activePage !== 'filters') this.navigateTo('filters');
			return;
		}
		if (content === 'frame-pages') {
			this.navigateTo(id);
		}
	}

	#itemsForSurface(content: LayoutSurfaceContent): SurfaceNavItem[] {
		if (content === 'frame-pages') {
			const selected = this.#getSelectedCount();
			return this.framePageTabs.map((tab) => ({
				...tab,
				dot: tab.id === 'statistics' && selected > 0,
			}));
		}
		if (content === 'filter-tabs') {
			return this.filterTabItems.map((tab) => {
				const disabled = this.#filtersBaseChooseMode && tab.id !== 'files';
				return { ...tab, disabled, faint: disabled };
			});
		}
		return [];
	}

	#activeForSurface(content: LayoutSurfaceContent): string {
		if (content === 'filter-tabs') {
			return this.#activePage === 'filters' ? this.#filtersActiveTab : '';
		}
		if (content === 'frame-pages') return this.#activePage;
		return '';
	}

	#externalIdsForSurface(content: LayoutSurfaceContent): string[] {
		return this.#itemsForSurface(content)
			.map((item) => (this.#detachedTabIdForSurfaceItem(content, item.id) ? item.id : null))
			.filter((id): id is string => Boolean(id));
	}

	#detachedTabIdForSurfaceItem(content: LayoutSurfaceContent, id: string): TabId | null {
		const tabId = this.#tabIdForSurfaceItem(content, id);
		return tabId && this.detachedTabs[tabId] === true ? tabId : null;
	}

	#tabIdForSurfaceItem(content: LayoutSurfaceContent, id: string): TabId | null {
		if (content === 'filter-tabs') return tabIdFromInner(id);
		if (content === 'frame-pages' && id === 'ops') return 'page-tools';
		return null;
	}
}
