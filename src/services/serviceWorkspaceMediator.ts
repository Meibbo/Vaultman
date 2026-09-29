import type { App } from 'obsidian';
import type {
	ContentInstance,
	ContentLocator,
	GoToRegistryPort,
	GoToResult,
	PanelHandle,
} from '../types/typePanelScene';
import type { SettingSceneActivatableRow } from '../logic/logicSettingSceneActivation';
import {
	executeSettingSceneActivation,
	openSettingsTabById,
	scrollToSettingTarget,
} from '../logic/logicSettingSceneActivation';
import type { SettingSceneDefinitionInfo } from '../logic/logicSettingSceneContent';

/**
 * Servicio mediador en memoria para coordinar locators efímeros y retorno de foco.
 * Sustituye el anclaje sandbox serviceWorkspaceMediator.svelte.ts sin dependencias de Svelte runes.
 */
export class WorkspaceMediatorService implements GoToRegistryPort {
	private readonly instances = new Map<string, ContentInstance>();
	private readonly panels = new Map<string, PanelHandle>();

	registerPanel(handle: PanelHandle): () => void {
		this.panels.set(handle.id, handle);
		return () => {
			this.panels.delete(handle.id);
		};
	}

	getPanel(panelId: string): PanelHandle | undefined {
		return this.panels.get(panelId);
	}

	register(instance: ContentInstance): () => void {
		this.instances.set(instance.ownerSceneInstanceId, instance);
		return () => {
			this.unregister(instance.ownerSceneInstanceId);
		};
	}

	unregister(ownerSceneInstanceId: string): void {
		const existing = this.instances.get(ownerSceneInstanceId);
		if (existing) {
			if (existing.unmount) {
				try {
					existing.unmount();
				} catch {
					// Teardown defensivo
				}
			}
			this.instances.delete(ownerSceneInstanceId);
		}
	}

	getInstance(ownerSceneInstanceId: string): ContentInstance | undefined {
		return this.instances.get(ownerSceneInstanceId);
	}

	getAllInstances(): ContentInstance[] {
		return [...this.instances.values()];
	}

	findByLocator(locator: ContentLocator): ContentInstance | undefined {
		return this.findExisting(locator.workspace, locator.tabId, locator.definitionName);
	}

	findExisting(
		workspace: string,
		tabId: string,
		definitionName: string,
	): ContentInstance | undefined {
		for (const instance of this.instances.values()) {
			if (
				instance.locator.workspace === workspace &&
				instance.locator.tabId === tabId &&
				instance.locator.definitionName === definitionName
			) {
				return instance;
			}
		}
		return undefined;
	}

	updateSourcePanel(ownerSceneInstanceId: string, sourcePanelId: string): boolean {
		const instance = this.instances.get(ownerSceneInstanceId);
		if (!instance) return false;
		const updated: ContentInstance = {
			...instance,
			sourcePanelId,
		};
		this.instances.set(ownerSceneInstanceId, updated);
		return true;
	}

	invalidateTab(tabId: string): number {
		let removed = 0;
		for (const [ownerId, instance] of [...this.instances.entries()]) {
			if (instance.locator.tabId === tabId) {
				this.unregister(ownerId);
				removed += 1;
			}
		}
		return removed;
	}

	invalidateWorkspace(workspace: string): number {
		let removed = 0;
		for (const [ownerId, instance] of [...this.instances.entries()]) {
			if (instance.locator.workspace === workspace) {
				this.unregister(ownerId);
				removed += 1;
			}
		}
		return removed;
	}

	clear(): void {
		for (const ownerId of [...this.instances.keys()]) {
			this.unregister(ownerId);
		}
		this.panels.clear();
	}
}

export function createWorkspaceMediator(): WorkspaceMediatorService {
	return new WorkspaceMediatorService();
}

/**
 * Crea un locator efímero garantizando que la identidad compuesta sea {tabId, definitionName}
 * dentro del workspace de la escena dueña, revalidable dinámicamente vía tabRef().
 */
