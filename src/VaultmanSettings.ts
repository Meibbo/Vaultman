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
			return;
		}

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
}
