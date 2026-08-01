import { MarkdownView, Notice, Plugin, TFile, WorkspaceLeaf } from 'obsidian';
import type { VaultmanSettings } from './types/typeSettings';
import { DEFAULT_SETTINGS } from './types/typeSettings';
import { PropertyIndexService } from './services/servicePropertyIndex';
import { FilterService } from './services/serviceFilter';
import { OperationQueueService } from './services/serviceOperationQueue';
import { VaultmanFrame, VAULTMAN_FRAME_TYPE } from './VaultmanFrame';
import { IconicService } from './services/serviceIcons';
import { PropertyTypeService } from './services/servicePropertyType';
import { ContextMenuService } from './services/serviceContextMenu';
import { registerContentActions } from './logic/logicContentContextMenu';
import { registerSnippetActions } from './logic/logicSnippetContextMenu';
import { registerPluginActions } from './logic/logicPluginContextMenu';
import { StatisticsCacheService } from './services/serviceStatisticsCache';
import { LastOpenedService } from './services/serviceLastOpened';
import { VaultmanSettingsTab } from './VaultmanSettings';
import { setLanguage, translate } from './i18n/index';
import {
	readVaultmanDragPayload,
	type VaultmanDragNodePayload,
	type VaultmanDragPayload,
} from './utils/dragPayload';
import {
	applyPropertyDragNodesToFrontmatter,
	propertyDragNodes,
} from './utils/dragFrontmatter';
import {
	appendTagsToMarkdownView,
	isMarkdownDropTarget,
	shouldAppendTagDrop,
	tagDragNodes,
	tagTextForDrop,
} from './utils/dragEditorDrop';
import { createPerfProbe } from './dev/perfProbe';
import { UpdatesModal } from './modals/modalUpdates';
import {
	openUpdatesBulletin,
	shouldShowUpdates,
} from './logic/logicUpdateNotice';
import {
	normalizeOpenMode,
	shouldToggleCloseFrame,
} from './logic/logicFrameActivation';
import { applyGlassBlurSetting } from './logic/logicGlassBlur';
import { seedDefaultViewCompositions } from './logic/logicViewCompositions';
import { normalizeGlyphColorChoice } from './logic/logicGlyphColor';

export class VaultmanPlugin extends Plugin {
	settings!: VaultmanSettings;
	private settingsChangeListeners = new Set<() => void>();

	// Core services — public so components/modals can access them
	propertyIndex!: PropertyIndexService;
	filterService!: FilterService;
	queueService!: OperationQueueService;
	iconicService!: IconicService;
	propertyTypeService!: PropertyTypeService;
	contextMenuService!: ContextMenuService;
	statisticsCache!: StatisticsCacheService;
	lastOpenedService!: LastOpenedService;

	// Native status bar element
	private statusBarEl!: HTMLElement;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.updateGlassBlur();

		setLanguage(this.settings.language);

		this.propertyIndex = new PropertyIndexService(this.app);
		this.filterService = new FilterService(this.app);
		this.queueService = new OperationQueueService(this.app, this.settings);
		this.iconicService = new IconicService(
			this.app,
			this.settings.iconicEnabled !== false,
			this.settings,
			() => this.saveSettings(),
		);
		this.propertyTypeService = new PropertyTypeService(this.app);
		this.contextMenuService = new ContextMenuService(this);
		this.statisticsCache = new StatisticsCacheService(this.app);
		this.lastOpenedService = new LastOpenedService(this.app, this.manifest.id);

		this.addChild(this.propertyIndex);
		this.addChild(this.filterService);
		this.addChild(this.queueService);
		this.addChild(this.iconicService);
		this.addChild(this.propertyTypeService);
		this.addChild(this.contextMenuService);
		this.addChild(this.statisticsCache);
		this.addChild(this.lastOpenedService);

		// BT5-036: content nodes are files; register their Rename/Delete panel
		// actions once so the Content menu kind is populated and configurable.
		registerContentActions(this);
		registerSnippetActions(this);
		registerPluginActions(this);

