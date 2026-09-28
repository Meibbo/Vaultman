/** Modos mutuamente exclusivos de una instancia de Scene (spec-04 §proyección-exclusiva). */
export const PANEL_KINDS = ['panelExplorer', 'panelContent'] as const;
export type PanelKind = (typeof PANEL_KINDS)[number];

/** Handle mínimo de interacción del panel source (explorer) y target (content). */
export interface PanelHandle {
	readonly id: string;
	readonly kind: PanelKind;
	readonly workspaceInstanceId: string;
	focus(): boolean | void;
	getSearchTerm?(): string;
	getSelectedNodeIds?(): ReadonlySet<string>;
	restoreFocus?(): void;
	revealNode?(id: string): void;
	setSettingSceneMode?(mode: 'explorer' | 'content'): void;
	getContainerEl?(): HTMLElement;
}

/**
 * Locator efímero de destino en settings (design-01 §1.1 + decisiones OQ1/OQ3).
 * Identidad compuesta {tabId, definitionName} + instancia dueña + documento activo.
 */
export interface ContentLocator {
	/** ID de tab nativo de Obsidian (e.g. 'editor', 'community-plugins', o ID de plugin). */
	readonly tabId: string;
	/** definition.name (único campo de identidad estable garantizado en Obsidian 1.13.7). */
	readonly definitionName: string;
	/** Page o pagePath nativo si la fila lo provee (ref.page / ref.pagePath). */
	readonly pagePath?: string;
	/** ID de la instancia de Scene que originó este contenido. */
	readonly ownerSceneInstanceId: string;
	/** Workspace ID de la instancia dueña (decisión OQ1 vinculante). */
	readonly workspace: string;
	/** Documento de montaje para soporte popout window (decisión OQ3 vinculante). */
	readonly targetDocument?: Document;
	/** Comprobación viva de validez en el runtime: app.setting.settingTabs.includes(tabId). */
	readonly tabRef: () => boolean;
}

/** Instancia activa de contenido montado. */
export interface ContentInstance {
	readonly locator: ContentLocator;
	readonly ownerSceneInstanceId: string;
	readonly sourcePanelId: string;
	readonly containerEl?: HTMLElement;
	readonly openedAt: number;
	readonly unmount?: () => void;
}

/** Resultado de la ejecución del go_to_setting_content. */
export type GoToResult =
	| { action: 'reused'; instance: ContentInstance }
	| { action: 'created'; instance: ContentInstance }
	| {
			action: 'invalid';
			reason:
				| 'tab-removed'
				| 'definition-missing'
				| 'unsupported-surface'
				| 'popout-detached';
	  }
	| {
			action: 'fallback-modal';
			tabId: string;
			reason: 'file-folder-secret' | 'tab-only';
	  };

/** Puerto del registro en memoria para el mediador. */
export interface GoToRegistryPort {
	register(instance: ContentInstance): () => void;
	unregister(ownerSceneInstanceId: string): void;
	findByLocator(locator: ContentLocator): ContentInstance | undefined;
	findExisting(
		workspace: string,
		tabId: string,
		definitionName: string,
	): ContentInstance | undefined;
	invalidateTab(tabId: string): number;
	clear(): void;
}
