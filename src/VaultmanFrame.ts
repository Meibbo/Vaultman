import { ItemView, type ViewStateResult, type WorkspaceLeaf } from 'obsidian';
import type { VaultmanPlugin } from './main';
import { mount, unmount } from 'svelte';
import VaultmanFrameSvelte from './VaultmanFrame.svelte';
import { translate } from './i18n/index';
import { isSameWorkspaceLeaf } from './logic/logicExplorerViewportActivation';
import {
	adoptOrMintInstance,
	EMPTY_REGISTRY,
	ensureInstance,
} from './logic/logicInstanceRegistry';
import {
	measureSceneAsync,
	measureSceneSync,
} from './logic/logicScenePerformance';

export const VAULTMAN_FRAME_TYPE = 'vaultman-frame';

type VaultmanFrameSvelteApi = ReturnType<typeof mount> & {
	focusContentSearch?(
		query?: string,
		modifiers?: { caseSensitive: boolean; isRegex: boolean },
	): Promise<void> | void;
	focusActiveExplorerSearch?(): Promise<void> | void;
	refreshActiveExplorerViewport?(): boolean | void;
	setShowToolbar?(value: boolean): void;
};

/**
 * Full-width explorer view shell.
 */
export class VaultmanFrame extends ItemView {
	private plugin: VaultmanPlugin;
	private svelteApp: VaultmanFrameSvelteApi | null = null;
	private viewportRefreshFrame: number | null = null;
	private viewportRefreshWindow: Window | null = null;
	private _showToolbar: boolean | null = null;
	workspaceInstanceId: string | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: VaultmanPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', (activeLeaf) => {
				if (isSameWorkspaceLeaf(activeLeaf, this.leaf)) {
					this.scheduleViewportRefresh();
				}
			}),
		);
	}

	getViewType(): string {
		return VAULTMAN_FRAME_TYPE;
	}
	getDisplayText(): string {
		return translate('plugin.frame_name');
	}
	getIcon(): string {
		return 'lucide-vault';
	}

	getState(): Record<string, unknown> {
		return {
			...super.getState(),
			showToolbar: this._showToolbar,
			workspaceInstanceId: this.workspaceInstanceId,
		};
	}

	async setState(state: unknown, result: ViewStateResult): Promise<void> {
		const anchored = (state as { workspaceInstanceId?: unknown })?.workspaceInstanceId;
		if (typeof anchored === 'string' && anchored.length > 0) {
			this.workspaceInstanceId = anchored;
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
		return super.setState(state, result);
	}

	async onOpen(): Promise<void> {
		const { contentEl } = this;
		// A partir de aqui el id es NO nulo. Se guarda en una constante local para que el
		// compilador lo sepa tambien: la prop lo exige `string`, y un `!` seria decirle al
		// compilador que confie en vez de demostrarselo.
		let instanceId = this.workspaceInstanceId;
		if (!instanceId) {
			// Sin ancla: puede ser una hoja nueva de verdad, o una recarga que descarto el
			// layout. Adoptar un registro huerfano con configuracion distingue los dos casos
			// sin preguntarle nada a Obsidian.
			const registry = this.plugin.settings.instanceRegistry ?? EMPTY_REGISTRY;
			const claimed = this.app.workspace
				.getLeavesOfType(VAULTMAN_FRAME_TYPE)
				.map(
					(leaf) =>
						(leaf.getViewState().state as { workspaceInstanceId?: string } | undefined)
							?.workspaceInstanceId,
				)
				.filter((id): id is string => Boolean(id));
			instanceId = adoptOrMintInstance(registry, claimed).id;
			this.workspaceInstanceId = instanceId;
			this.app.workspace.requestSaveLayout();
		}
		const ensured = ensureInstance(
			this.plugin.settings.instanceRegistry ?? EMPTY_REGISTRY,
			instanceId,
		);
		this.plugin.settings.instanceRegistry = ensured.registry;
		if (ensured.created) await this.plugin.saveSettings();
		measureSceneSync('scene.lifecycle.open.shell', undefined, () => {
			contentEl.empty();
			contentEl.addClass('vaultman-frame');
		});

		const workspaceInstanceId = instanceId;

		this.svelteApp = measureSceneSync(
			'scene.lifecycle.open.mount',
			undefined,
			() =>
				mount(VaultmanFrameSvelte, {
					target: contentEl,
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

	async onClose(): Promise<void> {
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

	private cancelViewportRefresh(): void {
		if (this.viewportRefreshFrame !== null && this.viewportRefreshWindow) {
			this.viewportRefreshWindow.cancelAnimationFrame(
				this.viewportRefreshFrame,
			);
		}
		this.viewportRefreshFrame = null;
		this.viewportRefreshWindow = null;
	}
}
