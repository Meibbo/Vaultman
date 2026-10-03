import { ItemView, type ViewStateResult, type WorkspaceLeaf } from 'obsidian';
import type { VaultmanPlugin } from './main';
import { mount, unmount } from 'svelte';
import VaultmanFrameSvelte from './VaultmanFrame.svelte';
import { translate } from './i18n/index';
import { workspaceTabIdentity } from './logic/logicWorkspaceTabIdentity';
import { isSameWorkspaceLeaf } from './logic/logicExplorerViewportActivation';
import {
	EMPTY_REGISTRY,
	ensureInstance,
	setInstanceSurfacePosition,
} from './logic/logicInstanceRegistry';
import {
	measureSceneAsync,
	measureSceneSync,
} from './logic/logicScenePerformance';
import type { FrontmatterPropertyRevealRequest } from './services/serviceFrontmatterPropertyReveal';
import type { SceneEngineSurface } from './logic/logicSasiSceneActions';
import type { StatisticsDataTab } from './logic/logicStatisticsNavigation';
import type { ExplorerViewMode } from './types/typeUI';
import {
	InstanceMountConflictError,
	InstanceMountUnavailableError,
	type InstanceMountLease,
} from './logic/logicInstanceMountRegistry';

export const VAULTMAN_FRAME_TYPE = 'vaultman-frame';

type VaultmanFrameSvelteApi = ReturnType<typeof mount> & {
	/** U121-109: adoptar el ancla que llega en `setState`, despues del mount. */
	reanchorInstance?(id: string): void;
	focusContentSearch?(
		query?: string,
		modifiers?: { caseSensitive: boolean; isRegex: boolean },
	): Promise<void> | void;
	focusActiveExplorerSearch?(): Promise<void> | void;
	refreshActiveExplorerViewport?(): boolean | void;
	setShowToolbar?(value: boolean): void;
	revealCurrentFileProperty?(request: FrontmatterPropertyRevealRequest): boolean;
	isPropRevealActive?(): boolean;
	setSceneEngine?(surface: SceneEngineSurface, mode: ExplorerViewMode): boolean;
	invokeToolbarSasiAction?(actionId: string): Promise<boolean>;
	switchScene?(tab: StatisticsDataTab): boolean;
};

/**
 * Full-width explorer view shell.
 */
