import type { VaultmanPlugin } from '../../main';
import type { PopupType } from '../../types/typePrimitives';

export class FrameOverlayController {
	private readonly plugin!: VaultmanPlugin;
	private readonly queueComponent!: unknown;
	private readonly activeFiltersComponent!: unknown;
	private readonly searchIslandComponent: unknown;
	private readonly onImportBases?: () => void;

	activePopup = $state<PopupType | null>(null);
	popupOpen = $state(false);
	isIslandOpen = $derived.by(
		() =>
			this.plugin.overlayState.isOpen('queue') || this.plugin.overlayState.isOpen('active-filters'),
	);

	constructor(
		plugin: VaultmanPlugin,
		queueComponent: unknown,
		activeFiltersComponent: unknown,
		options?: { searchIslandComponent?: unknown; onImportBases?: () => void },
	) {
		this.plugin = plugin;
		this.queueComponent = queueComponent;
		this.activeFiltersComponent = activeFiltersComponent;
		this.searchIslandComponent = options?.searchIslandComponent ?? null;
		this.onImportBases = options?.onImportBases;
	}

	closePopup(): void {
		this.popupOpen = false;
		activeWindow.setTimeout(() => {
			this.activePopup = null;
		}, 320);
	}

	toggleQueueIsland(): void {
		this.closeFiltersIsland();
		if (this.activePopup === 'active-filters') this.closePopup();
		if (this.plugin.overlayState.isOpen('queue')) {
			this.closeQueueIsland();
		} else {
			this.openQueueIsland();
		}
	}

	openQueueIsland(): void {
		this.closeFiltersIsland();
		this.plugin.overlayState.push({
			id: 'queue',
			component: this.queueComponent,
			props: {
				plugin: this.plugin,
				onClose: () => this.plugin.overlayState.popById('queue'),
			},
			dismissOnOutsideClick: this.plugin.settings.islandDismissOnOutsideClick,
		});
	}

	closeQueueIsland(): void {
		this.plugin.overlayState.popById('queue');
	}

	toggleFiltersIsland(): void {
		this.closeQueueIsland();
		if (this.plugin.overlayState.isOpen('active-filters')) {
			this.closeFiltersIsland();
		} else {
			this.openFiltersIsland();
		}
	}

	openFiltersIsland(): void {
		this.plugin.overlayState.push({
			id: 'active-filters',
			component: this.activeFiltersComponent,
			props: {
				plugin: this.plugin,
				onClose: () => this.plugin.overlayState.popById('active-filters'),
				onImportBases: () => {
					this.closeFiltersIsland();
					this.onImportBases?.();
				},
			},
			dismissOnOutsideClick: this.plugin.settings.islandDismissOnOutsideClick,
		});
	}

	closeFiltersIsland(): void {
		this.plugin.overlayState.popById('active-filters');
	}

	toggleSearchIsland(props?: Record<string, unknown>): void {
		if (this.plugin.overlayState.isOpen('search-island')) {
			this.closeSearchIsland();
		} else {
			this.openSearchIsland(props);
		}
	}

	openSearchIsland(props?: Record<string, unknown>): void {
		if (this.plugin.overlayState.isOpen('search-island')) return;
		this.plugin.overlayState.push({
			id: 'search-island',
			component: this.searchIslandComponent,
			props: {
				plugin: this.plugin,
				onClose: () => this.plugin.overlayState.popById('search-island'),
				...(props ?? {}),
			},
			dismissOnOutsideClick: this.plugin.settings.islandDismissOnOutsideClick,
		});
	}

	closeSearchIsland(): void {
		this.plugin.overlayState.popById('search-island');
	}
}

type FrameOverlayCommandHookHost = VaultmanPlugin & {
	openQueuePopupHook?: (() => void) | null;
	openFiltersPopupHook?: (() => void) | null;
};

export function installFrameOverlayCommandHooks(
	plugin: VaultmanPlugin,
	overlays: Pick<FrameOverlayController, 'toggleQueueIsland' | 'toggleFiltersIsland' | 'toggleSearchIsland'>,
): () => void {
	const host = plugin as FrameOverlayCommandHookHost;
	const openQueuePopup = () => overlays.toggleQueueIsland();
	const openFiltersPopup = () => overlays.toggleFiltersIsland();

	host.openQueuePopupHook = openQueuePopup;
	host.openFiltersPopupHook = openFiltersPopup;

	return () => {
		if (host.openQueuePopupHook === openQueuePopup) host.openQueuePopupHook = null;
		if (host.openFiltersPopupHook === openFiltersPopup) host.openFiltersPopupHook = null;
	};
}