export function createContentLocator(params: {
	tabId: string;
	definitionName: string;
	ownerSceneInstanceId: string;
	workspace: string;
	pagePath?: string;
	targetDocument?: Document;
	tabRef?: () => boolean;
	app?: App;
}): ContentLocator {
	const tabRef =
		params.tabRef ??
		(() => {
			if (!params.app) return true;
			const setting = (params.app as unknown as { setting?: { settingTabs?: unknown[]; pluginTabs?: unknown[] } }).setting;
			if (!setting) return false;
			const settingTabs = setting.settingTabs;
			if (
				Array.isArray(settingTabs) &&
				settingTabs.some((t) => {
					if (typeof t === 'string') return t === params.tabId;
					if (t && typeof t === 'object' && 'id' in t) {
						return t.id === params.tabId;
					}
					return false;
				})
			) {
				return true;
			}
			const pluginTabs = setting.pluginTabs;
			if (
				Array.isArray(pluginTabs) &&
				pluginTabs.some((t) => {
					if (typeof t === 'string') return t === params.tabId;
					if (t && typeof t === 'object' && 'id' in t) {
						return t.id === params.tabId;
					}
					return false;
				})
			) {
				return true;
			}
			return false;
		});

	return {
		tabId: params.tabId,
		definitionName: params.definitionName,
		ownerSceneInstanceId: params.ownerSceneInstanceId,
		workspace: params.workspace,
		pagePath: params.pagePath,
		targetDocument: params.targetDocument,
		tabRef,
	};
}

export interface ExecuteGoToSettingOptions {
	settingDefinitionInfo?: SettingSceneDefinitionInfo;
	containerEl?: HTMLElement;
	onUnmount?: () => void;
}

/**
 * Executor principal de go_to_setting_content en 8 pasos (design-01 §2.1 + u130-design-executor):
 * 1. RESOLVE — valida locator, evalúa tabRef(), filtra file/folder/secret hacia modal nativo
 * 2. LOCATE — busca en mediator por {workspace, tabId, definitionName}
 * 3. REUSE — si existe, enfoca leaf y actualiza back-link sin duplicar
 * 4. CREATE — si no existe, abre tab nativo vía F7, hace scroll reveal y gestiona popout
 * 5. FOCUS — conmuta escena a content y pasa foco al container
 * 6. REGISTER — crea ContentInstance y la guarda en el mediador
 * 7. CLOSE/RETURN — helper closeSettingContent desregistra y devuelve foco a source
 * 8. RETURN-TO-SOURCE — helper returnToSourceExplorer conmuta a explorer preservando búsqueda y selección
 */
export async function executeGoToSettingContent(
	app: App,
	locator: ContentLocator,
	sourcePanel: PanelHandle,
	mediator: WorkspaceMediatorService,
	options?: ExecuteGoToSettingOptions,
): Promise<GoToResult> {
	// Paso 1: RESOLVE
	if (!locator.tabId) {
		return { action: 'invalid', reason: 'tab-removed' };
	}

	if (typeof locator.tabRef === 'function' && !locator.tabRef()) {
		return { action: 'invalid', reason: 'tab-removed' };
	}

	if (locator.targetDocument && !locator.targetDocument.defaultView) {
		return { action: 'invalid', reason: 'popout-detached' };
	}

	// Guardia de superficie no soportada (File / Folder / Secret):
	// Se aborta la vía de panel y se enruta de inmediato al modal nativo con highlight exacto F7
	if (
		options?.settingDefinitionInfo?.control &&
		['file', 'folder', 'secret'].includes(options.settingDefinitionInfo.control)
	) {
		executeSettingSceneActivation(app, {
			kind: 'open-settings-tab',
			tab: locator.tabId,
			target: locator.definitionName
				? {
						tab: locator.tabId,
						page: '',
						pagePath: locator.pagePath ?? '',
						definition: locator.definitionName,
				  }
				: undefined,
		});
		return {
			action: 'fallback-modal',
			tabId: locator.tabId,
			reason: 'file-folder-secret',
		};
	}

	// Sin page/definition en la fila: abre tab (vía F7 existente)
	if (!locator.definitionName || !locator.definitionName.trim()) {
		executeSettingSceneActivation(app, {
			kind: 'open-settings-tab',
			tab: locator.tabId,
		});
		return {
			action: 'fallback-modal',
			tabId: locator.tabId,
			reason: 'tab-only',
		};
	}

	if (options?.settingDefinitionInfo?.visible === false) {
		return { action: 'invalid', reason: 'definition-missing' };
	}

	// Paso 2: LOCATE
	const existing = mediator.findExisting(
		locator.workspace,
		locator.tabId,
		locator.definitionName,
	);

	// Paso 3: REUSE
	if (existing) {
		mediator.updateSourcePanel(existing.ownerSceneInstanceId, sourcePanel.id);
		const currentInstance = mediator.getInstance(existing.ownerSceneInstanceId) ?? existing;
		currentInstance.containerEl?.focus?.();
		sourcePanel.setSettingSceneMode?.('content');
		return { action: 'reused', instance: currentInstance };
	}

	// Paso 4: CREATE
	// a. Apertura de tab nativo
	const opened = openSettingsTabById(app, locator.tabId);
	if (!opened) {
		return { action: 'invalid', reason: 'tab-removed' };
	}

	// b. Reutilización F7 (scrollToSettingTarget)
	try {
		scrollToSettingTarget(app, {
			tab: locator.tabId,
			page: '',
			pagePath: locator.pagePath ?? '',
			definition: locator.definitionName,
		});
	} catch {
		// Best-effort reveal
	}

	// c. Reparenting / Renderizado en panelContent
	const containerEl = options?.containerEl ?? sourcePanel.getContainerEl?.();

	// d. Guardia de Popout (OQ3)
	if (locator.targetDocument && !locator.targetDocument.defaultView) {
		return { action: 'invalid', reason: 'popout-detached' };
	}

	// Paso 5: FOCUS
	sourcePanel.setSettingSceneMode?.('content');
	containerEl?.focus?.();

	// Paso 6: REGISTER
	const instance: ContentInstance = {
		locator,
		ownerSceneInstanceId: locator.ownerSceneInstanceId,
		sourcePanelId: sourcePanel.id,
		containerEl,
		openedAt: Date.now(),
		unmount: options?.onUnmount,
	};

	mediator.register(instance);
	if (!mediator.getPanel(sourcePanel.id)) {
		mediator.registerPanel(sourcePanel);
	}

	return { action: 'created', instance };
}

