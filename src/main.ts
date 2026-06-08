import { MarkdownView, Plugin, WorkspaceLeaf } from 'obsidian';
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
import { readVaultmanDragPayload } from './utils/dragPayload';
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
		this.iconicService = new IconicService(this.app);
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

		activeDocument.addEventListener('drop', this.handleVaultmanDrop, true);
		this.register(() =>
			activeDocument.removeEventListener('drop', this.handleVaultmanDrop, true),
		);

		this.addSettingTab(new VaultmanSettingsTab(this.app, this));
	}

	private readonly handleVaultmanDrop = (event: DragEvent): void => {
		const payload = readVaultmanDragPayload(event);
		if (!payload) return;
		const nodes = propertyDragNodes(payload);
		if (nodes.length > 0) {
			const file = this.app.workspace.getActiveFile();
			if (!file) return;

			event.preventDefault();
			event.stopPropagation();
			void this.app.fileManager.processFrontMatter(file, (frontmatter) => {
				applyPropertyDragNodesToFrontmatter(
					frontmatter as Record<string, unknown>,
					nodes,
				);
			});
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
	};

	async onExternalSettingsChange(): Promise<void> {
		await this.loadSettings();
		setLanguage(this.settings.language);
		this.queueService?.setBypassOperations(this.settings.bypassOperations);
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
		await this.saveData(this.settings);
		this.notifySettingsChanged();
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