		const perfProbe = createPerfProbe({
			now: () => activeWindow.performance.now(),
			doc: activeDocument,
		});
		this.register(
			perfProbe.installGlobal(
				activeWindow as unknown as { __vaultmanPerfProbe?: unknown },
			),
		);

		this.registerEvent(
			this.app.metadataCache.on('resolved', () => {
				this.filterService.scheduleMetadataRefresh();
			}),
		);

		// BT5-013: `file-open` fires on a real activation only — hover previews
		// never reach it, so previewing a note cannot age it to "just opened".
		this.registerEvent(
			this.app.workspace.on('file-open', (file) => {
				this.lastOpenedService.handleFileOpen(file);
			}),
		);
		this.registerEvent(
			this.app.vault.on('rename', (file, oldPath) => {
				this.lastOpenedService.handleRename(file.path, oldPath);
			}),
		);
		this.registerEvent(
			this.app.vault.on('delete', (file) => {
				this.lastOpenedService.handleDelete(file.path);
			}),
		);

		this.statusBarEl = this.addStatusBarItem();
		this.statusBarEl.addClass('vaultman-native-statusbar');

		this.addRibbonIcon('lucide-vault', translate('plugin.open'), () => {
			void this.activateView();
		});

		this.registerView(
			VAULTMAN_FRAME_TYPE,
			(leaf) => new VaultmanFrame(leaf, this),
		);
		this.app.workspace.onLayoutReady(() => this.showUpdatesIfNeeded());

		this.addCommand({
			id: 'apply-queue',
			name: translate('command.apply_queue'),
			checkCallback: (checking) => {
				if (this.queueService.isEmpty) return false;
				if (!checking) {
					void this.queueService.execute();
				}
				return true;
			},
		});

		this.addCommand({
			id: 'open',
			name: translate('plugin.open'),
			callback: () => {
				void this.activateView();
			},
		});

		this.addCommand({
			id: 'open-updates',
			name: translate('command.open_updates'),
			callback: () => this.openUpdates(),
		});

		this.addCommand({
			id: 'focus-content-search',
			name: translate('command.focus_content_search'),
			callback: () => {
				void this.focusVaultmanContentSearch();
			},
		});

		this.addCommand({
			id: 'focus-active-explorer-search',
			name: translate('command.focus_active_explorer_search'),
			callback: () => {
				void this.focusVaultmanExplorerSearch();
			},
		});

		activeDocument.addEventListener('drop', this.handleVaultmanDrop, true);
		activeDocument.addEventListener(
			'dragover',
			this.handleVaultmanDragOver,
			true,
		);
		activeDocument.addEventListener(
			'dragend',
			this.handleVaultmanDragEnd,
			true,
		);
		this.register(() =>
			activeDocument.removeEventListener('drop', this.handleVaultmanDrop, true),
		);
		this.register(() =>
			activeDocument.removeEventListener(
				'dragover',
				this.handleVaultmanDragOver,
				true,
			),
		);
		this.register(() =>
			activeDocument.removeEventListener(
				'dragend',
				this.handleVaultmanDragEnd,
				true,
			),
		);

