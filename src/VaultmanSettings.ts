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

		// Language
		new Setting(containerEl)
			.setName(translate('settings.language'))
			.setDesc(translate('settings.language.desc'))
			.addDropdown((dd) =>
				dd
					.addOptions({ auto: 'Auto', en: 'English', es: 'Español' })
					.setValue(this.plugin.settings.language)
					.onChange(async (v) => {
						this.plugin.settings.language = v as Language;
						setLanguage(v as Language);
						await this.plugin.saveSettings();
						this.display(); // Refresh labels
					})
			);

		// Default property type
		new Setting(containerEl)
			.setName(translate('settings.default_type'))
			.setDesc(translate('settings.default_type.desc'))
			.addDropdown((dd) =>
				dd
					.addOptions({
						text: translate('prop.type.text'),
						number: translate('prop.type.number'),
						checkbox: translate('prop.type.checkbox'),
						list: translate('prop.type.list'),
						date: translate('prop.type.date'),
					})
					.setValue(this.plugin.settings.defaultPropertyType)
					.onChange(async (v) => {
						this.plugin.settings.defaultPropertyType = v;
						await this.plugin.saveSettings();
					})
			);

		// Explorer settings
		new Setting(containerEl).setName("").setHeading();

		new Setting(containerEl)
			.setName(translate('settings.ctrl_click_search'))
			.setDesc(translate('settings.ctrl_click_search.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.explorerCtrlClickSearch)
					.onChange(async (v) => {
						this.plugin.settings.explorerCtrlClickSearch = v;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName(translate('settings.queue_preview'))
			.setDesc(translate('settings.queue_preview.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.explorerShowQueuePreview)
					.onChange(async (v) => {
						this.plugin.settings.explorerShowQueuePreview = v;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName(translate('settings.content_search'))
			.setDesc(translate('settings.content_search.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.explorerContentSearch)
					.onChange(async (v) => {
						this.plugin.settings.explorerContentSearch = v;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName(translate('settings.operation_scope'))
			.setDesc(translate('settings.operation_scope.desc'))
			.addDropdown((dd) =>
				dd
					.addOptions({
						auto: translate('settings.scope.auto'),
						selected: translate('settings.scope.selected'),
						filtered: translate('settings.scope.filtered'),
						all: translate('settings.scope.all'),
					})
					.setValue(this.plugin.settings.explorerOperationScope)
					.onChange(async (v) => {
						this.plugin.settings.explorerOperationScope = v as 'auto' | 'selected' | 'filtered' | 'all';
						await this.plugin.saveSettings();
					})
			);

		// View section
		new Setting(containerEl).setName(translate('settings.view_section')).setHeading();

		new Setting(containerEl)
			.setName(translate('settings.open_mode'))
			.setDesc(translate('settings.open_mode.desc'))
			.addDropdown((dd) =>
				dd
					.addOptions({
						sidebar: translate('settings.open_mode.sidebar'),
						main: translate('settings.open_mode.main'),
						both: translate('settings.open_mode.both'),
					})
					.setValue(this.plugin.settings.openMode)
					.onChange(async (v) => {
						this.plugin.settings.openMode = v as 'sidebar' | 'main' | 'both';
						await this.plugin.saveSettings();
					})
			);

		// Layout section
		new Setting(containerEl).setName("").setHeading();

		new Setting(containerEl)
			.setName(translate('settings.ops_position'))
			.setDesc(translate('settings.ops_position.desc'))
			.addDropdown((dd) =>
				dd
					.addOptions({
						right: translate('settings.ops_position.right'),
						bottom: translate('settings.ops_position.bottom'),
						replace: translate('settings.ops_position.replace'),
					})
					.setValue(this.plugin.settings.operationsPanelPosition)
					.onChange(async (v) => {
						this.plugin.settings.operationsPanelPosition = v as 'right' | 'bottom' | 'replace';
						await this.plugin.saveSettings();
					})
			);

		// Appearance section
		new Setting(containerEl).setName('Appearance').setHeading();

		new Setting(containerEl)
			.setName('Background blur intensity')
			.setDesc('Controls the glassmorphism blur on the bottom bar and popups (0 = no blur, 100 = maximum).')
			.addSlider(slider =>
				slider
					.setLimits(0, 100, 1)
					.setValue(this.plugin.settings.glassBlurIntensity ?? 60)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.glassBlurIntensity = value;
						await this.plugin.saveSettings();
						this.plugin.updateGlassBlur();
					})
			);

		new Setting(containerEl)
			.setName('Open mode')
			.setDesc('How to open a .base file when none is active: reopen last used, or show a picker.')
			.addDropdown((dd) =>
				dd
					.addOptions({
						'last-used': 'Reopen last used',
						picker: 'Always show picker',
					})
					.setValue(this.plugin.settings.basesOpenMode)
					.onChange(async (v) => {
						this.plugin.settings.basesOpenMode = v as 'last-used' | 'picker';
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Operations panel side')
			.setDesc('Which side the operations panel opens on when attaching to a .base file.')
			.addDropdown((dd) =>
				dd
					.addOptions({ left: 'Left', right: 'Right' })
					.setValue(this.plugin.settings.basesOpsPanelSide)
					.onChange(async (v) => {
						this.plugin.settings.basesOpsPanelSide = v as 'left' | 'right';
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Properties explorer side')
			.setDesc('Which side the property explorer panel opens on.')
			.addDropdown((dd) =>
				dd
					.addOptions({ left: 'Left', right: 'Right' })
					.setValue(this.plugin.settings.basesExplorerSide)
					.onChange(async (v) => {
						this.plugin.settings.basesExplorerSide = v as 'left' | 'right';
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Auto-attach to .base files')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.basesAutoAttach)
					.onChange(async (v) => {
						this.plugin.settings.basesAutoAttach = v;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Inject checkbox column')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.basesInjectCheckboxes)
					.onChange(async (v) => {
						this.plugin.settings.basesInjectCheckboxes = v;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Show column separators')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.basesShowColumnSeparators)
					.onChange(async (v) => {
						this.plugin.settings.basesShowColumnSeparators = v;
						await this.plugin.saveSettings();
						activeDocument.body.toggleClass('vaultman-bases-column-separators', v);
					})
			);

		// Layout section
		new Setting(containerEl).setName(translate('settings.layout.title')).setHeading();

		new Setting(containerEl)
			.setName(translate('settings.layout.separate_panes'))
			.setDesc(translate('settings.layout.separate_panes.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.separatePanes)
					.onChange(async (v) => {
						this.plugin.settings.separatePanes = v;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName(translate('settings.filters_show_tab_labels'))
			.setDesc(translate('settings.filters_show_tab_labels.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.filtersShowTabLabels)
					.onChange(async (v) => {
						this.plugin.settings.filtersShowTabLabels = v;
						await this.plugin.saveSettings();
					})
			);

		// Filter templates section
		new Setting(containerEl).setName("").setHeading();

		if (this.plugin.settings.filterTemplates.length === 0) {
			containerEl.createEl('p', {
				text: translate('settings.templates.desc'),
				cls: 'setting-item-description',
			});
		} else {
			for (const tmpl of this.plugin.settings.filterTemplates) {
				new Setting(containerEl)
					.setName(tmpl.name)
					.setDesc(`${tmpl.root.children.length} filters`)
					.addButton((btn) =>
						btn
							.setButtonText(translate('filter.template.delete'))
							.setWarning()
							.onClick(async () => {
								this.plugin.settings.filterTemplates =
									this.plugin.settings.filterTemplates.filter(
										(t) => t.name !== tmpl.name
									);
								await this.plugin.saveSettings();
								this.display();
							})
					);
			}
		}
	}

}