/**
 * Permite ejecutar go_to directamente desde una fila activable (SettingSceneActivatableRow).
 * Si la fila carece de definition/page, abre el tab por vía F7 nativa.
 */
export async function executeGoToSettingRow(
	app: App,
	row: SettingSceneActivatableRow,
	ownerSceneInstanceId: string,
	workspace: string,
	sourcePanel: PanelHandle,
	mediator: WorkspaceMediatorService,
	options?: ExecuteGoToSettingOptions & {
		targetDocument?: Document;
		tabRef?: () => boolean;
	},
): Promise<GoToResult> {
	const def = (row.settingsDefinition ?? '').trim();
	const page = (row.settingsPage ?? '').trim();
	const pagePath = (row.settingsPagePath ?? '').trim();

	// Sin page/definition en la fila: abre tab (vía F7 existente)
	if (!def && !page && !pagePath) {
		executeSettingSceneActivation(app, {
			kind: 'open-settings-tab',
			tab: row.settingsTab,
		});
		return {
			action: 'fallback-modal',
			tabId: row.settingsTab,
			reason: 'tab-only',
		};
	}

	const locator = createContentLocator({
		tabId: row.settingsTab,
		definitionName: def,
		pagePath: pagePath || page || undefined,
		ownerSceneInstanceId,
		workspace,
		targetDocument: options?.targetDocument,
		tabRef: options?.tabRef,
		app,
	});

	return executeGoToSettingContent(app, locator, sourcePanel, mediator, options);
}

/**
 * Paso 7: CLOSE / RETURN.
 * Desregistra la instancia del mediador, dispara el unmount y restaura foco al explorer de origen.
 */
export function closeSettingContent(
	ownerSceneInstanceId: string,
	mediator: WorkspaceMediatorService,
): boolean {
	const instance = mediator.getInstance(ownerSceneInstanceId);
	if (!instance) return false;
	const sourcePanel = mediator.getPanel(instance.sourcePanelId);
	mediator.unregister(ownerSceneInstanceId);
	if (sourcePanel) {
		sourcePanel.setSettingSceneMode?.('explorer');
		if (sourcePanel.restoreFocus) {
			sourcePanel.restoreFocus();
		} else {
			sourcePanel.focus();
		}
	}
	return true;
}

/**
 * Paso 8: RETURN-TO-SOURCE.
 * Conmuta la escena de vuelta a modo explorer preservando búsqueda y selección intactas.
 */
export function returnToSourceExplorer(
	ownerSceneInstanceId: string,
	mediator: WorkspaceMediatorService,
): boolean {
	const instance = mediator.getInstance(ownerSceneInstanceId);
	if (!instance) return false;
	const sourcePanel = mediator.getPanel(instance.sourcePanelId);
	if (sourcePanel) {
		sourcePanel.setSettingSceneMode?.('explorer');
		if (sourcePanel.restoreFocus) {
			sourcePanel.restoreFocus();
		} else {
			sourcePanel.focus();
		}
		if (sourcePanel.revealNode && instance.locator.definitionName) {
			sourcePanel.revealNode(instance.locator.definitionName);
		}
		return true;
	}
	return false;
}
