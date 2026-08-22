import { ItemView, type ViewStateResult, type WorkspaceLeaf } from 'obsidian';
import type { VaultmanPlugin } from './main';
import { mount, unmount } from 'svelte';
import VaultmanFrameSvelte from './VaultmanFrame.svelte';
import { translate } from './i18n/index';
import { isSameWorkspaceLeaf } from './logic/logicExplorerViewportActivation';
import {
	EMPTY_REGISTRY,
	ensureInstance,
	mintInstanceId,
} from './logic/logicInstanceRegistry';
import {
	measureSceneAsync,
	measureSceneSync,
} from './logic/logicScenePerformance';

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
			// U121-109: `onOpen()` corre ANTES que esto y no ve el ancla por ningun
			// lado, asi que acuna una identidad nueva y monta el Svelte con ella.
			// Cuando el ancla real llega aqui hay que ADOPTARLA, o la configuracion
			// de esa instancia queda huerfana y cada recarga acuna una mas.
			const previous = this.workspaceInstanceId;
			this.workspaceInstanceId = anchored;
			if (previous !== anchored) {
				const ensured = ensureInstance(
					this.plugin.settings.instanceRegistry ?? EMPTY_REGISTRY,
					anchored,
				);
				this.plugin.settings.instanceRegistry = ensured.registry;
				if (ensured.created) await this.plugin.saveSettings();
				this.svelteApp?.reanchorInstance?.(anchored);
			}
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
			// U121-109: Obsidian llama `onOpen()` ANTES que `setState()`, asi que al
			// restaurar una hoja el ancla que el workspace SI guardo todavia no ha
			// llegado a `this.workspaceInstanceId`. Se acunaba una identidad nueva,
			// se montaba el Svelte con ella -- y el puerto la captura con `untrack`,
			// para siempre--, y acto seguido `setState` dejaba el ancla buena en la
			// vista. Resultado: la hoja decia `vm-instance-putchit5` mientras su
			// puerto leia los defaults, y la configuracion de esa instancia quedaba
			// huerfana. Cada recarga acunaba ademas una instancia mas.
			//
			// Esto NO es la heuristica retirada el 2026-08-20: no adivina nada. Lee
			// el ancla que el propio workspace persistio para ESTA hoja. Cuando no
			// hay ancla seguimos acunando, que es el hueco de `SurfaceAddress`.
			const anchored = (
				this.leaf.getViewState?.() as
					| { state?: { workspaceInstanceId?: unknown } }
					| undefined
			)?.state?.workspaceInstanceId;
			if (typeof anchored === 'string' && anchored.length > 0) {
				instanceId = anchored;
				this.workspaceInstanceId = anchored;
			}
		}
		if (!instanceId) {
			// Sin ancla: se acuña una identidad nueva. ESTO ES INCOMPLETO A PROPOSITO.
			// Recuperar la instancia correcta tras un `reload without saving` exige saber QUE
			// superficie ocupaba -sidebar izquierdo, derecho, main, y en que ranura-, que es
			// `SurfaceAddress` y vive en el shard 02 del diseño. Aqui hubo una heuristica que
			// adoptaba "el huerfano mas antiguo con configuracion": se retiro el 2026-08-20
			// porque ADIVINABA la identidad y le asignaba a un panel la configuracion de otro.
			// Un fallo silencioso que da la configuracion equivocada es peor que perderla.
			const registry = this.plugin.settings.instanceRegistry ?? EMPTY_REGISTRY;
			instanceId = mintInstanceId(registry);
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
