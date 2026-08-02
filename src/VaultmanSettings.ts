import { PluginSettingTab, Setting, type App, Platform } from 'obsidian';
import {
	PROP_CONFLICT_WARNINGS,
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
	PANEL_MENU_KINDS,
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
	type PanelMenuKind,
} from './logic/logicFilesContextMenu';
import {
	addCommandId,
	isVaultmanDefault,
	normalizeCommandIds,
	removeCommandId,
	reorderCommandIds,
	resolveCommandAction,
	resolveCommandActions,
} from './logic/logicCommandActions';
import { listObsidianCommands } from './utils/obsidianCommands';
import {
	GLYPH_COLOR_CHOICES,
	normalizeGlyphColorScope,
	normalizeGlyphCustomColor,
	type GlyphColorChoice,
} from './logic/logicGlyphColor';
import { openCommandPicker } from './modals/modalCommandPicker';
import { RelativeTimeCutoffsModal } from './modals/modalRelativeTimeCutoffs';
import type { TimestampRelativeWindow } from './logic/logicRelativeTime';
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
	/** BT5-036: which node menu the shared context-menu sub-page configures. */
	private contextMenuKind: PanelMenuKind = 'files';

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
						new_instance: translate('settings.open_mode.new_instance'),
					})
					.setValue(
						this.plugin.settings.openMode === 'both'
							? 'new_instance'
							: this.plugin.settings.openMode,
					)
					.onChange(async (value) => {
						this.plugin.settings.openMode = value as
							| 'sidebar'
							| 'main'
							| 'new_instance';
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

		if (!this.plugin.settings.bypassOperations) {
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
			}
			
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
			.setName(translate('settings.style_config'))
			.setHeading();

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
			.setName(translate('settings.floating_toc'))
			.setDesc(translate('settings.floating_toc.desc'))
			.addButton((button) =>
				button.setButtonText(translate('settings.configure')).onClick(() => {
					this.page = 'floating-toc';
					this.display();
				}),
			);

		new Setting(containerEl)
			.setName(translate('settings.operations'))
			.setHeading();

		new Setting(containerEl)
			.setName(translate('settings.queue_warn_supersede'))
			.setDesc(translate('settings.queue_warn_supersede.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.queueWarnOnSupersede)
					.onChange(async (value) => {
						this.plugin.settings.queueWarnOnSupersede = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(translate('settings.text_search_intercepts'))
			.setDesc(translate('settings.text_search_intercepts.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.textSearchInterceptsCoreSearch)
					.onChange(async (value) => {
						this.plugin.settings.textSearchInterceptsCoreSearch = value;
						await this.plugin.saveSettings();
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

		if (!Platform.isMobile) {
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
		}

		new Setting(containerEl)
			.setName(translate('settings.toolbar_overflow'))
			.setDesc(translate('settings.toolbar_overflow.desc'))
			.addDropdown((dropdown) =>
				dropdown
					.addOptions({
						condensed: translate('settings.toolbar_overflow.condensed'),
						scroll: translate('settings.toolbar_overflow.scroll'),
						wrap: translate('settings.toolbar_overflow.wrap'),
					})
					.setValue(this.plugin.settings.toolbarOverflowStrategy)
					.onChange(async (value) => {
						this.plugin.settings.toolbarOverflowStrategy =
							value === 'scroll' || value === 'wrap'
								? value
								: 'condensed';
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

		// BT5-023: Create File binding — Vaultman built-in or an Obsidian command.
		const createBinding = this.plugin.settings.createFileCommand;
		const createBindingLabel = isVaultmanDefault(createBinding)
			? translate('command.picker.default')
			: resolveCommandAction(
					listObsidianCommands(this.plugin.app),
					createBinding,
				).label;
		new Setting(containerEl)
			.setName(translate('settings.create_file_command'))
			.setDesc(translate('settings.create_file_command.desc'))
			.addButton((button) =>
				button.setButtonText(createBindingLabel).onClick(() => {
					openCommandPicker({
						app: this.plugin.app,
						title: translate('settings.create_file_command'),
						includeDefault: true,
						onPick: async (id) => {
							this.plugin.settings.createFileCommand = isVaultmanDefault(id)
								? ''
								: id;
							await this.plugin.saveSettings();
							this.display();
						},
					});
				}),
			);

		// BT5-022: where the built-in Create File/Folder actions live.
		new Setting(containerEl)
			.setName(translate('settings.create_actions_placement'))
			.setDesc(translate('settings.create_actions_placement.desc'))
			.addDropdown((dropdown) =>
				dropdown
					.addOptions({
						searchbox: translate('settings.create_actions_placement.searchbox'),
						toolbar: translate('settings.create_actions_placement.toolbar'),
					})
					.setValue(
						this.plugin.settings.createActionsPlacement === 'toolbar'
							? 'toolbar'
							: 'searchbox',
					)
					.onChange(async (value) => {
						this.plugin.settings.createActionsPlacement =
							value === 'toolbar' ? 'toolbar' : 'searchbox';
						await this.plugin.saveSettings();
					}),
			);

		this.renderToolbarCommandActions(containerEl);

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

	/**
	 * BT5-024: an ordered list of Obsidian commands the Files toolbar renders as
	 * action nodes. Persisted by command id; add is explicit, order is drag, and
	 * a retired command stays as a repairable disabled entry with a warning.
	 */
	private renderToolbarCommandActions(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName(translate('settings.toolbar_commands'))
			.setDesc(translate('settings.toolbar_commands.desc'))
			.addButton((button) =>
				button
					.setIcon('lucide-plus')
					.setTooltip(translate('settings.toolbar_commands.add'))
					.onClick(() => {
						openCommandPicker({
							app: this.plugin.app,
							title: translate('settings.toolbar_commands.add'),
							onPick: async (id) => {
								this.plugin.settings.toolbarCommandActions = addCommandId(
									this.plugin.settings.toolbarCommandActions ?? [],
									id,
								);
								await this.plugin.saveSettings();
								this.display();
							},
						});
					}),
			);

		const ids = normalizeCommandIds(
			this.plugin.settings.toolbarCommandActions ?? [],
		);
		const resolved = resolveCommandActions(
			listObsidianCommands(this.plugin.app),
			ids,
		);
		let draggedId: string | null = null;

		const persist = async (next: string[]): Promise<void> => {
			this.plugin.settings.toolbarCommandActions = next;
			await this.plugin.saveSettings();
			this.display();
		};

		for (const action of resolved) {
			const setting = new Setting(containerEl).setName(action.label);
			if (!action.available) {
				setting.setDesc(
					translate('command.unavailable').replace('{id}', action.id),
				);
				setting.settingEl.addClass('mod-warning');
			} else {
				setting.setDesc(action.id);
			}
			setting.addExtraButton((button) => {
				button.setIcon('lucide-grip-vertical').setTooltip(action.id);
				button.extraSettingsEl.draggable = true;
				button.extraSettingsEl.addEventListener(
					'dragstart',
					(event: DragEvent) => {
						draggedId = action.id;
						if (event.dataTransfer) {
							event.dataTransfer.effectAllowed = 'move';
							event.dataTransfer.setData('text/plain', action.id);
						}
					},
				);
				button.extraSettingsEl.addEventListener('dragend', () => {
					draggedId = null;
				});
			});
			setting.addExtraButton((button) =>
				button
					.setIcon('lucide-trash-2')
					.setTooltip(translate('settings.toolbar_commands.remove'))
					.onClick(() => void persist(removeCommandId(ids, action.id))),
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
				if (!movedId || movedId === action.id) return;
				void persist(reorderCommandIds(ids, movedId, action.id));
			});
		}
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

		// U121-027: the cell-shaping settings gather under one heading. This is not
		// the whole set — `addonCellStyle`, `orderCellsByActivation`, the hover
		// fields and the grid column options still live on their own pages; moving
		// those is a separate UX call.
		new Setting(containerEl).setName(translate('settings.cells_section')).setHeading();

		// BT5-040: folders can show the recursive sum of their files' cells.
		new Setting(containerEl)
			.setName(translate('settings.folder_aggregate_cells'))
			.setDesc(translate('settings.folder_aggregate_cells.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.folderAggregateCells === true)
					.onChange(async (value) => {
						this.plugin.settings.folderAggregateCells = value;
						await this.plugin.saveSettings();
					}),
			);

		// U121-027. saveSettings() notifies the settings listeners and the explorer
		// now subscribes, so toggling this repaints the visible cells immediately.
		new Setting(containerEl)
			.setName(translate('settings.timestamp_format'))
			.setDesc(translate('settings.timestamp_format.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.timestampRelative)
					.onChange(async (value) => {
						this.plugin.settings.timestampRelative = value;
						await this.plugin.saveSettings();
					}),
			);

		// U121-027 (QA 2026-07-31): how far back relative copy reaches before the
		// cell falls back to the exact date. 'always' disables the limit.
		new Setting(containerEl)
			.setName(translate('settings.timestamp_window'))
			.setDesc(translate('settings.timestamp_window.desc'))
			.addDropdown((dropdown) =>
				dropdown
					.addOption('24h', translate('settings.timestamp_window.24h'))
					.addOption('31d', translate('settings.timestamp_window.31d'))
					.addOption('year', translate('settings.timestamp_window.year'))
					.addOption('always', translate('settings.timestamp_window.always'))
					.setValue(this.plugin.settings.timestampRelativeWindow ?? '24h')
					.onChange(async (value) => {
						this.plugin.settings.timestampRelativeWindow =
							value as TimestampRelativeWindow;
						await this.plugin.saveSettings();
					}),
			);

		// U121-027 (QA 2026-07-31): per-unit cutoffs for the relative wording.
		new Setting(containerEl)
			.setName(translate('settings.timestamp_cutoffs'))
			.setDesc(translate('settings.timestamp_cutoffs.desc'))
			.addButton((button) =>
				button
					.setButtonText(translate('settings.timestamp_cutoffs.configure'))
					.onClick(() =>
						new RelativeTimeCutoffsModal(this.app, this.plugin).open(),
					),
			);

		// BT5-033: node icon scope lives in the Explorer menu now (was in Add-ons).
		new Setting(containerEl)
			.setName(translate('settings.node_icon_scope'))
			.setDesc(translate('settings.node_icon_scope.desc'))
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
			.setName(translate('settings.selection_checkbox_position'))
			.setDesc(translate('settings.selection_checkbox_position.desc'))
			.addDropdown((dropdown) =>
				dropdown
					.addOption(
						'start',
						translate('settings.selection_checkbox_position.start'),
					)
					.addOption(
						'end',
						translate('settings.selection_checkbox_position.end'),
					)
					.setValue(this.plugin.settings.selectionCheckboxPosition ?? 'start')
					.onChange(async (value) => {
						this.plugin.settings.selectionCheckboxPosition =
							value === 'end' ? 'end' : 'start';
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

		// BT5-042: how a collapsed folder shows the state hidden inside it.
		new Setting(containerEl)
			.setName(translate('settings.collapsed_folder_badges'))
			.setDesc(translate('settings.collapsed_folder_badges.desc'))
			.addDropdown((dropdown) =>
				dropdown
					.addOptions({
						dot: translate('settings.collapsed_folder_badges.dot'),
						badges: translate('settings.collapsed_folder_badges.badges'),
					})
					.setValue(
						this.plugin.settings.collapsedFolderBadges === 'badges'
							? 'badges'
							: 'dot',
					)
					.onChange(async (value) => {
						this.plugin.settings.collapsedFolderBadges =
							value === 'badges' ? 'badges' : 'dot';
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
			.setName(translate('settings.prop_conflict_warnings'))
			.setDesc(translate('settings.prop_conflict_warnings.desc'))
			.addDropdown((dropdown) => {
				for (const mode of PROP_CONFLICT_WARNINGS) {
					dropdown.addOption(
						mode,
						translate(`settings.prop_conflict_warnings.${mode}`),
					);
				}
				return dropdown
					.setValue(this.plugin.settings.propConflictWarnings)
					.onChange(async (value) => {
						this.plugin.settings.propConflictWarnings =
							PROP_CONFLICT_WARNINGS.find((mode) => mode === value) ?? 'off';
						await this.plugin.saveSettings();
					});
			});

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

		// BT5-025: the Explorer glyph color uses the shared palette. The legacy
		// Rainbow folders toggle is gone from the UI; its setting/code stay for
		// deferred snippet parity.
		new Setting(containerEl)
			.setName(translate('settings.explorer_glyph_color'))
			.setDesc(translate('settings.explorer_glyph_color.desc'))
			.addDropdown((dropdown) =>
				dropdown
					.addOptions(
						Object.fromEntries(
							GLYPH_COLOR_CHOICES.map((choice) => [
								choice,
								translate(`settings.glyph_color.${choice}`),
							]),
						),
					)
					.setValue(this.plugin.settings.explorerGlyphColor ?? 'default')
					.onChange(async (v) => {
						this.plugin.settings.explorerGlyphColor = v as GlyphColorChoice;
						await this.plugin.saveSettings();
						this.display();
					}),
			);
		if (this.plugin.settings.explorerGlyphColor === 'custom') {
			new Setting(containerEl)
				.setName(translate('settings.glyph_color.custom_pick'))
				.addColorPicker((picker) =>
					picker
						.setValue(
							normalizeGlyphCustomColor(
								this.plugin.settings.explorerGlyphCustomColor,
							),
						)
						.onChange(async (v) => {
							this.plugin.settings.explorerGlyphCustomColor = v;
							await this.plugin.saveSettings();
						}),
				);
		}
		if (this.plugin.settings.explorerGlyphColor !== 'default') {
			new Setting(containerEl)
				.setName(translate('settings.explorer_glyph_scope'))
				.setDesc(translate('settings.explorer_glyph_scope.desc'))
				.addDropdown((dropdown) =>
					dropdown
						.addOptions({
							folders: translate('settings.explorer_glyph_scope.folders'),
							files: translate('settings.explorer_glyph_scope.files'),
							both: translate('settings.explorer_glyph_scope.both'),
						})
						.setValue(
							normalizeGlyphColorScope(this.plugin.settings.explorerGlyphScope),
						)
						.onChange(async (v) => {
							this.plugin.settings.explorerGlyphScope =
								normalizeGlyphColorScope(v);
							await this.plugin.saveSettings();
						}),
				);
		}

		// BT5-009: file exclusion is a filter node now, restored by removing its
		// chip like exclude-folder, so it no longer has a settings section.
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

		// BT5-018/036: every node context menu is configurable here, one row per
		// explorer surface, sharing the same sub-page.
		for (const kind of PANEL_MENU_KINDS) {
			new Setting(containerEl)
				.setName(translate(`settings.context_menu_kind.${kind}`))
				.setDesc(translate('settings.files_context_menu.desc'))
				.addButton((button) =>
					button.setButtonText(translate('settings.configure')).onClick(() => {
						this.contextMenuKind = kind;
						this.page = 'files-context-menu';
						this.display();
					}),
				);
		}

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

		// U121-027 (QA 2026-07-31): the tooltip's relative-time options live
		// here, split from the Cells-section trio, which shapes only the cells.
		new Setting(containerEl)
			.setName(translate('settings.tooltip_time_section'))
			.setHeading();

		new Setting(containerEl)
			.setName(translate('settings.timestamp_format'))
			.setDesc(translate('settings.tooltip_timestamp_format.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.tooltipTimestampRelative !== false)
					.onChange(async (value) => {
						this.plugin.settings.tooltipTimestampRelative = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(translate('settings.timestamp_window'))
			.setDesc(translate('settings.tooltip_timestamp_window.desc'))
			.addDropdown((dropdown) =>
				dropdown
					.addOption('24h', translate('settings.timestamp_window.24h'))
					.addOption('31d', translate('settings.timestamp_window.31d'))
					.addOption('year', translate('settings.timestamp_window.year'))
					.addOption('always', translate('settings.timestamp_window.always'))
					.setValue(
						this.plugin.settings.tooltipTimestampRelativeWindow ?? '24h',
					)
					.onChange(async (value) => {
						this.plugin.settings.tooltipTimestampRelativeWindow =
							value as TimestampRelativeWindow;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(translate('settings.timestamp_cutoffs'))
			.setDesc(translate('settings.timestamp_cutoffs.desc'))
			.addButton((button) =>
				button
					.setButtonText(translate('settings.timestamp_cutoffs.configure'))
					.onClick(() =>
						new RelativeTimeCutoffsModal(
							this.app,
							this.plugin,
							'tooltipTimestampRelativeCutoffs',
						).open(),
					),
			);
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

		const kind = this.contextMenuKind;
		new Setting(containerEl)
			.setName(translate(`settings.context_menu_kind.${kind}`))
			.setDesc(translate('settings.files_context_menu.desc'))
			.setHeading();

		const catalog = this.plugin.contextMenuService.panelActionCatalog(kind);
		const labels = new Map(catalog.map((entry) => [entry.id, entry.label]));
		const savedLayout =
			kind === 'files'
				? this.plugin.settings.filesContextMenuLayout
				: this.plugin.settings.contextMenuLayouts?.[kind];
		const layout = mergeFilesMenuLayout(
			savedLayout,
			catalog.map((entry) => entry.id),
		);

		const persist = async (next: FilesMenuItem[]): Promise<void> => {
			const normalized = normalizeFilesMenuLayout(next);
			if (kind === 'files') {
				this.plugin.settings.filesContextMenuLayout = normalized;
			} else {
				this.plugin.settings.contextMenuLayouts = {
					...this.plugin.settings.contextMenuLayouts,
					[kind]: normalized,
				};
			}
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
		const tocPosition = this.plugin.settings.tocPosition ?? 'right';
		// BT5-051 is deferred: Top/Bottom work but not to the standard the dev
		// wants, so they are withheld from the picker instead of removed. The
		// union and the persisted value are untouched, and someone already on
		// Top/Bottom keeps seeing their choice so they can move off it.
		const tocPositionOptions: Record<string, string> = {
			right: translate('settings.toc_position.right'),
			left: translate('settings.toc_position.left'),
		};
		if (tocPosition === 'top' || tocPosition === 'bottom') {
			tocPositionOptions[tocPosition] = translate(
				`settings.toc_position.${tocPosition}`,
			);
		}
		new Setting(containerEl)
			.setName(translate('settings.toc_position'))
			.addDropdown((d) =>
				d
					.addOptions(tocPositionOptions)
					.setValue(tocPosition)
					.onChange((v) =>
						setToc({ tocPosition: v as VaultmanSettings['tocPosition'] }),
					),
			);
		new Setting(containerEl)
			.setName(translate('settings.toc_hide_explorer_scrollbar'))
			.setDesc(translate('settings.toc_hide_explorer_scrollbar.desc'))
			.addToggle((t) =>
				t
					.setValue(
						this.plugin.settings.tocHideExplorerScrollbar === true,
					)
					.onChange(async (v) => {
						await setToc({ tocHideExplorerScrollbar: v });
						this.display();
					}),
			);
		if (this.plugin.settings.tocHideExplorerScrollbar !== true) {
			new Setting(containerEl)
				.setName(translate('settings.toc_reserved_lane'))
				.setDesc(translate('settings.toc_reserved_lane.desc'))
				.addToggle((t) =>
					t
						.setValue(this.plugin.settings.tocReservedLane === true)
						.onChange((v) => setToc({ tocReservedLane: v })),
				);
		}
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
		const glyphColorOptions = Object.fromEntries(
			GLYPH_COLOR_CHOICES.map((choice) => [
				choice,
				translate(`settings.glyph_color.${choice}`),
			]),
		);
		new Setting(containerEl)
			.setName(translate('settings.toc_glyph_color'))
			.setDesc(translate('settings.toc_glyph_color.desc'))
			.addDropdown((dropdown) =>
				dropdown
					.addOptions(glyphColorOptions)
					.setValue(this.plugin.settings.tocGlyphColor ?? 'default')
					.onChange((v) => {
						void setToc({ tocGlyphColor: v as GlyphColorChoice });
						this.display();
					}),
			);
		if (this.plugin.settings.tocGlyphColor === 'custom') {
			new Setting(containerEl)
				.setName(translate('settings.glyph_color.custom_pick'))
				.addColorPicker((picker) =>
					picker
						.setValue(
							normalizeGlyphCustomColor(this.plugin.settings.tocGlyphCustomColor),
						)
						.onChange((v) => setToc({ tocGlyphCustomColor: v })),
				);
		}
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