		this.addSettingTab(new VaultmanSettingsTab(this.app, this));
	}

	showDragActionGuide(text: string): void {
		const dragManager = this.dragManagerLike();
		if (typeof dragManager?.setAction === 'function') {
			dragManager.setAction(text);
		}
	}

	clearDragActionGuide(): void {
		const dragManager = this.dragManagerLike();
		if (typeof dragManager?.setAction === 'function') {
			dragManager.setAction(null);
		}
	}

	private async vaultmanFrameForCommand(): Promise<VaultmanFrame | null> {
		const leaf = await this.ensureVaultmanFrame();
		if (!leaf) return null;
		const view = leaf.view;
		return view instanceof VaultmanFrame ? view : null;
	}

	private async focusVaultmanContentSearch(query?: string): Promise<void> {
		const view = await this.vaultmanFrameForCommand();
		if (view) await view.focusContentSearch(query);
	}

	/**
	 * Public entry point for other services — the editor menu's "search selection
	 * in Vaultman" uses it. Kept separate from the private command helper so the
	 * BT5-067 guards, which slice `main.ts` between those two private methods,
	 * still describe the block they were written for.
	 */
	async openContentSearchWithQuery(query: string): Promise<void> {
		await this.focusVaultmanContentSearch(query);
	}

	private async focusVaultmanExplorerSearch(): Promise<void> {
		const view = await this.vaultmanFrameForCommand();
		if (view) await view.focusActiveExplorerSearch();
	}

	private readonly handleVaultmanDragOver = (event: DragEvent): void => {
		const payload = readVaultmanDragPayload(event);
		if (!payload) return;

		if (this.isWorkspaceTabDropTarget(event.target)) {
			if (this.hasNativeFileDragPayload()) return;
			if (!this.fileDragNodes(payload).length) return;
			event.preventDefault();
			if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
			this.showDragActionGuide(this.fileTabDropAction(payload));
			return;
		}

		const nodes = propertyDragNodes(payload);
		if (nodes.length > 0 && isMarkdownDropTarget(event.target)) {
			event.preventDefault();
			event.stopPropagation();
			if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
			this.showDragActionGuide(this.propertyDropAction(nodes));
			return;
		}

		const tagNodes = tagDragNodes(payload);
		if (
			tagNodes.length > 0 &&
			isMarkdownDropTarget(event.target) &&
			shouldAppendTagDrop(event.target)
		) {
			event.preventDefault();
			event.stopPropagation();
			if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
			this.showDragActionGuide(
				`Append ${tagNodes.length === 1 ? 'tag' : 'tags'}`,
			);
		}
	};

	private readonly handleVaultmanDrop = (event: DragEvent): void => {
		const payload = readVaultmanDragPayload(event);
		if (!payload) return;

		if (this.isWorkspaceTabDropTarget(event.target)) {
			if (this.hasNativeFileDragPayload()) return;
			const files = this.filesFromDragPayload(payload);
			if (files.length === 0) return;
			event.preventDefault();
			event.stopPropagation();
			void this.openDroppedFilesInNewTabs(files);
			this.clearDragActionGuide();
			return;
		}

		const nodes = propertyDragNodes(payload);
		if (nodes.length > 0) {
			if (!isMarkdownDropTarget(event.target)) return;
			const view =
				this.markdownViewFromDropTarget(event.target) ??
				this.app.workspace.getActiveViewOfType(MarkdownView);
			const file = view?.file ?? this.app.workspace.getActiveFile();
			if (!file) return;

			event.preventDefault();
			event.stopPropagation();
			void this.app.fileManager.processFrontMatter(file, (frontmatter) => {
				applyPropertyDragNodesToFrontmatter(
					frontmatter as Record<string, unknown>,
					nodes,
				);
			});
			this.clearDragActionGuide();
			return;
		}

		const tagNodes = tagDragNodes(payload);
		if (tagNodes.length === 0) return;
		if (!isMarkdownDropTarget(event.target)) return;
		if (!shouldAppendTagDrop(event.target)) return;
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) return;

		event.preventDefault();
		event.stopPropagation();
		appendTagsToMarkdownView(view, tagTextForDrop(tagNodes));
		this.clearDragActionGuide();
	};

	private readonly handleVaultmanDragEnd = (event: DragEvent): void => {
		if (!readVaultmanDragPayload(event)) return;
		this.clearDragActionGuide();
		const dragManager = this.dragManagerLike();
		if (dragManager && 'draggable' in dragManager) {
			dragManager.draggable = null;
		}
	};

	private dragManagerLike(): {
		draggable?: unknown;
		setAction?: (text: string | null) => void;
	} | null {
		return (
			(
				this.app as unknown as {
					dragManager?: {
						draggable?: unknown;
						setAction?: (text: string | null) => void;
					};
				}
			).dragManager ?? null
		);
	}

	private hasNativeFileDragPayload(): boolean {
		const draggable = this.dragManagerLike()?.draggable as
			| { type?: unknown }
			| null
			| undefined;
		return draggable?.type === 'file' || draggable?.type === 'files';
	}

	private isWorkspaceTabDropTarget(target: EventTarget | null): boolean {
		if (typeof HTMLElement === 'undefined') return false;
		if (!(target instanceof HTMLElement)) return false;
		return Boolean(
			target.closest(
				'.workspace-tab-header, .workspace-tab-header-container, .workspace-tab-header-container-inner, .workspace-tab-header-new-tab, .workspace-tab-header-spacer',
			),
		);
	}

	private markdownViewFromDropTarget(
		target: EventTarget | null,
	): MarkdownView | null {
		if (typeof HTMLElement === 'undefined') return null;
		if (!(target instanceof HTMLElement)) return null;
		for (const leaf of this.app.workspace.getLeavesOfType('markdown')) {
			const view = leaf.view;
			if (!(view instanceof MarkdownView)) continue;
			if (view.containerEl.contains(target)) return view;
		}
		return null;
	}

	private fileDragNodes(
		payload: VaultmanDragPayload,
	): Array<Extract<VaultmanDragNodePayload, { kind: 'file' }>> {
		const nodes = payload.selection?.length ? payload.selection : [payload];
		return nodes.filter(
			(node): node is Extract<VaultmanDragNodePayload, { kind: 'file' }> =>
				node.kind === 'file',
		);
	}

	private filesFromDragPayload(payload: VaultmanDragPayload): TFile[] {
		return this.fileDragNodes(payload)
			.map((node) => this.app.vault.getAbstractFileByPath(node.path))
			.filter((file): file is TFile => file instanceof TFile);
	}

	private async openDroppedFilesInNewTabs(files: TFile[]): Promise<void> {
		for (const file of files) {
			const leaf = this.app.workspace.getLeaf('tab');
			await leaf.openFile(file, { active: true });
		}
	}

	private fileTabDropAction(payload: VaultmanDragPayload): string {
		const count = this.fileDragNodes(payload).length;
		return count === 1
			? 'Open file in new tab'
			: `Open ${count} files in new tabs`;
	}

	private propertyDropAction(nodes: VaultmanDragNodePayload[]): string {
		if (nodes.length === 1) {
			const node = nodes[0];
			if (node.kind === 'property') return `Set property "${node.property}"`;
			if (node.kind === 'property-value')
				return `Set "${node.property}" frontmatter`;
		}
		return `Set ${nodes.length} frontmatter entries`;
	}

	async onExternalSettingsChange(): Promise<void> {
		await this.loadSettings();
		setLanguage(this.settings.language);
		this.queueService?.setBypassOperations(this.settings.bypassOperations);
		this.iconicService?.setEnabled(this.settings.iconicEnabled !== false);
		this.updateGlassBlur();
		this.notifySettingsChanged();
	}

	async loadSettings(): Promise<void> {
		const saved = ((await this.loadData()) ?? {}) as Partial<VaultmanSettings>;
		const hasSavedTabLabelPref = Object.prototype.hasOwnProperty.call(
			saved,
			'filtersShowTabLabels',
		);
		const needsTabLabelMigration = saved.filtersTabLabelsMigrated !== true;

		this.settings = {
			...(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) as VaultmanSettings),
			...saved,
		};

		if (needsTabLabelMigration) {
			if (hasSavedTabLabelPref && saved.filtersShowTabLabels === false) {
				this.settings.filtersShowTabLabels = true;
			}
			this.settings.filtersTabLabelsMigrated = true;
			await this.saveData(this.settings);
		}

		// BT5: seed the default View Compositions once. Deleting them sticks
		// because the flag is only ever set, never cleared.
		if (saved.viewCompositionsSeeded !== true) {
			this.settings.savedLayouts = seedDefaultViewCompositions(
				this.settings.savedLayouts,
			);
			this.settings.viewCompositionsSeeded = true;
			await this.saveData(this.settings);
		}

		// BT5-025: a legacy individual glyph color (red/blue/…) folds into the
		// shared palette as `custom` with its documented hex.
		const migratedGlyph = normalizeGlyphColorChoice(saved.tocGlyphColor);
		if (
			saved.tocGlyphColor !== undefined &&
			migratedGlyph.choice !== saved.tocGlyphColor
		) {
			this.settings.tocGlyphColor = migratedGlyph.choice;
			if (migratedGlyph.migratedCustom) {
				this.settings.tocGlyphCustomColor = migratedGlyph.migratedCustom;
			}
			await this.saveData(this.settings);
		}
	}

	async saveSettings(): Promise<void> {
		// Notify listeners first so UI reacts immediately; persist in the
		// background (the in-memory settings are already the source of truth).
		this.notifySettingsChanged();
		await this.saveData(this.settings);
	}

	private showUpdatesIfNeeded(): void {
		const currentVersion = this.manifest.version;
		if (
			!shouldShowUpdates(this.settings.lastSeenUpdatesVersion, currentVersion)
		) {
			return;
		}
		this.settings.lastSeenUpdatesVersion = currentVersion;
		void this.saveData(this.settings);
		this.showUpdatesNotice(currentVersion);
	}

	private openUpdates(): void {
		new UpdatesModal(this.app, this.manifest.version).open();
	}

	private showUpdatesNotice(version: string): void {
		const fragment = activeDocument.createDocumentFragment();
		const message = activeDocument.createElement('div');
		message.textContent = translate('updates.notice', { version });
		fragment.appendChild(message);

		const bulletinButton = activeDocument.createElement('button');
		bulletinButton.className = 'mod-cta';
		bulletinButton.textContent = translate('updates.view_bulletin');
		fragment.appendChild(bulletinButton);

		const dismissButton = activeDocument.createElement('button');
		dismissButton.textContent = translate('updates.dismiss');
		fragment.appendChild(dismissButton);

		const notice = new Notice(fragment, 0);
		bulletinButton.addEventListener('click', () => {
			try {
				openUpdatesBulletin(version);
				notice.hide();
			} catch {
				new Notice(translate('updates.open_failed'));
			}
		});
		dismissButton.addEventListener('click', () => notice.hide());
	}

	onSettingsChange(listener: () => void): () => void {
		this.settingsChangeListeners.add(listener);
		return () => {
			this.settingsChangeListeners.delete(listener);
		};
	}

	private notifySettingsChanged(): void {
		for (const listener of [...this.settingsChangeListeners]) {
			try {
				listener();
			} catch (error) {
				console.error('Vaultman settings listener failed', error);
			}
		}
	}

	updateGlassBlur(): void {
		applyGlassBlurSetting(activeDocument.body.style, this.settings);
	}

	/** Open a frame and reveal it. Never closes one. */
	private async openVaultmanView(): Promise<WorkspaceLeaf | null> {
		const { workspace } = this.app;
		const mode = normalizeOpenMode(this.settings.openMode as string);
		const leaf =
			mode === 'sidebar'
				? workspace.getLeftLeaf(false) || workspace.getRightLeaf(false)
				: workspace.getLeaf('tab');
		if (!leaf) return null;
		await leaf.setViewState({ type: VAULTMAN_FRAME_TYPE, active: true });
		void workspace.revealLeaf(leaf);
		return leaf;
	}

	/**
	 * The explicit `Open Vaultman` command: a toggle in sidebar/main mode,
	 * always an extra frame in new_instance mode.
	 */
	async activateView(): Promise<void> {
		const existingLeaves = this.app.workspace.getLeavesOfType(
			VAULTMAN_FRAME_TYPE,
		);
		if (
			shouldToggleCloseFrame(
				this.settings.openMode as string,
				existingLeaves.length,
			)
		) {
			for (const leaf of existingLeaves) leaf.detach();
			return;
		}
		await this.openVaultmanView();
	}

	/**
	 * BT5-067: the idempotent route for every command that needs a frame to act
	 * on. Reveals an existing frame, opens one when there is none, and never
	 * detaches — going through `activateView` here is what made the focus
	 * commands close Vaultman instead of focusing it.
	 */
	async ensureVaultmanFrame(): Promise<WorkspaceLeaf | null> {
		const existing = this.app.workspace.getLeavesOfType(VAULTMAN_FRAME_TYPE)[0];
		if (existing) {
			await this.app.workspace.revealLeaf(existing);
			return existing;
		}
		return this.openVaultmanView();
	}
}

export default VaultmanPlugin;
