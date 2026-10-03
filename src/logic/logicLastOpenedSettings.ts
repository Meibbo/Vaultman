import {
	Notice,
	type Setting,
	type SettingGroupItem,
} from 'obsidian';
import { translate } from '../i18n/index';
import { ConfirmModal } from '../modals/modalConfirm';
import type { iVaultmanPlugin } from '../types/typeSettings';

export function getLastOpenedCaptureSetting(
	plugin: iVaultmanPlugin,
): SettingGroupItem {
	return {
		name: translate('settings.record_all_file_opens'),
		desc: translate('settings.record_all_file_opens.desc'),
		render: (setting: Setting) => {
			setting.addToggle((toggle) =>
				toggle
					.setValue(plugin.settings.recordAllFileOpens === true)
					.onChange(async (value) => {
						plugin.settings.recordAllFileOpens = value;
						plugin.lastOpenedService?.setRecordAllOpens(value);
						await plugin.saveSettings();
					}),
			);
		},
	};
}

export function getLastOpenedClearSetting(
	plugin: iVaultmanPlugin,
): SettingGroupItem {
	return {
		name: translate('settings.opened_history.clear'),
		desc: translate('settings.opened_history.clear.desc'),
		render: (setting: Setting) => {
			setting.addButton((button) =>
				button
					.setWarning()
					.setButtonText(translate('settings.opened_history.clear.button'))
					.onClick(() => {
						new ConfirmModal(plugin.app, {
							title: translate('settings.opened_history.clear.confirm_title'),
							message: translate('settings.opened_history.clear.confirm_message'),
							ctaLabel: translate('settings.opened_history.clear.button'),
							onConfirm: async () => {
								const service = plugin.lastOpenedService;
								if (!service) {
									new Notice(
										translate('settings.opened_history.clear.failed', {
											reason: translate(
												'settings.opened_history.clear.unavailable',
											),
										}),
									);
									return;
								}

								try {
									await service.clearHistory();
									new Notice(translate('settings.opened_history.clear.done'));
								} catch (error: unknown) {
									const reason =
										error instanceof Error && error.message
											? error.message
											: translate('settings.opened_history.clear.unknown_error');
									new Notice(
										translate('settings.opened_history.clear.failed', { reason }),
									);
								}
							},
						}).open();
					}),
			);
		},
	};
}
