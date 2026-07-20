import { PluginSettingTab, Setting, type App } from 'obsidian';
import {
	type FilesIconScope,
	type iVaultmanPlugin,
	type VaultmanSettings,
} from './types/typeSettings';
import {
	fileHoverEntries,
	mergeFileHoverOrder,
	normalizeFileHoverEnabled,
	reorderFileHoverEntries,
	type FileHoverInfoId,
} from './logic/logicCellRegistry';
import {
	addFilesMenuDivider,
	addFilesMenuSubmenu,
	defaultFilesMenuLayout,
	mergeFilesMenuLayout,
	normalizeFilesMenuLayout,
	removeFilesMenuItem,
	reorderFilesMenuItems,
	setFilesMenuParent,
	setFilesMenuVisibility,
	type FilesMenuItem,
} from './logic/logicFilesContextMenu';
import { translate } from './i18n/index';
import { PayloadPreviewModal } from './modals/modalPayloadPreview';
import {
	buildFilterTemplatePreview,
	buildQueueTemplatePreview,
	buildSavedLayoutPreview,
} from './logic/logicPayloadPreview';

export class VaultmanSettingsTab extends PluginSettingTab {
	private plugin: iVaultmanPlugin;
	private page:
		| 'root'
		| 'toolbar'
		| 'floating-toc'
		| 'files-hover'
		| 'explorer'
		| 'files-context-menu'
		| 'context-menus' = 'root';

