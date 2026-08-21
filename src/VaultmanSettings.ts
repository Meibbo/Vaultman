import {
	PluginSettingTab,
	Setting,
	type App,
	Platform,
	type SettingDefinitionItem,
} from 'obsidian';
import {
	DEFAULT_SETTINGS,
	PROP_CONFLICT_WARNINGS,
	type FilesIconScope,
	type iVaultmanPlugin,
	type VaultmanSettings,
} from './types/typeSettings';
import { ConfirmModal } from './modals/modalConfirm';
import {
	ExportSettingsDataModal,
	ImportSettingsDataModal,
	type SettingsDataPayload,
} from './modals/modalSettingsDataTransfer';
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
import { normalizePropMoveTypeConflict } from './logic/logicPropMoveConflict';
import { openCommandPicker } from './modals/modalCommandPicker';
import { RelativeTimeCutoffsModal } from './modals/modalRelativeTimeCutoffs';
import type { TimestampRelativeWindow } from './logic/logicRelativeTime';
import { translate } from './i18n/index';
import { Notice } from 'obsidian';
import { PayloadPreviewModal } from './modals/modalPayloadPreview';
import {
	buildFilterTemplatePreview,
	buildQueueTemplatePreview,
	buildSavedLayoutPreview,
} from './logic/logicPayloadPreview';

export class VaultmanSettingsTab extends PluginSettingTab {
	private plugin: iVaultmanPlugin;

	icon = 'lucide-vault';

	constructor(app: App, plugin: iVaultmanPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		const items: SettingDefinitionItem[] = [];

		items.push(...this.getRootItems());

		return items;
	}

