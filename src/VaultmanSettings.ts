import { PluginSettingTab, Setting, type App } from 'obsidian';
import type { iVaultmanPlugin, Language } from './types/typeSettings';
import { translate, setLanguage } from './i18n/index';

export class VaultmanSettingsTab extends PluginSettingTab {
	private plugin: iVaultmanPlugin;

	constructor(app: App, plugin: iVaultmanPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName(translate('settings.language'))
			.setDesc(translate('settings.language.desc'))
			.addDropdown((dropdown) =>
				dropdown
					.addOptions({ auto: 'Auto', en: 'English', es: 'Español' })
					.setValue(this.plugin.settings.language)
					.onChange(async (value) => {
						this.plugin.settings.language = value as Language;
						setLanguage(value as Language);
						await this.plugin.saveSettings();
						this.display();
					}),
			);

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
			.setName(translate('settings.minimal_style'))
			.setDesc(translate('settings.minimal_style.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.minimalStyle)
					.onChange(async (value) => {
						this.plugin.settings.minimalStyle = value;
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

		new Setting(containerEl).setName(translate('settings.context_menu')).setHeading();

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

		new Setting(containerEl).setName(translate('settings.templates')).setHeading();

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
	}
}