export class VaultmanFrame extends ItemView {
	private plugin: VaultmanPlugin;
	private svelteApp: VaultmanFrameSvelteApi | null = null;
	private viewportRefreshFrame: number | null = null;
	private surfacePositionFrame: number | null = null;
	private viewportRefreshWindow: Window | null = null;
	private _showToolbar: boolean | null = null;
	private mountLease: InstanceMountLease<WorkspaceLeaf> | null = null;
	private frameOpen = false;
	private tabIdentitySignature = '';
	workspaceInstanceId: string | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: VaultmanPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.register(plugin.onSettingsChange(() => this.refreshTabIdentity()));
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', (activeLeaf) => {
				if (isSameWorkspaceLeaf(activeLeaf, this.leaf)) {
					this.scheduleViewportRefresh();
				}
			}),
		);
		this.registerEvent(
			this.app.workspace.on('layout-change', () => {
				this.scheduleSurfacePositionSync();
			}),
		);
	}

	getViewType(): string {
		return VAULTMAN_FRAME_TYPE;
	}
	getDisplayText(): string {
		return translate(this.tabIdentity().labelKey);
	}
	getIcon(): string {
		return this.tabIdentity().icon;
	}

	private tabIdentity() {
		const scene = this.workspaceInstanceId
			? this.plugin.settings.instanceRegistry?.instances[this.workspaceInstanceId]?.activeScene
			: undefined;
		return workspaceTabIdentity(this.plugin.settings.workspaceTabMirrorsScene === true, scene);
	}

	private refreshTabIdentity(): void {
		const signature = `${this.getIcon()}:${this.getDisplayText()}`;
		if (signature === this.tabIdentitySignature) return;
		this.tabIdentitySignature = signature;
		if ('updateHeader' in this.leaf && typeof this.leaf.updateHeader === 'function') {
			this.leaf.updateHeader();
		}
	}

	getState(): Record<string, unknown> {
		return {
			...super.getState(),
			showToolbar: this._showToolbar,
			workspaceInstanceId: this.workspaceInstanceId,
		};
	}

	async setState(state: unknown, result: ViewStateResult): Promise<void> {
		const anchored = typeof state === 'object' && state !== null && 'workspaceInstanceId' in state
			? state.workspaceInstanceId : undefined;
		if (typeof anchored === 'string' && anchored.length > 0) {
			await this.attachExactInstance(anchored);
		}
		if (
			typeof state === 'object' &&
			state !== null &&
			'showToolbar' in state &&
			typeof state.showToolbar === 'boolean'
		) {
			this._showToolbar = state.showToolbar;
			this.svelteApp?.setShowToolbar?.(state.showToolbar);
		}
		this.mountFrame();
		return super.setState(state, result);
	}

	async onOpen(): Promise<void> {
		const { contentEl } = this;
		this.frameOpen = true;
		measureSceneSync('scene.lifecycle.open.shell', undefined, () => {
			contentEl.empty();
			contentEl.addClass('vaultman-frame');
		});
		const anchored = this.readAnchoredInstanceId();
		const existingLease = this.plugin.workspaceMountForLeaf(this.leaf);
		if (existingLease && anchored && existingLease.instanceId !== anchored) {
			throw new InstanceMountConflictError(anchored, existingLease.instanceId);
		}
		const instanceId = existingLease?.instanceId ?? anchored;
		// Obsidian can supply the exact anchor later in setState. Until then
		// this shell has no identity and must neither mint nor mount a default.
		if (instanceId) await this.attachExactInstance(instanceId);
		this.mountFrame();
	}

	private mountFrame(): void {
		const workspaceInstanceId = this.workspaceInstanceId;
		if (!this.frameOpen || this.svelteApp || !workspaceInstanceId || !this.mountLease) return;
		this.scheduleSurfacePositionSync();

		this.svelteApp = measureSceneSync(
			'scene.lifecycle.open.mount',
			undefined,
			() =>
				mount(VaultmanFrameSvelte, {
					target: this.contentEl,
					props: {
						plugin: this.plugin,
						workspaceInstanceId,
						initialShowToolbar: this._showToolbar,
						onShowToolbarChange: (val: boolean) => {
							this._showToolbar = val;
							this.app.workspace.requestSaveLayout();
						},
					},
				}) as VaultmanFrameSvelteApi,
		);
		this.scheduleViewportRefresh();
	}

	private readAnchoredInstanceId(): string | null {
		const anchored = (
			this.leaf.getViewState?.() as
				| { state?: { workspaceInstanceId?: unknown } }
				| undefined
		)?.state?.workspaceInstanceId;
		return typeof anchored === 'string' && anchored.length > 0 ? anchored : null;
	}

	private async attachExactInstance(instanceId: string): Promise<void> {
		if (this.mountLease) {
			if (this.mountLease.instanceId !== instanceId) {
				throw new InstanceMountConflictError(instanceId, this.mountLease.instanceId);
			}
			return;
		}
		const registry = this.plugin.settings.instanceRegistry ?? EMPTY_REGISTRY;
		const record = registry.instances[instanceId];
		if (record?.homeSurface && record.tombstoned) {
			throw new InstanceMountUnavailableError(instanceId, 'tombstoned-instance');
		}
		// Compatibility is restricted to the exact anchor supplied by Obsidian:
		// old records may be absent or tombstoned by the legacy reconciliation.
		// Claim the live mount before changing any local or durable identity.
		const adopted = this.plugin.adoptWorkspaceMount(instanceId, this.leaf);
		if (!adopted.ok) {
			throw new InstanceMountConflictError(instanceId, adopted.ownerId);
		}
		this.mountLease = adopted.lease;
		this.workspaceInstanceId = instanceId;
		const ensured = ensureInstance(registry, instanceId);
		this.plugin.settings.instanceRegistry = ensured.registry;
		if (ensured.created || record?.tombstoned) await this.plugin.saveSettings();
	}

	hasExactWorkspaceInstanceIdentity(): boolean {
		return this.mountLease !== null;
	}

	async onClose(): Promise<void> {
		this.frameOpen = false;
		measureSceneSync('scene.lifecycle.close.cancel', undefined, () => {
			this.cancelViewportRefresh();
		});
		if (this.svelteApp) {
			const mounted = this.svelteApp;
			await measureSceneAsync(
				'scene.lifecycle.close.unmount',
				undefined,
				async () => {
					await unmount(mounted);
				},
			);
			this.svelteApp = null;
		}
		measureSceneSync('scene.lifecycle.close.cleanup', undefined, () => {
			this.contentEl.empty();
		});
		const lease = this.mountLease;
		this.mountLease = null;
		if (lease) this.plugin.releaseWorkspaceMount(lease);
	}

	async focusContentSearch(
		query?: string,
		modifiers?: { caseSensitive: boolean; isRegex: boolean },
	): Promise<void> {
		await this.svelteApp?.focusContentSearch?.(query, modifiers);
	}

	async focusActiveExplorerSearch(): Promise<void> {
		await this.svelteApp?.focusActiveExplorerSearch?.();
	}

	get scene_prop_reveal(): boolean {
		return Boolean(this.svelteApp?.isPropRevealActive?.());
	}

	revealCurrentFileProperty(request: FrontmatterPropertyRevealRequest): boolean {
		return this.svelteApp?.revealCurrentFileProperty?.(request) ?? false;
	}

	setSceneEngine(surface: SceneEngineSurface, mode: ExplorerViewMode): boolean {
		return this.svelteApp?.setSceneEngine?.(surface, mode) ?? false;
	}

	async invokeToolbarSasiAction(actionId: string): Promise<boolean> {
		return (await this.svelteApp?.invokeToolbarSasiAction?.(actionId)) ?? false;
	}

	switchScene(tab: StatisticsDataTab): boolean {
		return this.svelteApp?.switchScene?.(tab) ?? false;
	}

	onResize(): void {
		this.scheduleViewportRefresh();
	}

	private scheduleViewportRefresh(): void {
		if (this.viewportRefreshFrame !== null) return;

		const ownerWindow = this.contentEl.ownerDocument.defaultView;
		if (!ownerWindow) {
			measureSceneSync('scene.lifecycle.viewport-refresh', undefined, () => {
				this.svelteApp?.refreshActiveExplorerViewport?.();
			});
			return;
		}

		this.viewportRefreshWindow = ownerWindow;
		this.viewportRefreshFrame = ownerWindow.requestAnimationFrame(() => {
			this.viewportRefreshFrame = null;
			this.viewportRefreshWindow = null;
			measureSceneSync('scene.lifecycle.viewport-refresh', undefined, () => {
				this.svelteApp?.refreshActiveExplorerViewport?.();
			});
		});
	}

	private scheduleSurfacePositionSync(): void {
		if (this.surfacePositionFrame !== null) return;
		const ownerWindow = this.contentEl.ownerDocument.defaultView;
		if (!ownerWindow) return;
		this.surfacePositionFrame = ownerWindow.requestAnimationFrame(() => {
			this.surfacePositionFrame = null;
			this.plugin.readdressWorkspaceMount(this.leaf);
			let current = this.leaf.parent;
			let surfacePosition: 'left-sidebar' | 'right-sidebar' | 'main-leaf' = 'main-leaf';
			while (current) {
				if (current === this.app.workspace.leftSplit) {
					surfacePosition = 'left-sidebar';
					break;
				}
				if (current === this.app.workspace.rightSplit) {
					surfacePosition = 'right-sidebar';
					break;
				}
				if (current === this.app.workspace.rootSplit) break;
				current = current.parent;
			}
			this.contentEl.dataset.surfacePosition = surfacePosition;
			this.containerEl.dataset.surfacePosition = surfacePosition;
			const registry = this.plugin.settings.instanceRegistry ?? EMPTY_REGISTRY;
			const next = setInstanceSurfacePosition(
				registry,
				this.workspaceInstanceId ?? '',
				surfacePosition,
			);
			if (next === registry) return;
			this.plugin.settings.instanceRegistry = next;
			void this.plugin.saveSettings();
		});
	}

	private cancelViewportRefresh(): void {
		if (this.viewportRefreshFrame !== null && this.viewportRefreshWindow) {
			this.viewportRefreshWindow.cancelAnimationFrame(
				this.viewportRefreshFrame,
			);
		}
		this.viewportRefreshFrame = null;
		this.viewportRefreshWindow = null;
		if (this.surfacePositionFrame !== null) {
			this.contentEl.ownerDocument.defaultView?.cancelAnimationFrame(
				this.surfacePositionFrame,
			);
		}
		this.surfacePositionFrame = null;
	}
}