	constructor(app: App, plugin: iVaultmanPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		if (this.page === 'toolbar') {
			this.displayToolbarPage(containerEl);
			return;
		}
		if (this.page === 'floating-toc') {
			this.displayFloatingTocPage(containerEl);
			return;
		}
		if (this.page === 'files-hover') {
			this.displayFilesHoverPage(containerEl);
			return;
		}
		if (this.page === 'explorer') {
			this.displayExplorerPage(containerEl);
			return;
		}
		if (this.page === 'files-context-menu') {
			this.displayFilesContextMenuPage(containerEl);
			return;
		}
		if (this.page === 'context-menus') {
			this.displayContextMenusPage(containerEl);
			return;
		}

		new Setting(containerEl)
			.setName(translate('settings.open_mode'))
			.setDesc(translate('settings.open_mode.desc'))
			.addDropdown((dropdown) =>
				dropdown
					.addOptions({
						sidebar: translate('settings.open_mode.sidebar'),
						main: translate('settings.open_mode.main'),
						both: translate('settings.open_mode.both'),
					})
					.setValue(this.plugin.settings.openMode)
					.onChange(async (value) => {
						this.plugin.settings.openMode = value as
							| 'sidebar'
							| 'main'
							| 'both';
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(translate('settings.operation_scope'))
			.setDesc(translate('settings.operation_scope.desc'))
			.addDropdown((dropdown) =>
				dropdown
					.addOptions({
						auto: translate('settings.scope.auto'),
						selected: translate('settings.scope.selected'),
						filtered: translate('settings.scope.filtered'),
						all: translate('settings.scope.all'),
					})
					.setValue(this.plugin.settings.explorerOperationScope)
					.onChange(async (value) => {
						this.plugin.settings.explorerOperationScope = value as
							| 'auto'
							| 'selected'
							| 'filtered'
							| 'all';
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(translate('settings.bypass_operations'))
			.setDesc(translate('settings.bypass_operations.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.bypassOperations)
					.onChange(async (value) => {
						this.plugin.settings.bypassOperations = value;
						this.plugin.queueService?.setBypassOperations(value);
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(translate('settings.bulk_operation_warning'))
			.setDesc(translate('settings.bulk_operation_warning.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(!this.plugin.settings.suppressBulkOperationWarning)
					.onChange(async (value) => {
						this.plugin.settings.suppressBulkOperationWarning = !value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(translate('settings.bulk_operation_warning_threshold'))
			.setDesc(translate('settings.bulk_operation_warning_threshold.desc'))
			.addSlider((slider) =>
				slider
					.setLimits(50, 2000, 50)
					.setValue(this.plugin.settings.bulkOperationWarningThreshold ?? 400)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.bulkOperationWarningThreshold = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(translate('settings.templates'))
			.setHeading();

		if (this.plugin.settings.filterTemplates.length === 0) {
			containerEl.createEl('p', {
				text: translate('settings.templates.desc'),
				cls: 'setting-item-description',
			});
		} else {
			for (const template of this.plugin.settings.filterTemplates) {
				new Setting(containerEl)
					.setName(template.name)
					.setDesc(`${template.root.children.length} filters`)
					.addButton((button) =>
						button
							.setButtonText(translate('payload_preview.view'))
							.setTooltip(
								translate('payload_preview.view_aria', {
									name: template.name,
								}),
							)
							.onClick(() =>
								new PayloadPreviewModal(
									this.app,
									buildFilterTemplatePreview(template),
								).open(),
							),
					)
					.addButton((button) =>
						button
							.setButtonText(translate('filter.template.delete'))
							.setWarning()
							.onClick(async () => {
								this.plugin.settings.filterTemplates =
									this.plugin.settings.filterTemplates.filter(
										(item) => item.name !== template.name,
									);
								await this.plugin.saveSettings();
								this.display();
							}),
					);
			}
		}

		new Setting(containerEl)
			.setName(translate('queue.template.templates'))
			.setHeading();

		if (this.plugin.settings.queueTemplates.length === 0) {
			containerEl.createEl('p', {
				text: translate('settings.queue_templates.desc'),
				cls: 'setting-item-description',
			});
		} else {
			for (const template of this.plugin.settings.queueTemplates) {
				new Setting(containerEl)
					.setName(template.name)
					.setDesc(`${template.changes.length} operations`)
					.addButton((button) =>
						button
							.setButtonText(translate('payload_preview.view'))
							.setTooltip(
								translate('payload_preview.view_aria', {
									name: template.name,
								}),
							)
							.onClick(() =>
								new PayloadPreviewModal(
									this.app,
									buildQueueTemplatePreview(template),
								).open(),
							),
					)
					.addButton((button) =>
						button
							.setButtonText(translate('filter.template.delete'))
							.setWarning()
							.onClick(async () => {
								this.plugin.settings.queueTemplates =
									this.plugin.settings.queueTemplates.filter(
										(item) => item.name !== template.name,
									);
								await this.plugin.saveSettings();
								this.display();
							}),
					);
			}
		}

		new Setting(containerEl)
			.setName(translate('settings.saved_view_config'))
			.setHeading();

		const layouts = this.plugin.settings.savedLayouts ?? [];
		if (layouts.length === 0) {
			containerEl.createEl('p', {
				text: translate('settings.saved_view_config.empty'),
				cls: 'setting-item-description',
			});
		} else {
			for (const layout of layouts) {
				new Setting(containerEl)
					.setName(layout.name)
					.setDesc(layout.summary)
					.addButton((button) =>
						button
							.setButtonText(translate('payload_preview.view'))
							.setTooltip(
								translate('payload_preview.view_aria', {
									name: layout.name,
								}),
							)
							.onClick(() =>
								new PayloadPreviewModal(
									this.app,
									buildSavedLayoutPreview(layout),
								).open(),
							),
					)
					.addButton((button) =>
						button
							.setButtonText(translate('settings.saved_view_config.clear'))
							.setWarning()
							.onClick(async () => {
								this.plugin.settings.savedLayouts = (
									this.plugin.settings.savedLayouts ?? []
								).filter((entry) => entry.name !== layout.name);
								await this.plugin.saveSettings();
								this.display();
							}),
					);
			}
		}

		new Setting(containerEl)
			.setName(translate('settings.style_config'))
			.setHeading();

		new Setting(containerEl)
			.setName(translate('settings.style_preset'))
			.setDesc(translate('settings.style_preset.desc'))
			.addDropdown((dropdown) =>
				dropdown
					.addOption('minimal', translate('settings.style_preset.minimal'))
					.addOption(
						'experimental',
						translate('settings.style_preset.experimental'),
					)
					.setValue(
						this.plugin.settings.minimalStyle ? 'minimal' : 'experimental',
					)
					.onChange(async (value) => {
						this.plugin.settings.minimalStyle = value === 'minimal';
						await this.plugin.saveSettings();
						this.plugin.updateGlassBlur();
						this.display();
					}),
			);

		new Setting(containerEl)
			.setName(translate('settings.show_dock'))
			.setDesc(translate('settings.show_dock.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showDock)
					.onChange(async (value) => {
						this.plugin.settings.showDock = value;
						await this.plugin.saveSettings();
					}),
			);

		if (!this.plugin.settings.minimalStyle) {
			new Setting(containerEl)
				.setName(translate('settings.background_blur'))
				.setDesc(translate('settings.background_blur.desc'))
				.addSlider((slider) =>
					slider
						.setLimits(0, 100, 1)
						.setValue(this.plugin.settings.glassBlurIntensity ?? 60)
						.setDynamicTooltip()
						.onChange(async (value) => {
							this.plugin.settings.glassBlurIntensity = value;
							await this.plugin.saveSettings();
							this.plugin.updateGlassBlur();
						}),
				);
		}

		new Setting(containerEl)
			.setName(translate('settings.toolbar'))
			.setDesc(translate('settings.toolbar.desc'))
			.addButton((button) =>
				button.setButtonText(translate('settings.configure')).onClick(() => {
					this.page = 'toolbar';
					this.display();
				}),
			);

		new Setting(containerEl)
			.setName(translate('settings.files_hover_info'))
			.setDesc(translate('settings.files_hover_info.desc'))
			.addButton((button) =>
				button.setButtonText(translate('settings.configure')).onClick(() => {
					this.page = 'files-hover';
					this.display();
				}),
			);

		new Setting(containerEl)
			.setName(translate('settings.floating_toc'))
			.setDesc(translate('settings.floating_toc.desc'))
			.addButton((button) =>
				button.setButtonText(translate('settings.configure')).onClick(() => {
					this.page = 'floating-toc';
					this.display();
				}),
			);

		new Setting(containerEl)
			.setName(translate('settings.explorer_page'))
			.setDesc(translate('settings.explorer_page.desc'))
			.addButton((button) =>
				button.setButtonText(translate('settings.configure')).onClick(() => {
					this.page = 'explorer';
					this.display();
				}),
			);

		new Setting(containerEl)
			.setName(translate('settings.context_menu'))
			.setDesc(translate('settings.context_menu.page_desc'))
			.addButton((button) =>
				button.setButtonText(translate('settings.configure')).onClick(() => {
					this.page = 'context-menus';
					this.display();
				}),
			);

		new Setting(containerEl).setName(translate('settings.addons')).setHeading();

		new Setting(containerEl)
			.setName(translate('settings.addons.iconic'))
			.setDesc(translate('settings.addons.iconic.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.iconicEnabled !== false)
					.onChange(async (value) => {
						this.plugin.settings.iconicEnabled = value;
						this.plugin.iconicService?.setEnabled(value);
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(translate('settings.addons.iconic.files_scope'))
			.setDesc(translate('settings.addons.iconic.files_scope.desc'))
			.addDropdown((dropdown) =>
				dropdown
					.addOption('all', translate('settings.icon_scope.all'))
					.addOption('files', translate('settings.icon_scope.files'))
					.addOption('folders', translate('settings.icon_scope.folders'))
					.addOption('custom', translate('settings.icon_scope.custom'))
					.setValue(this.plugin.settings.filesIconScope ?? 'all')
					.onChange(async (value) => {
						this.plugin.settings.filesIconScope = value as FilesIconScope;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(translate('settings.developer_tools'))
			.setHeading();

		new Setting(containerEl)
			.setName(translate('settings.performance_monitor'))
			.setDesc(translate('settings.performance_monitor.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.performanceHudEnabled)
					.onChange(async (value) => {
						this.plugin.settings.performanceHudEnabled = value;
						await this.plugin.saveSettings();
					}),
			);
	}

	private displayToolbarPage(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName(translate('settings.back_to_layout_settings'))
			.addButton((button) =>
				button
					.setIcon('lucide-arrow-left')
					.setTooltip(translate('settings.back_to_layout_settings'))
					.onClick(() => {
						this.page = 'root';
						this.display();
					}),
			);

		new Setting(containerEl)
			.setName(translate('settings.toolbar'))
			.setDesc(translate('settings.toolbar.desc'))
			.setHeading();

		new Setting(containerEl)
			.setName(translate('settings.filters_show_tab_labels'))
			.setDesc(translate('settings.filters_show_tab_labels.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.filtersShowTabLabels)
					.onChange(async (value) => {
						this.plugin.settings.filtersShowTabLabels = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(translate('settings.show_toolbar'))
			.setDesc(translate('settings.show_toolbar.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showToolbar !== false)
					.onChange(async (value) => {
						this.plugin.settings.showToolbar = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(translate('settings.toolbar_tools_menu'))
			.setDesc(translate('settings.toolbar_tools_menu.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.toolbarToolsMenu === true)
					.onChange(async (value) => {
						this.plugin.settings.toolbarToolsMenu = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(translate('settings.sort_level_inline'))
			.setDesc(translate('settings.sort_level_inline.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.sortLevelInline !== false)
					.onChange(async (value) => {
						this.plugin.settings.sortLevelInline = value;
						await this.plugin.saveSettings();
					}),
			);
	}

	private displayExplorerPage(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName(translate('settings.back_to_layout_settings'))
			.addButton((button) =>
				button
					.setIcon('lucide-arrow-left')
					.setTooltip(translate('settings.back_to_layout_settings'))
					.onClick(() => {
						this.page = 'root';
						this.display();
					}),
			);

		new Setting(containerEl)
			.setName(translate('settings.explorer_page'))
			.setHeading();

		new Setting(containerEl)
			.setName(translate('settings.addon_cell_style'))
			.setDesc(translate('settings.addon_cell_style.desc'))
			.addDropdown((dropdown) =>
				dropdown
					.addOption('native', translate('settings.addon_cell_style.native'))
					.addOption('badge', translate('settings.addon_cell_style.badge'))
					.setValue(this.plugin.settings.addonCellStyle)
					.onChange(async (value) => {
						if (value !== 'native' && value !== 'badge') return;
						this.plugin.settings.addonCellStyle = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(translate('settings.order_cells_by_activation'))
			.setDesc(translate('settings.order_cells_by_activation.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.orderCellsByActivation === true)
					.onChange(async (value) => {
						this.plugin.settings.orderCellsByActivation = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(translate('settings.icon_in_caret_slot'))
			.setDesc(translate('settings.icon_in_caret_slot.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.iconInCaretSlot === true)
					.onChange(async (value) => {
						this.plugin.settings.iconInCaretSlot = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(translate('settings.badge_colors'))
			.setDesc(translate('settings.badge_colors.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.coloredBadges)
					.onChange(async (value) => {
						this.plugin.settings.coloredBadges = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(translate('settings.badge_cancel_click'))
			.setDesc(translate('settings.badge_cancel_click.desc'))
			.addDropdown((dropdown) =>
				dropdown
					.addOption('double', translate('settings.badge_cancel_click.double'))
					.addOption('single', translate('settings.badge_cancel_click.single'))
					.setValue(this.plugin.settings.badgeCancelClickMode)
					.onChange(async (value) => {
						this.plugin.settings.badgeCancelClickMode =
							value === 'single' ? 'single' : 'double';
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(translate('settings.search_highlights'))
			.setDesc(translate('settings.search_highlights.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.explorerSearchHighlights)
					.onChange(async (value) => {
						this.plugin.settings.explorerSearchHighlights = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(translate('settings.rainbow_folders'))
			.setDesc(translate('settings.rainbow_folders.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.explorerRainbowFolders === true)
					.onChange(async (value) => {
						this.plugin.settings.explorerRainbowFolders = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(translate('settings.excluded_files'))
			.setDesc(translate('settings.excluded_files.desc'))
			.setHeading();
		const excluded = this.plugin.settings.excludedFilePaths ?? [];
		if (excluded.length === 0) {
			new Setting(containerEl).setName(
				translate('settings.excluded_files.empty'),
			);
		}
		for (const path of excluded) {
			new Setting(containerEl).setName(path).addExtraButton((button) =>
				button
					.setIcon('lucide-x')
					.setTooltip(translate('settings.excluded_files.remove'))
					.onClick(async () => {
						this.plugin.settings.excludedFilePaths = (
							this.plugin.settings.excludedFilePaths ?? []
						).filter((entry) => entry !== path);
						await this.plugin.saveSettings();
						this.display();
					}),
			);
		}
	}

	private displayContextMenusPage(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName(translate('settings.back_to_layout_settings'))
			.addButton((button) =>
				button
					.setIcon('lucide-arrow-left')
					.setTooltip(translate('settings.back_to_layout_settings'))
					.onClick(() => {
						this.page = 'root';
						this.display();
					}),
			);

		new Setting(containerEl)
			.setName(translate('settings.context_menu'))
			.setHeading();

		// BT5-018: the Files node menu is one more context menu, so it belongs
		// inside this page rather than beside it in the settings root.
		new Setting(containerEl)
			.setName(translate('settings.files_context_menu'))
			.setDesc(translate('settings.files_context_menu.desc'))
			.addButton((button) =>
				button.setButtonText(translate('settings.configure')).onClick(() => {
					this.page = 'files-context-menu';
					this.display();
				}),
			);

		new Setting(containerEl)
			.setName(translate('settings.context_menu.file_menu'))
			.setDesc(translate('settings.context_menu.file_menu.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.contextMenuShowInFileMenu)
					.onChange(async (value) => {
						this.plugin.settings.contextMenuShowInFileMenu = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(translate('settings.context_menu.editor_menu'))
			.setDesc(translate('settings.context_menu.editor_menu.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.contextMenuShowInEditorMenu)
					.onChange(async (value) => {
						this.plugin.settings.contextMenuShowInEditorMenu = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(translate('settings.context_menu.more_options'))
			.setDesc(translate('settings.context_menu.more_options.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.contextMenuShowInMoreOptions)
					.onChange(async (value) => {
						this.plugin.settings.contextMenuShowInMoreOptions = value;
						await this.plugin.saveSettings();
					}),
			);
	}

	private displayFilesHoverPage(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName(translate('settings.back_to_layout_settings'))
			.addButton((button) =>
				button
					.setIcon('lucide-arrow-left')
					.setTooltip(translate('settings.back_to_layout_settings'))
					.onClick(() => {
						this.page = 'root';
						this.display();
					}),
			);

		new Setting(containerEl)
			.setName(translate('settings.files_hover_info'))
			.setDesc(translate('settings.files_hover_info.desc'))
			.setHeading();

		const entries = new Map(
			fileHoverEntries().map((entry) => [entry.id, entry]),
		);
		const order = mergeFileHoverOrder(this.plugin.settings.filesHoverInfoOrder);
		const enabled = new Set(
			normalizeFileHoverEnabled(this.plugin.settings.filesHoverInfo),
		);
		let draggedId: FileHoverInfoId | null = null;

		for (const id of order) {
			const entry = entries.get(id);
			if (!entry) continue;
			const setting = new Setting(containerEl).setName(
				translate(entry.labelKey),
			);
			setting
				.addExtraButton((button) => {
					button
						.setIcon('lucide-grip-vertical')
						.setTooltip(translate(entry.labelKey));
					button.extraSettingsEl.draggable = true;
					button.extraSettingsEl.addEventListener(
						'dragstart',
						(event: DragEvent) => {
							draggedId = entry.id;
							if (event.dataTransfer) {
								event.dataTransfer.effectAllowed = 'move';
								event.dataTransfer.setData('text/plain', entry.id);
							}
						},
					);
					button.extraSettingsEl.addEventListener('dragend', () => {
						draggedId = null;
					});
				})
				.addToggle((toggle) =>
					toggle.setValue(enabled.has(entry.id)).onChange(async (value) => {
						const selected = new Set(
							normalizeFileHoverEnabled(this.plugin.settings.filesHoverInfo),
						);
						if (value) selected.add(entry.id);
						else selected.delete(entry.id);
						this.plugin.settings.filesHoverInfo = order.filter((candidate) =>
							selected.has(candidate),
						);
						await this.plugin.saveSettings();
					}),
				);

			setting.settingEl.addEventListener('dragover', (event: DragEvent) => {
				if (!draggedId) return;
				event.preventDefault();
				if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
			});
			setting.settingEl.addEventListener('drop', (event: DragEvent) => {
				event.preventDefault();
				const movedId =
					draggedId ?? event.dataTransfer?.getData('text/plain') ?? null;
				draggedId = null;
				if (!movedId) return;
				const nextOrder = reorderFileHoverEntries(order, movedId, entry.id);
				if (nextOrder.every((candidate, index) => candidate === order[index])) {
					return;
				}
				this.plugin.settings.filesHoverInfoOrder = nextOrder;
				void this.plugin.saveSettings().then(() => this.display());
			});
		}
	}

	/**
	 * BT5-018: the Files node context menu, configured like the hover-info
	 * list — drag to reorder, toggle to show or hide — plus dividers and
	 * submenus the user can create. Everything is stored by action id.
	 */
	private displayFilesContextMenuPage(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName(translate('settings.context_menu'))
			.addButton((button) =>
				button
					.setIcon('lucide-arrow-left')
					.setTooltip(translate('settings.context_menu'))
					.onClick(() => {
						// Back to the page that owns it, not to the root.
						this.page = 'context-menus';
						this.display();
					}),
			);

		new Setting(containerEl)
			.setName(translate('settings.files_context_menu'))
			.setDesc(translate('settings.files_context_menu.desc'))
			.setHeading();

		const catalog = this.plugin.contextMenuService.panelActionCatalog();
		const labels = new Map(catalog.map((entry) => [entry.id, entry.label]));
		const layout = mergeFilesMenuLayout(
			this.plugin.settings.filesContextMenuLayout,
			catalog.map((entry) => entry.id),
		);

		const persist = async (next: FilesMenuItem[]): Promise<void> => {
			this.plugin.settings.filesContextMenuLayout =
				normalizeFilesMenuLayout(next);
			await this.plugin.saveSettings();
			this.display();
		};

		new Setting(containerEl)
			.addButton((button) =>
				button
					.setIcon('lucide-minus')
					.setTooltip(translate('settings.files_context_menu.add_divider'))
					.onClick(() => void persist(addFilesMenuDivider(layout))),
			)
			.addButton((button) =>
				button
					.setIcon('lucide-chevron-right')
					.setTooltip(translate('settings.files_context_menu.add_submenu'))
					.onClick(() =>
						void persist(
							addFilesMenuSubmenu(
								layout,
								translate('settings.files_context_menu.submenu_name'),
							),
						),
					),
			)
			.addButton((button) =>
				button
					.setIcon('lucide-rotate-ccw')
					.setTooltip(translate('settings.files_context_menu.reset'))
					.onClick(() =>
						void persist(
							defaultFilesMenuLayout(catalog.map((entry) => entry.id)),
						),
					),
			);

		const submenuChoices = layout.filter(
			(item): item is Extract<FilesMenuItem, { kind: 'submenu' }> =>
				item.kind === 'submenu',
		);
		const nativeIds = new Set(
			catalog.filter((entry) => entry.native).map((entry) => entry.id),
		);
		let draggedId: string | null = null;

		for (const item of layout) {
			const isNative = item.kind === 'action' && nativeIds.has(item.id);
			const setting = new Setting(containerEl);
			if (item.kind === 'divider') {
				setting.setName(translate('settings.files_context_menu.divider'));
			} else if (item.kind === 'submenu') {
				setting.setName(item.label);
				setting.setDesc(translate('settings.files_context_menu.submenu'));
			} else {
				setting.setName(labels.get(item.id) ?? item.id);
				// Intercepted items can only be shown or hidden — Vaultman does not
				// own their order or their handler, so they carry no grip.
				setting.setDesc(
					isNative
						? translate('settings.files_context_menu.intercepted')
						: item.id,
				);
			}

			// Only items Vaultman controls are draggable; native items are not.
			if (!isNative) {
				setting.addExtraButton((button) => {
					button.setIcon('lucide-grip-vertical').setTooltip(item.id);
					button.extraSettingsEl.draggable = true;
					button.extraSettingsEl.addEventListener(
						'dragstart',
						(event: DragEvent) => {
							draggedId = item.id;
							if (event.dataTransfer) {
								event.dataTransfer.effectAllowed = 'move';
								event.dataTransfer.setData('text/plain', item.id);
							}
						},
					);
					button.extraSettingsEl.addEventListener('dragend', () => {
						draggedId = null;
					});
				});
			}

			if (item.kind === 'action' && !isNative && submenuChoices.length > 0) {
				setting.addDropdown((dropdown) => {
					dropdown.addOption(
						'',
						translate('settings.files_context_menu.no_submenu'),
					);
					for (const submenu of submenuChoices) {
						dropdown.addOption(submenu.id, submenu.label);
					}
					dropdown.setValue(item.parent ?? '');
					dropdown.onChange((value) =>
						void persist(setFilesMenuParent(layout, item.id, value || null)),
					);
				});
			}

			if (item.kind === 'action') {
				setting.addToggle((toggle) =>
					toggle
						.setValue(item.visible)
						.onChange((value) =>
							void persist(setFilesMenuVisibility(layout, item.id, value)),
						),
				);
			} else {
				setting.addExtraButton((button) =>
					button
						.setIcon('lucide-trash-2')
						.setTooltip(translate('settings.files_context_menu.remove'))
						.onClick(() => void persist(removeFilesMenuItem(layout, item.id))),
				);
			}

			setting.settingEl.addEventListener('dragover', (event: DragEvent) => {
				if (!draggedId) return;
				event.preventDefault();
				if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
			});
			setting.settingEl.addEventListener('drop', (event: DragEvent) => {
				event.preventDefault();
				const movedId =
					draggedId ?? event.dataTransfer?.getData('text/plain') ?? null;
				draggedId = null;
				if (!movedId || movedId === item.id) return;
				void persist(reorderFilesMenuItems(layout, movedId, item.id));
			});
		}
	}

	private displayFloatingTocPage(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName(translate('settings.back_to_layout_settings'))
			.addButton((button) =>
				button
					.setIcon('lucide-arrow-left')
					.setTooltip(translate('settings.back_to_layout_settings'))
					.onClick(() => {
						this.page = 'root';
						this.display();
					}),
			);

		new Setting(containerEl)
			.setName(translate('settings.floating_toc'))
			.setHeading();

		new Setting(containerEl)
			.setName(translate('settings.floating_toc_enable'))
			.setDesc(translate('settings.floating_toc_enable.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.floatingTocEnabled === true)
					.onChange(async (value) => {
						this.plugin.settings.floatingTocEnabled = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(translate('settings.floating_toc_niagara'))
			.setDesc(translate('settings.floating_toc_niagara.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.floatingTocNiagara === true)
					.onChange(async (value) => {
						this.plugin.settings.floatingTocNiagara = value;
						await this.plugin.saveSettings();
					}),
			);

		const setToc = async (patch: Partial<typeof this.plugin.settings>) => {
			Object.assign(this.plugin.settings, patch);
			await this.plugin.saveSettings();
		};
		new Setting(containerEl)
			.setName(translate('settings.toc_plain_style'))
			.setDesc(translate('settings.toc_plain_style.desc'))
			.addToggle((t) =>
				t
					.setValue(this.plugin.settings.floatingTocPlainStyle === true)
					.onChange((v) => setToc({ floatingTocPlainStyle: v })),
			);
		new Setting(containerEl)
			.setName(translate('settings.toc_position'))
			.addDropdown((d) =>
				d
					.addOptions({
						right: translate('settings.toc_position.right'),
						left: translate('settings.toc_position.left'),
						top: translate('settings.toc_position.top'),
						bottom: translate('settings.toc_position.bottom'),
					})
					.setValue(this.plugin.settings.tocPosition ?? 'right')
					.onChange((v) =>
						setToc({ tocPosition: v as VaultmanSettings['tocPosition'] }),
					),
			);
		new Setting(containerEl)
			.setName(translate('settings.toc_reserved_lane'))
			.setDesc(translate('settings.toc_reserved_lane.desc'))
			.addToggle((t) =>
				t
					.setValue(this.plugin.settings.tocReservedLane === true)
					.onChange((v) => setToc({ tocReservedLane: v })),
			);
		new Setting(containerEl)
			.setName(translate('settings.toc_glyph_mode'))
			.addDropdown((d) =>
				d
					.addOptions({
						letter: translate('settings.toc_glyph_mode.letter'),
						name: translate('settings.toc_glyph_mode.name'),
					})
					.setValue(this.plugin.settings.tocGlyphMode ?? 'letter')
					.onChange((v) =>
						setToc({ tocGlyphMode: v as VaultmanSettings['tocGlyphMode'] }),
					),
			);
		new Setting(containerEl)
			.setName(translate('settings.toc_soft_scroll'))
			.setDesc(translate('settings.toc_soft_scroll.desc'))
			.addToggle((t) =>
				t
					.setValue(this.plugin.settings.tocSoftScroll === true)
					.onChange((v) => setToc({ tocSoftScroll: v })),
			);
		new Setting(containerEl)
			.setName(translate('settings.toc_stretch'))
			.setDesc(translate('settings.toc_stretch.desc'))
			.addToggle((t) =>
				t
					.setValue(this.plugin.settings.tocStretch === true)
					.onChange((v) => setToc({ tocStretch: v })),
			);
		new Setting(containerEl)
			.setName(translate('settings.toc_glyph_color'))
			.setDesc(translate('settings.toc_glyph_color.desc'))
			.addDropdown((dropdown) =>
				dropdown
					.addOptions({
						default: translate('settings.toc_glyph_color.default'),
						accent: translate('settings.toc_glyph_color.accent'),
						red: 'Red',
						orange: 'Orange',
						yellow: 'Yellow',
						green: 'Green',
						cyan: 'Cyan',
						blue: 'Blue',
						purple: 'Purple',
						pink: 'Pink',
						rainbow: translate('settings.toc_glyph_color.rainbow'),
					})
					.setValue(this.plugin.settings.tocGlyphColor ?? 'default')
					.onChange((v) =>
						setToc({
							tocGlyphColor:
								v as import('../src/types/typeSettings').VaultmanSettings['tocGlyphColor'],
						}),
					),
			);
		new Setting(containerEl)
			.setName(translate('settings.toc_glyph_color_mode'))
			.setDesc(translate('settings.toc_glyph_color_mode.desc'))
			.addDropdown((dropdown) =>
				dropdown
					.addOptions({
						static: translate('settings.toc_glyph_color_mode.static'),
						always: translate('settings.toc_glyph_color_mode.always'),
					})
					.setValue(this.plugin.settings.tocGlyphColorMode ?? 'static')
					.onChange((v) =>
						setToc({
							tocGlyphColorMode: v === 'always' ? 'always' : 'static',
						}),
					),
			);
		new Setting(containerEl)
			.setName(translate('settings.toc_drill_sync'))
			.setDesc(translate('settings.toc_drill_sync.desc'))
			.addToggle((t) =>
				t
					.setValue(this.plugin.settings.tocDrillSyncsSort === true)
					.onChange((v) => setToc({ tocDrillSyncsSort: v })),
			);
		new Setting(containerEl)
			.setName(translate('settings.toc_niagara_nodes'))
			.setDesc(translate('settings.toc_niagara_nodes.desc'))
			.addToggle((t) =>
				t
					.setValue(this.plugin.settings.floatingTocNiagaraNodes === true)
					.onChange((v) => setToc({ floatingTocNiagaraNodes: v })),
			);
	}
}