	/**
	 * The root page. Its order is the one the imperative tab had: the operation
	 * settings first, then Layout Configuration, Operations, the templates and
	 * the Add-ons/Developer tail. The sub-pages sit where their `Configure`
	 * buttons used to be, so a user's muscle memory survives the port.
	 */
	private getRootItems(): SettingDefinitionItem[] {
		const items: SettingDefinitionItem[] = [];

		items.push({
			name: translate('settings.open_mode'),
			desc: translate('settings.open_mode.desc'),
			render: (setting: Setting) => {
				setting.addDropdown((dropdown) =>
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
								'sidebar' | 'main' | 'new_instance';
							await this.plugin.saveSettings();
						}),
				);
			},
		});

		items.push({
			name: translate('settings.operation_scope'),
			desc: translate('settings.operation_scope.desc'),
			render: (setting: Setting) => {
				setting.addDropdown((dropdown) =>
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
								'auto' | 'selected' | 'filtered' | 'all';
							await this.plugin.saveSettings();
						}),
				);
			},
		});

		// The threshold only means something while the warnings are armed.
		if (!this.plugin.settings.bypassOperations) {
			items.push({
				name: translate('settings.bulk_operation_warning_threshold'),
				desc: translate('settings.bulk_operation_warning_threshold.desc'),
				render: (setting: Setting) => {
					setting.addSlider((slider) =>
						slider
							.setLimits(50, 2000, 50)
							.setValue(
								this.plugin.settings.bulkOperationWarningThreshold ?? 400,
							)
							.setDynamicTooltip()
							.onChange(async (value) => {
								this.plugin.settings.bulkOperationWarningThreshold = value;
								await this.plugin.saveSettings();
							}),
					);
				},
			});
		}

		items.push({
			name: translate('settings.prop_move_conflict'),
			desc: translate('settings.prop_move_conflict.desc'),
			render: (setting: Setting) => {
				setting.addDropdown((dropdown) =>
					dropdown
						.addOptions({
							coerce: translate('settings.prop_move_conflict.coerce'),
							block: translate('settings.prop_move_conflict.block'),
							ask: translate('settings.prop_move_conflict.ask'),
						})
						// Normalized in both directions, so a stale persisted choice
						// shows the default rather than an empty dropdown.
						.setValue(
							normalizePropMoveTypeConflict(
								this.plugin.settings.propMoveTypeConflict,
							),
						)
						.onChange(async (value) => {
							this.plugin.settings.propMoveTypeConflict =
								normalizePropMoveTypeConflict(value);
							await this.plugin.saveSettings();
						}),
				);
			},
		});

		items.push({
			name: translate('settings.bypass_operations'),
			desc: translate('settings.bypass_operations.desc'),
			render: (setting: Setting) => {
				setting.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.bypassOperations)
						.onChange(async (value) => {
							this.plugin.settings.bypassOperations = value;
							this.plugin.queueService?.setBypassOperations(value);
							await this.plugin.saveSettings();
							// The threshold row appears and disappears with this toggle.
							this.update();
						}),
				);
			},
		});

		items.push({
			name: translate('settings.style_config'),
			render: (setting: Setting) => {
				setting.setHeading();
			},
		});

		items.push({
			type: 'page',
			name: translate('settings.toolbar'),
			desc: translate('settings.toolbar.desc'),
			items: this.getToolbarPageItems(),
		});

		items.push({
			type: 'page',
			name: translate('settings.floating_toc'),
			desc: translate('settings.floating_toc.desc'),
			items: this.getFloatingTocPageItems(),
		});

		items.push({
			name: translate('settings.operations'),
			render: (setting: Setting) => {
				setting.setHeading();
			},
		});

		items.push({
			name: translate('settings.queue_warn_supersede'),
			desc: translate('settings.queue_warn_supersede.desc'),
			render: (setting: Setting) => {
				setting.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.queueWarnOnSupersede)
						.onChange(async (value) => {
							this.plugin.settings.queueWarnOnSupersede = value;
							await this.plugin.saveSettings();
						}),
				);
			},
		});

		items.push({
			name: translate('settings.text_search_intercepts'),
			desc: translate('settings.text_search_intercepts.desc'),
			render: (setting: Setting) => {
				setting.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.textSearchInterceptsCoreSearch)
						.onChange(async (value) => {
							this.plugin.settings.textSearchInterceptsCoreSearch = value;
							await this.plugin.saveSettings();
						}),
				);
			},
		});

		items.push({
			name: translate('settings.show_dock'),
			desc: translate('settings.show_dock.desc'),
			render: (setting: Setting) => {
				setting.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.showDock)
						.onChange(async (value) => {
							this.plugin.settings.showDock = value;
							await this.plugin.saveSettings();
						}),
				);
			},
		});

		items.push({
			type: 'page',
			name: translate('settings.explorer_page'),
			desc: translate('settings.explorer_page.desc'),
			items: this.getExplorerPageItems(),
		});

		items.push({
			type: 'page',
			name: translate('settings.context_menu'),
			desc: translate('settings.context_menu.page_desc'),
			items: this.getContextMenusPageItems(),
		});

		items.push({
			type: 'page',
			name: translate('settings.files_hover_info'),
			desc: translate('settings.files_hover_info.desc'),
			items: this.getFilesHoverPageItems(),
		});

		items.push({
			name: translate('settings.style_preset'),
			desc: translate('settings.style_preset.desc'),
			render: (setting: Setting) => {
				setting.addDropdown((dropdown) =>
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
							// The blur slider only exists in the experimental preset.
							this.update();
						}),
				);
			},
		});

		if (!this.plugin.settings.minimalStyle) {
			items.push({
				name: translate('settings.background_blur'),
				desc: translate('settings.background_blur.desc'),
				render: (setting: Setting) => {
					setting.addSlider((slider) =>
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
				},
			});
		}

		items.push(...this.getFilterTemplateItems());
		items.push(...this.getQueueTemplateItems());
		items.push(...this.getSavedLayoutItems());

		items.push({
			name: translate('settings.addons'),
			render: (setting: Setting) => {
				setting.setHeading();
			},
		});

		items.push({
			name: translate('settings.addons.iconic'),
			desc: translate('settings.addons.iconic.desc'),
			render: (setting: Setting) => {
				setting.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.iconicEnabled !== false)
						.onChange(async (value) => {
							this.plugin.settings.iconicEnabled = value;
							this.plugin.iconicService?.setEnabled(value);
							await this.plugin.saveSettings();
						}),
				);
			},
		});

		items.push({
			name: translate('settings.developer_tools'),
			render: (setting: Setting) => {
				setting.setHeading();
			},
		});

		items.push({
			name: translate('settings.performance_monitor'),
			desc: translate('settings.performance_monitor.desc'),
			render: (setting: Setting) => {
				setting.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.performanceHudEnabled)
						.onChange(async (value) => {
							this.plugin.settings.performanceHudEnabled = value;
							await this.plugin.saveSettings();
						}),
				);
			},
		});

		items.push({
			type: 'page',
			name: translate('settings.developer'),
			desc: translate('settings.developer.desc'),
			items: this.getDeveloperPageItems(),
		});
		return items;
	}

	private getDeveloperPageItems(): SettingDefinitionItem[] {
		const items: SettingDefinitionItem[] = [];

		items.push({
			name: translate('settings.data_transfer'),
			desc: translate('settings.data_transfer.desc'),
			render: (setting: Setting) => {
				setting.addButton((button) =>
					button
						.setButtonText(translate('settings.data_transfer.export'))
						.onClick(() => {
							const payload: SettingsDataPayload = {
								filterTemplates: this.plugin.settings.filterTemplates,
								queueTemplates: this.plugin.settings.queueTemplates,
								savedLayouts: this.plugin.settings.savedLayouts ?? [],
							};
							new ExportSettingsDataModal(this.app, payload).open();
						}),
				);
				setting.addButton((button) =>
					button
						.setButtonText(translate('settings.data_transfer.import'))
						.onClick(() => {
							new ImportSettingsDataModal(this.app, async (payload) => {
								if (payload.filterTemplates !== undefined) {
									this.plugin.settings.filterTemplates =
										payload.filterTemplates;
								}
								if (payload.queueTemplates !== undefined) {
									this.plugin.settings.queueTemplates = payload.queueTemplates;
								}
								if (payload.savedLayouts !== undefined) {
									this.plugin.settings.savedLayouts = payload.savedLayouts;
								}
								await this.plugin.saveSettings();
								new Notice(translate('settings.data_transfer.import.done'));
								this.display();
							}).open();
						}),
				);
			},
		});

		items.push({
			name: translate('settings.reset'),
			desc: translate('settings.reset.desc'),
			render: (setting: Setting) => {
				setting.addButton((button) =>
					button
						.setWarning()
						.setButtonText(translate('settings.reset.button'))
						.onClick(() => {
							new ConfirmModal(this.app, {
								title: translate('settings.reset.confirm_title'),
								message: translate('settings.reset.confirm_message'),
								ctaLabel: translate('settings.reset.button'),
								onConfirm: async () => {
									this.plugin.settings = JSON.parse(
										JSON.stringify(DEFAULT_SETTINGS),
									) as VaultmanSettings;
									await this.plugin.saveSettings();
									new Notice(translate('settings.reset.done'));
									this.display();
								},
							}).open();
						}),
				);
			},
		});

		return items;
	}

	/** Saved filter templates: preview the payload or drop the template. */
	private getFilterTemplateItems(): SettingDefinitionItem[] {
		const items: SettingDefinitionItem[] = [];

		items.push({
			name: translate('settings.templates'),
			render: (setting: Setting) => {
				setting.setHeading();
			},
		});

		const templates = this.plugin.settings.filterTemplates;
		if (templates.length === 0) {
			items.push({
				name: '',
				desc: translate('settings.templates.desc'),
				render: () => {},
			});
			return items;
		}

		for (const template of templates) {
			items.push({
				name: template.name,
				desc: `${template.root.children.length} filters`,
				render: (setting: Setting) => {
					setting
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
									this.update();
								}),
						);
				},
			});
		}
		return items;
	}

	/** Operation sets, plus the bulk-warning toggle that governs them. */
	private getQueueTemplateItems(): SettingDefinitionItem[] {
		const items: SettingDefinitionItem[] = [];

		items.push({
			name: translate('queue.template.templates'),
			render: (setting: Setting) => {
				setting.setHeading();
			},
		});

		items.push({
			name: translate('settings.bulk_operation_warning'),
			desc: translate('settings.bulk_operation_warning.desc'),
			render: (setting: Setting) => {
				setting.addToggle((toggle) =>
					toggle
						// The setting stores the suppression; the toggle shows the warning.
						.setValue(!this.plugin.settings.suppressBulkOperationWarning)
						.onChange(async (value) => {
							this.plugin.settings.suppressBulkOperationWarning = !value;
							await this.plugin.saveSettings();
						}),
				);
			},
		});

		const templates = this.plugin.settings.queueTemplates;
		if (templates.length === 0) {
			items.push({
				name: '',
				desc: translate('settings.queue_templates.desc'),
				render: () => {},
			});
			return items;
		}

		for (const template of templates) {
			items.push({
				name: template.name,
				desc: `${template.changes.length} operations`,
				render: (setting: Setting) => {
					setting
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
									this.update();
								}),
						);
				},
			});
		}
		return items;
	}

	/** Saved compositions of the explorer view. */
	private getSavedLayoutItems(): SettingDefinitionItem[] {
		const items: SettingDefinitionItem[] = [];

		items.push({
			name: translate('settings.saved_view_config'),
			render: (setting: Setting) => {
				setting.setHeading();
			},
		});

		const layouts = this.plugin.settings.savedLayouts ?? [];
		if (layouts.length === 0) {
			items.push({
				name: '',
				desc: translate('settings.saved_view_config.empty'),
				render: () => {},
			});
			return items;
		}

		for (const layout of layouts) {
			items.push({
				name: layout.name,
				desc: layout.summary,
				render: (setting: Setting) => {
					setting
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
									this.update();
								}),
						);
				},
			});
		}
		return items;
	}

	private getToolbarPageItems(): SettingDefinitionItem[] {
		const items: SettingDefinitionItem[] = [];

		items.push({
			name: translate('settings.toolbar'),
			desc: translate('settings.toolbar.desc'),
			render: (setting: Setting) => {
				setting.setHeading();
			},
		});

		items.push({
			name: translate('settings.filters_show_tab_labels'),
			desc: translate('settings.filters_show_tab_labels.desc'),
			render: (setting: Setting) => {
				setting.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.filtersShowTabLabels)
						.onChange(async (value) => {
							this.plugin.settings.filtersShowTabLabels = value;
							await this.plugin.saveSettings();
						}),
				);
			},
		});

		if (!Platform.isMobile) {
			items.push({
				name: translate('settings.show_toolbar'),
				desc: translate('settings.show_toolbar.desc'),
				render: (setting: Setting) => {
					setting.addToggle((toggle) =>
						toggle
							.setValue(this.plugin.settings.showToolbar !== false)
							.onChange(async (value) => {
								this.plugin.settings.showToolbar = value;
								await this.plugin.saveSettings();
							}),
					);
				},
			});
		}

		items.push({
			name: translate('settings.toolbar_overflow'),
			desc: translate('settings.toolbar_overflow.desc'),
			render: (setting: Setting) => {
				setting.addDropdown((dropdown) =>
					dropdown
						.addOptions({
							condensed: translate('settings.toolbar_overflow.condensed'),
							scroll: translate('settings.toolbar_overflow.scroll'),
							wrap: translate('settings.toolbar_overflow.wrap'),
						})
						.setValue(this.plugin.settings.toolbarOverflowStrategy)
						.onChange(async (value) => {
							this.plugin.settings.toolbarOverflowStrategy =
								value === 'scroll' || value === 'wrap' ? value : 'condensed';
							await this.plugin.saveSettings();
						}),
				);
			},
		});

		items.push({
			name: translate('settings.toolbar_tools_menu'),
			desc: translate('settings.toolbar_tools_menu.desc'),
			render: (setting: Setting) => {
				setting.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.toolbarToolsMenu === true)
						.onChange(async (value) => {
							this.plugin.settings.toolbarToolsMenu = value;
							await this.plugin.saveSettings();
						}),
				);
			},
		});

		// BT5-023: Create File binding — Vaultman built-in or an Obsidian command.
		const createBinding = this.plugin.settings.createFileCommand;
		const createBindingLabel = isVaultmanDefault(createBinding)
			? translate('command.picker.default')
			: resolveCommandAction(
					listObsidianCommands(this.plugin.app),
					createBinding,
				).label;
		items.push({
			name: translate('settings.create_file_command'),
			desc: translate('settings.create_file_command.desc'),
			render: (setting: Setting) => {
				setting.addButton((button) =>
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
								this.update();
							},
						});
					}),
				);
			},
		});

		// BT5-022: where the built-in Create File/Folder actions live.
		items.push({
			name: translate('settings.create_actions_placement'),
			desc: translate('settings.create_actions_placement.desc'),
			render: (setting: Setting) => {
				setting.addDropdown((dropdown) =>
					dropdown
						.addOptions({
							searchbox: translate(
								'settings.create_actions_placement.searchbox',
							),
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
			},
		});

		items.push(...this.getToolbarCommandActionsItems());

		items.push({
			name: translate('settings.sort_level_inline'),
			desc: translate('settings.sort_level_inline.desc'),
			render: (setting: Setting) => {
				setting.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.sortLevelInline !== false)
						.onChange(async (value) => {
							this.plugin.settings.sortLevelInline = value;
							await this.plugin.saveSettings();
						}),
				);
			},
		});
		return items;
	}

	/**
	 * BT5-024: an ordered list of Obsidian commands the Files toolbar renders as
	 * action nodes. Persisted by command id; add is explicit, order is drag, and
	 * a retired command stays as a repairable disabled entry with a warning.
	 */
	private getToolbarCommandActionsItems(): SettingDefinitionItem[] {
		const items: SettingDefinitionItem[] = [];
		items.push({
			name: translate('settings.toolbar_commands'),
			desc: translate('settings.toolbar_commands.desc'),
			render: (setting: Setting) => {
				setting.addButton((button) =>
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
									this.update();
								},
							});
						}),
				);
			},
		});

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
			this.update();
		};

		for (const action of resolved) {
			items.push({
				name: action.label,
				render: (setting: Setting) => {
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
				},
			});
		}
		return items;
	}

	private getExplorerPageItems(): SettingDefinitionItem[] {
		const items: SettingDefinitionItem[] = [];

		items.push({
			name: translate('settings.explorer_page'),
			render: (setting: Setting) => {
				setting.setHeading();
			},
		});

		// U121-027: the cell-shaping settings gather under one heading. This is not
		// the whole set — `addonCellStyle`, `orderCellsByActivation`, the hover
		// fields and the grid column options still live on their own pages; moving
		// those is a separate UX call.
		items.push({
			name: translate('settings.cells_section'),
			render: (setting: Setting) => {
				setting.setHeading();
			},
		});

		// BT5-040: folders can show the recursive sum of their files' cells.
		items.push({
			name: translate('settings.folder_aggregate_cells'),
			desc: translate('settings.folder_aggregate_cells.desc'),
			render: (setting: Setting) => {
				setting.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.folderAggregateCells === true)
						.onChange(async (value) => {
							this.plugin.settings.folderAggregateCells = value;
							await this.plugin.saveSettings();
						}),
				);
			},
		});

		items.push({
			name: translate('settings.sticky_parent_rows_fraction'),
			desc: translate('settings.sticky_parent_rows_fraction.desc'),
			render: (setting: Setting) => {
				// En porcentaje, que es como se lee el limite; se guarda como
				// fraccion. El rango va de 20 a 60: por debajo no cabe casi
				// ninguna cabecera y por encima el arbol se queda sin sitio
				// para su propio contenido.
				setting.addSlider((slider) =>
					slider
						.setLimits(20, 60, 5)
						.setDynamicTooltip()
						.setValue(
							Math.round(
								(this.plugin.settings.stickyParentRowsMaxFraction ?? 0.4) * 100,
							),
						)
						.onChange(async (value) => {
							this.plugin.settings.stickyParentRowsMaxFraction = value / 100;
							await this.plugin.saveSettings();
						}),
				);
			},
		});

		items.push({
			name: translate('settings.sticky_parent_rows'),
			desc: translate('settings.sticky_parent_rows.desc'),
			render: (setting: Setting) => {
				setting.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.stickyParentRows !== false)
						.onChange(async (value) => {
							this.plugin.settings.stickyParentRows = value;
							await this.plugin.saveSettings();
						}),
				);
			},
		});

		// U121-027. saveSettings() notifies the settings listeners and the explorer
		// now subscribes, so toggling this repaints the visible cells immediately.
		items.push({
			name: translate('settings.timestamp_format'),
			desc: translate('settings.timestamp_format.desc'),
			render: (setting: Setting) => {
				setting.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.timestampRelative)
						.onChange(async (value) => {
							this.plugin.settings.timestampRelative = value;
							await this.plugin.saveSettings();
						}),
				);
			},
		});

		// U121-027 (QA 2026-07-31): how far back relative copy reaches before the
		// cell falls back to the exact date. 'always' disables the limit.
		items.push({
			name: translate('settings.timestamp_window'),
			desc: translate('settings.timestamp_window.desc'),
			render: (setting: Setting) => {
				setting.addDropdown((dropdown) =>
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
			},
		});

		// U121-027 (QA 2026-07-31): per-unit cutoffs for the relative wording.
		items.push({
			name: translate('settings.timestamp_cutoffs'),
			desc: translate('settings.timestamp_cutoffs.desc'),
			render: (setting: Setting) => {
				setting.addButton((button) =>
					button
						.setButtonText(translate('settings.timestamp_cutoffs.configure'))
						.onClick(() =>
							new RelativeTimeCutoffsModal(this.app, this.plugin).open(),
						),
				);
			},
		});

		// BT5-033: node icon scope lives in the Explorer menu now (was in Add-ons).
		items.push({
			name: translate('settings.node_icon_scope'),
			desc: translate('settings.node_icon_scope.desc'),
			render: (setting: Setting) => {
				setting.addDropdown((dropdown) =>
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
			},
		});

		items.push({
			name: translate('settings.addon_cell_style'),
			desc: translate('settings.addon_cell_style.desc'),
			render: (setting: Setting) => {
				setting.addDropdown((dropdown) =>
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
			},
		});

		items.push({
			name: translate('settings.order_cells_by_activation'),
			desc: translate('settings.order_cells_by_activation.desc'),
			render: (setting: Setting) => {
				setting.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.orderCellsByActivation === true)
						.onChange(async (value) => {
							this.plugin.settings.orderCellsByActivation = value;
							await this.plugin.saveSettings();
						}),
				);
			},
		});

		items.push({
			name: translate('settings.icon_in_caret_slot'),
			desc: translate('settings.icon_in_caret_slot.desc'),
			render: (setting: Setting) => {
				setting.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.iconInCaretSlot === true)
						.onChange(async (value) => {
							this.plugin.settings.iconInCaretSlot = value;
							await this.plugin.saveSettings();
						}),
				);
			},
		});

		items.push({
			name: translate('settings.selection_checkbox_position'),
			desc: translate('settings.selection_checkbox_position.desc'),
			render: (setting: Setting) => {
				setting.addDropdown((dropdown) =>
					dropdown
						.addOption(
							'start',
							translate('settings.selection_checkbox_position.start'),
						)
						.addOption(
							'end',
							translate('settings.selection_checkbox_position.end'),
						)
						.addOption(
							'hidden',
							translate('settings.selection_checkbox_position.hidden'),
						)
						.setValue(this.plugin.settings.selectionCheckboxPosition ?? 'start')
						.onChange(async (value) => {
							this.plugin.settings.selectionCheckboxPosition = value as
								'start' | 'end' | 'hidden';
							await this.plugin.saveSettings();
						}),
				);
			},
		});

		items.push({
			name: translate('settings.badge_colors'),
			desc: translate('settings.badge_colors.desc'),
			render: (setting: Setting) => {
				setting.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.coloredBadges)
						.onChange(async (value) => {
							this.plugin.settings.coloredBadges = value;
							await this.plugin.saveSettings();
						}),
				);
			},
		});

		// BT5-042: how a collapsed folder shows the state hidden inside it.
		items.push({
			name: translate('settings.collapsed_folder_badges'),
			desc: translate('settings.collapsed_folder_badges.desc'),
			render: (setting: Setting) => {
				setting.addDropdown((dropdown) =>
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
			},
		});

		// U121-083: the rail's widgets are a navbar, so they behave like one.
		items.push({
			name: translate('settings.floating_toc_sticky_actions'),
			desc: translate('settings.floating_toc_sticky_actions.desc'),
			render: (setting: Setting) => {
				setting.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.floatingTocStickyActions !== false)
						.onChange(async (value) => {
							this.plugin.settings.floatingTocStickyActions = value;
							await this.plugin.saveSettings();
						}),
				);
			},
		});

		// U121-062: one gesture deletes one thing, unless you say otherwise.
		items.push({
			name: translate('settings.keep_property_when_last_value_deleted'),
			desc: translate('settings.keep_property_when_last_value_deleted.desc'),
			render: (setting: Setting) => {
				setting.addToggle((toggle) =>
					toggle
						.setValue(
							this.plugin.settings.keepPropertyWhenLastValueDeleted !== false,
						)
						.onChange(async (value) => {
							this.plugin.settings.keepPropertyWhenLastValueDeleted = value;
							await this.plugin.saveSettings();
						}),
				);
			},
		});

		// U121-077: the loud one, off by default.
		items.push({
			name: translate('settings.deletion_highlight'),
			desc: translate('settings.deletion_highlight.desc'),
			render: (setting: Setting) => {
				setting.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.deletionHighlight === true)
						.onChange(async (value) => {
							this.plugin.settings.deletionHighlight = value;
							await this.plugin.saveSettings();
						}),
				);
			},
		});

		items.push({
			name: translate('settings.auto_reveal_active_file'),
			desc: translate('settings.auto_reveal_active_file.desc'),
			render: (setting: Setting) => {
				setting.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.autoRevealActiveFile === true)
						.onChange(async (value) => {
							this.plugin.settings.autoRevealActiveFile = value;
							await this.plugin.saveSettings();
						}),
				);
			},
		});

		items.push({
			name: translate('settings.mobile_rounded_rows'),
			desc: translate('settings.mobile_rounded_rows.desc'),
			render: (setting: Setting) => {
				setting.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.mobileRoundedRows === true)
						.onChange(async (value) => {
							this.plugin.settings.mobileRoundedRows = value;
							await this.plugin.saveSettings();
						}),
				);
			},
		});

		items.push({
			name: translate('settings.badge_cancel_click'),
			desc: translate('settings.badge_cancel_click.desc'),
			render: (setting: Setting) => {
				setting.addDropdown((dropdown) =>
					dropdown
						.addOption(
							'double',
							translate('settings.badge_cancel_click.double'),
						)
						.addOption(
							'single',
							translate('settings.badge_cancel_click.single'),
						)
						.setValue(this.plugin.settings.badgeCancelClickMode)
						.onChange(async (value) => {
							this.plugin.settings.badgeCancelClickMode =
								value === 'single' ? 'single' : 'double';
							await this.plugin.saveSettings();
						}),
				);
			},
		});

		items.push({
			name: translate('settings.prop_conflict_warnings'),
			desc: translate('settings.prop_conflict_warnings.desc'),
			render: (setting: Setting) => {
				setting.addDropdown((dropdown) => {
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
			},
		});

		items.push({
			name: translate('settings.search_highlights'),
			desc: translate('settings.search_highlights.desc'),
			render: (setting: Setting) => {
				setting.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.explorerSearchHighlights)
						.onChange(async (value) => {
							this.plugin.settings.explorerSearchHighlights = value;
							await this.plugin.saveSettings();
						}),
				);
			},
		});

		// BT5-025: the Explorer glyph color uses the shared palette. The legacy
		// Rainbow folders toggle is gone from the UI; its setting/code stay for
		// deferred snippet parity.
		items.push({
			name: translate('settings.explorer_glyph_color'),
			desc: translate('settings.explorer_glyph_color.desc'),
			render: (setting: Setting) => {
				setting.addDropdown((dropdown) =>
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
							this.update();
						}),
				);
			},
		});

		if (this.plugin.settings.explorerGlyphColor === 'custom') {
			items.push({
				name: translate('settings.glyph_color.custom_pick'),
				render: (setting: Setting) => {
					setting.addColorPicker((picker) =>
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
				},
			});
		}
		if (this.plugin.settings.explorerGlyphColor !== 'default') {
			items.push({
				name: translate('settings.explorer_glyph_scope'),
				desc: translate('settings.explorer_glyph_scope.desc'),
				render: (setting: Setting) => {
					setting.addDropdown((dropdown) =>
						dropdown
							.addOptions({
								folders: translate('settings.explorer_glyph_scope.folders'),
								files: translate('settings.explorer_glyph_scope.files'),
								both: translate('settings.explorer_glyph_scope.both'),
							})
							.setValue(
								normalizeGlyphColorScope(
									this.plugin.settings.explorerGlyphScope,
								),
							)
							.onChange(async (v) => {
								this.plugin.settings.explorerGlyphScope =
									normalizeGlyphColorScope(v);
								await this.plugin.saveSettings();
							}),
					);
				},
			});
		}

		// BT5-009: file exclusion is a filter node now, restored by removing its
		// chip like exclude-folder, so it no longer has a settings section.
		return items;
	}

	private getContextMenusPageItems(): SettingDefinitionItem[] {
		const items: SettingDefinitionItem[] = [];

		items.push({
			name: translate('settings.context_menu'),
			render: (setting: Setting) => {
				setting.setHeading();
			},
		});

		// BT5-018/036: every node context menu is configurable here, one row per
		// explorer surface, sharing the same sub-page.
		for (const kind of PANEL_MENU_KINDS) {
			items.push({
				type: 'page',
				name: translate(`settings.context_menu_kind.${kind}`),
				desc: translate('settings.files_context_menu.desc'),
				items: this.getFilesContextMenuPageItems(kind),
			});
		}

		items.push({
			name: translate('settings.context_menu.file_menu'),
			desc: translate('settings.context_menu.file_menu.desc'),
			render: (setting: Setting) => {
				setting.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.contextMenuShowInFileMenu)
						.onChange(async (value) => {
							this.plugin.settings.contextMenuShowInFileMenu = value;
							await this.plugin.saveSettings();
						}),
				);
			},
		});

		items.push({
			name: translate('settings.context_menu.editor_menu'),
			desc: translate('settings.context_menu.editor_menu.desc'),
			render: (setting: Setting) => {
				setting.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.contextMenuShowInEditorMenu)
						.onChange(async (value) => {
							this.plugin.settings.contextMenuShowInEditorMenu = value;
							await this.plugin.saveSettings();
						}),
				);
			},
		});

		items.push({
			name: translate('settings.context_menu.more_options'),
			desc: translate('settings.context_menu.more_options.desc'),
			render: (setting: Setting) => {
				setting.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.contextMenuShowInMoreOptions)
						.onChange(async (value) => {
							this.plugin.settings.contextMenuShowInMoreOptions = value;
							await this.plugin.saveSettings();
						}),
				);
			},
		});

		return items;
	}

	private getFilesHoverPageItems(): SettingDefinitionItem[] {
		const items: SettingDefinitionItem[] = [];

		items.push({
			name: translate('settings.files_hover_info'),
			desc: translate('settings.files_hover_info.desc'),
			render: (setting: Setting) => {
				setting.setHeading();
			},
		});

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
			items.push({
				name: translate(entry.labelKey),
				render: (setting: Setting) => {
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
									normalizeFileHoverEnabled(
										this.plugin.settings.filesHoverInfo,
									),
								);
								if (value) selected.add(entry.id);
								else selected.delete(entry.id);
								this.plugin.settings.filesHoverInfo = order.filter(
									(candidate) => selected.has(candidate),
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
						if (
							nextOrder.every((candidate, index) => candidate === order[index])
						) {
							return;
						}
						this.plugin.settings.filesHoverInfoOrder = nextOrder;
						void this.plugin.saveSettings().then(() => this.update());
					});
				},
			});
		}

		// U121-027 (QA 2026-07-31): the tooltip's relative-time options live
		// here, split from the Cells-section trio, which shapes only the cells.
		items.push({
			name: translate('settings.tooltip_time_section'),
			render: (setting: Setting) => {
				setting.setHeading();
			},
		});

		items.push({
			name: translate('settings.timestamp_format'),
			desc: translate('settings.tooltip_timestamp_format.desc'),
			render: (setting: Setting) => {
				setting.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.tooltipTimestampRelative !== false)
						.onChange(async (value) => {
							this.plugin.settings.tooltipTimestampRelative = value;
							await this.plugin.saveSettings();
						}),
				);
			},
		});

		items.push({
			name: translate('settings.timestamp_window'),
			desc: translate('settings.tooltip_timestamp_window.desc'),
			render: (setting: Setting) => {
				setting.addDropdown((dropdown) =>
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
			},
		});

		items.push({
			name: translate('settings.timestamp_cutoffs'),
			desc: translate('settings.timestamp_cutoffs.desc'),
			render: (setting: Setting) => {
				setting.addButton((button) =>
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
			},
		});
		return items;
	}

	/**
	 * BT5-018: the Files node context menu, configured like the hover-info
	 * list — drag to reorder, toggle to show or hide — plus dividers and
	 * submenus the user can create. Everything is stored by action id.
	 */
	private getFilesContextMenuPageItems(
		kind: (typeof PANEL_MENU_KINDS)[number],
	): SettingDefinitionItem[] {
		const items: SettingDefinitionItem[] = [];
		items.push({
			name: translate(`settings.context_menu_kind.${kind}`),
			desc: translate('settings.files_context_menu.desc'),
			render: (setting: Setting) => {
				setting.setHeading();
			},
		});

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
			this.update();
		};

		items.push({
			name: '',
			render: (setting: Setting) => {
				setting
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
							.onClick(
								() =>
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
							.onClick(
								() =>
									void persist(
										defaultFilesMenuLayout(catalog.map((entry) => entry.id)),
									),
							),
					);
			},
		});

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
			items.push({
				name: '',
				render: (setting: Setting) => {
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

					if (
						item.kind === 'action' &&
						!isNative &&
						submenuChoices.length > 0
					) {
						setting.addDropdown((dropdown) => {
							dropdown.addOption(
								'',
								translate('settings.files_context_menu.no_submenu'),
							);
							for (const submenu of submenuChoices) {
								dropdown.addOption(submenu.id, submenu.label);
							}
							dropdown.setValue(item.parent ?? '');
							dropdown.onChange(
								(value) =>
									void persist(
										setFilesMenuParent(layout, item.id, value || null),
									),
							);
						});
					}

					if (item.kind === 'action') {
						setting.addToggle((toggle) =>
							toggle
								.setValue(item.visible)
								.onChange(
									(value) =>
										void persist(
											setFilesMenuVisibility(layout, item.id, value),
										),
								),
						);
					} else {
						setting.addExtraButton((button) =>
							button
								.setIcon('lucide-trash-2')
								.setTooltip(translate('settings.files_context_menu.remove'))
								.onClick(
									() => void persist(removeFilesMenuItem(layout, item.id)),
								),
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
				},
			});
		}
		return items;
	}

	private getFloatingTocPageItems(): SettingDefinitionItem[] {
		const items: SettingDefinitionItem[] = [];

		items.push({
			name: translate('settings.floating_toc'),
			render: (setting: Setting) => {
				setting.setHeading();
			},
		});

		items.push({
			name: translate('settings.floating_toc_enable'),
			desc: translate('settings.floating_toc_enable.desc'),
			render: (setting: Setting) => {
				setting.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.floatingTocEnabled === true)
						.onChange(async (value) => {
							this.plugin.settings.floatingTocEnabled = value;
							await this.plugin.saveSettings();
						}),
				);
			},
		});

		items.push({
			name: translate('settings.floating_toc_niagara'),
			desc: translate('settings.floating_toc_niagara.desc'),
			render: (setting: Setting) => {
				setting.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.floatingTocNiagara === true)
						.onChange(async (value) => {
							this.plugin.settings.floatingTocNiagara = value;
							await this.plugin.saveSettings();
						}),
				);
			},
		});

		const setToc = async (patch: Partial<typeof this.plugin.settings>) => {
			Object.assign(this.plugin.settings, patch);
			await this.plugin.saveSettings();
		};
		items.push({
			name: translate('settings.toc_plain_style'),
			desc: translate('settings.toc_plain_style.desc'),
			render: (setting: Setting) => {
				setting.addToggle((t) =>
					t
						.setValue(this.plugin.settings.floatingTocPlainStyle === true)
						.onChange((v) => setToc({ floatingTocPlainStyle: v })),
				);
			},
		});

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
		items.push({
			name: translate('settings.toc_position'),
			render: (setting: Setting) => {
				setting.addDropdown((d) =>
					d
						.addOptions(tocPositionOptions)
						.setValue(tocPosition)
						.onChange((v) =>
							setToc({ tocPosition: v as VaultmanSettings['tocPosition'] }),
						),
				);
			},
		});

		items.push({
			name: translate('settings.toc_hide_explorer_scrollbar'),
			desc: translate('settings.toc_hide_explorer_scrollbar.desc'),
			render: (setting: Setting) => {
				setting.addToggle((t) =>
					t
						.setValue(this.plugin.settings.tocHideExplorerScrollbar === true)
						.onChange(async (v) => {
							await setToc({ tocHideExplorerScrollbar: v });
							this.update();
						}),
				);
			},
		});

		if (this.plugin.settings.tocHideExplorerScrollbar !== true) {
			items.push({
				name: translate('settings.toc_reserved_lane'),
				desc: translate('settings.toc_reserved_lane.desc'),
				render: (setting: Setting) => {
					setting.addToggle((t) =>
						t
							.setValue(this.plugin.settings.tocReservedLane === true)
							.onChange((v) => setToc({ tocReservedLane: v })),
					);
				},
			});
		}
		items.push({
			name: translate('settings.toc_glyph_mode'),
			render: (setting: Setting) => {
				setting.addDropdown((d) =>
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
			},
		});

		items.push({
			name: translate('settings.toc_soft_scroll'),
			desc: translate('settings.toc_soft_scroll.desc'),
			render: (setting: Setting) => {
				setting.addToggle((t) =>
					t
						.setValue(this.plugin.settings.tocSoftScroll === true)
						.onChange((v) => setToc({ tocSoftScroll: v })),
				);
			},
		});

		items.push({
			name: translate('settings.toc_stretch'),
			desc: translate('settings.toc_stretch.desc'),
			render: (setting: Setting) => {
				setting.addToggle((t) =>
					t
						.setValue(this.plugin.settings.tocStretch === true)
						.onChange((v) => setToc({ tocStretch: v })),
				);
			},
		});

		const glyphColorOptions = Object.fromEntries(
			GLYPH_COLOR_CHOICES.map((choice) => [
				choice,
				translate(`settings.glyph_color.${choice}`),
			]),
		);
		items.push({
			name: translate('settings.toc_glyph_color'),
			desc: translate('settings.toc_glyph_color.desc'),
			render: (setting: Setting) => {
				setting.addDropdown((dropdown) =>
					dropdown
						.addOptions(glyphColorOptions)
						.setValue(this.plugin.settings.tocGlyphColor ?? 'default')
						.onChange((v) => {
							void setToc({ tocGlyphColor: v as GlyphColorChoice });
							this.update();
						}),
				);
			},
		});

		if (this.plugin.settings.tocGlyphColor === 'custom') {
			items.push({
				name: translate('settings.glyph_color.custom_pick'),
				render: (setting: Setting) => {
					setting.addColorPicker((picker) =>
						picker
							.setValue(
								normalizeGlyphCustomColor(
									this.plugin.settings.tocGlyphCustomColor,
								),
							)
							.onChange((v) => setToc({ tocGlyphCustomColor: v })),
					);
				},
			});
		}
		items.push({
			name: translate('settings.toc_glyph_color_mode'),
			desc: translate('settings.toc_glyph_color_mode.desc'),
			render: (setting: Setting) => {
				setting.addDropdown((dropdown) =>
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
			},
		});

		items.push({
			name: translate('settings.toc_drill_sync'),
			desc: translate('settings.toc_drill_sync.desc'),
			render: (setting: Setting) => {
				setting.addToggle((t) =>
					t
						.setValue(this.plugin.settings.tocDrillSyncsSort === true)
						.onChange((v) => setToc({ tocDrillSyncsSort: v })),
				);
			},
		});

		items.push({
			name: translate('settings.toc_niagara_nodes'),
			desc: translate('settings.toc_niagara_nodes.desc'),
			render: (setting: Setting) => {
				setting.addToggle((t) =>
					t
						.setValue(this.plugin.settings.floatingTocNiagaraNodes === true)
						.onChange((v) => setToc({ floatingTocNiagaraNodes: v })),
				);
			},
		});

		return items;
	}
}
