import { MarkdownView, Plugin, TFile, WorkspaceLeaf } from 'obsidian';
import type { VaultmanSettings } from './types/typeSettings';
import { DEFAULT_SETTINGS } from './types/typeSettings';
import { PropertyIndexService } from './services/servicePropertyIndex';
import { FilterService } from './services/serviceFilter';
import { OperationQueueService } from './services/serviceOperationQueue';
import { VaultmanFrame, VAULTMAN_FRAME_TYPE } from './VaultmanFrame';
import { IconicService } from './services/serviceIcons';
import { PropertyTypeService } from './services/servicePropertyType';
import { ContextMenuService } from './services/serviceContextMenu';
import { StatisticsCacheService } from './services/serviceStatisticsCache';
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
	CURRENT_UPDATES_VERSION,
	shouldShowUpdates,
} from './logic/logicUpdateNotice';

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
		);
		this.propertyTypeService = new PropertyTypeService(this.app);
		this.contextMenuService = new ContextMenuService(this);
		this.statisticsCache = new StatisticsCacheService(this.app);

		this.addChild(this.propertyIndex);
		this.addChild(this.filterService);
		this.addChild(this.queueService);
		this.addChild(this.iconicService);
		this.addChild(this.propertyTypeService);
		this.addChild(this.contextMenuService);
		this.addChild(this.statisticsCache);

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
				this.filterService.applyFilters();
			})
		);

		this.statusBarEl = this.addStatusBarItem();
		this.statusBarEl.addClass('vaultman-native-statusbar');

		this.addRibbonIcon('lucide-vault', translate('plugin.open'), () => {
			void this.activateView();
		});

		this.registerView(VAULTMAN_FRAME_TYPE, (leaf) => new VaultmanFrame(leaf, this));
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
		activeDocument.addEventListener('dragover', this.handleVaultmanDragOver, true);
		activeDocument.addEventListener('dragend', this.handleVaultmanDragEnd, true);
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
		await this.activateView();
		const leaf = this.app.workspace.getLeavesOfType(VAULTMAN_FRAME_TYPE)[0];
		if (!leaf) return null;
		await this.app.workspace.revealLeaf(leaf);
		const view = leaf.view;
		return view instanceof VaultmanFrame ? view : null;
	}

	private async focusVaultmanContentSearch(): Promise<void> {
		const view = await this.vaultmanFrameForCommand();
		if (view) await view.focusContentSearch();
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
			this.showDragActionGuide(`Append ${tagNodes.length === 1 ? 'tag' : 'tags'}`);
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
		return count === 1 ? 'Open file in new tab' : `Open ${count} files in new tabs`;
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
		const hasSavedTabLabelPref = Object.prototype.hasOwnProperty.call(saved, 'filtersShowTabLabels');
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
	}

	async saveSettings(): Promise<void> {
		// Notify listeners first so UI reacts immediately; persist in the
		// background (the in-memory settings are already the source of truth).
		this.notifySettingsChanged();
		await this.saveData(this.settings);
	}

	private showUpdatesIfNeeded(): void {
		if (
			!shouldShowUpdates(
				this.settings.lastSeenUpdatesVersion,
				CURRENT_UPDATES_VERSION,
			)
		) {
			return;
		}
		this.settings.lastSeenUpdatesVersion = CURRENT_UPDATES_VERSION;
		void this.saveData(this.settings);
		this.openUpdates();
	}

	private openUpdates(): void {
		new UpdatesModal(this.app, CURRENT_UPDATES_VERSION).open();
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
		const intensity: number = this.settings.glassBlurIntensity ?? 60;
		const px = (intensity / 100) * 20;
		activeDocument.body.style.setProperty('--vaultman-glass-blur', `${px}px`);
	}

	async activateView(): Promise<void> {
		const { openMode } = this.settings;

		if (openMode === 'sidebar' || openMode === 'both') {
			await this.openView('sidebar');
		}
		if (openMode === 'main' || openMode === 'both') {
			await this.openView('main');
		}
	}

	async openView(mode: 'sidebar' | 'main'): Promise<void> {
		const { workspace } = this.app;
		let leaf: WorkspaceLeaf | null = workspace.getLeavesOfType(VAULTMAN_FRAME_TYPE)[0];

		if (!leaf) {
			if (mode === 'sidebar') {
				leaf = workspace.getLeftLeaf(false) || workspace.getRightLeaf(false);
			} else {
				leaf = workspace.getLeaf('tab');
			}

			if (leaf) {
				await leaf.setViewState({
					type: VAULTMAN_FRAME_TYPE,
					active: true,
				});
			}
		}

		if (leaf) {
			void workspace.revealLeaf(leaf);
		}
	}
}

export default VaultmanPlugin;
