import { App, Modal, Notice } from 'obsidian';
import type { FilterTemplate } from '../types/typeFilter';
import type { QueueTemplate } from '../types/typeOps';
import type { SavedLayout } from '../types/typeSettings';
import { translate } from '../i18n/index';

export const SETTINGS_DATA_EXPORT_KIND = 'vaultman-settings-data';
export const SETTINGS_DATA_EXPORT_VERSION = 1;

export interface SettingsDataPayload {
	filterTemplates?: FilterTemplate[];
	queueTemplates?: QueueTemplate[];
	savedLayouts?: SavedLayout[];
}

interface SettingsDataExport extends SettingsDataPayload {
	kind: typeof SETTINGS_DATA_EXPORT_KIND;
	version: number;
	exportedAt: string;
}

export function buildSettingsDataExport(
	payload: SettingsDataPayload,
): SettingsDataExport {
	return {
		kind: SETTINGS_DATA_EXPORT_KIND,
		version: SETTINGS_DATA_EXPORT_VERSION,
		exportedAt: new Date().toISOString(),
		filterTemplates: payload.filterTemplates ?? [],
		queueTemplates: payload.queueTemplates ?? [],
		savedLayouts: payload.savedLayouts ?? [],
	};
}

/**
 * Only pulls fields the pasted JSON actually has — a partial export (say,
 * just filters) must not silently blank the other two on import.
 */
export function parseSettingsDataImport(raw: string): SettingsDataPayload {
	let data: unknown;
	try {
		data = JSON.parse(raw);
	} catch {
		throw new Error(translate('settings.data_transfer.import.invalid_json'));
	}
	if (typeof data !== 'object' || data === null) {
		throw new Error(translate('settings.data_transfer.import.invalid_shape'));
	}
	const obj = data as Record<string, unknown>;
	const result: SettingsDataPayload = {};
	if (Array.isArray(obj.filterTemplates)) {
		result.filterTemplates = obj.filterTemplates as FilterTemplate[];
	}
	if (Array.isArray(obj.queueTemplates)) {
		result.queueTemplates = obj.queueTemplates as QueueTemplate[];
	}
	if (Array.isArray(obj.savedLayouts)) {
		result.savedLayouts = obj.savedLayouts as SavedLayout[];
	}
	if (
		result.filterTemplates === undefined &&
		result.queueTemplates === undefined &&
		result.savedLayouts === undefined
	) {
		throw new Error(translate('settings.data_transfer.import.no_known_keys'));
	}
	return result;
}

export class ExportSettingsDataModal extends Modal {
	private readonly json: string;

	constructor(app: App, payload: SettingsDataPayload) {
		super(app);
		this.json = JSON.stringify(buildSettingsDataExport(payload), null, 2);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.addClass('vaultman-data-transfer-modal');
		contentEl.createEl('h2', {
			text: translate('settings.data_transfer.export.title'),
		});
		contentEl.createEl('p', {
			cls: 'setting-item-description',
			text: translate('settings.data_transfer.export.desc'),
		});

		const textarea = contentEl.createEl('textarea', {
			cls: 'vaultman-data-transfer-textarea',
		});
		textarea.readOnly = true;
		textarea.value = this.json;
		textarea.rows = 16;

		const buttonRow = contentEl.createDiv({ cls: 'modal-button-container' });
		const copyBtn = buttonRow.createEl('button', {
			cls: 'mod-cta',
			text: translate('settings.data_transfer.export.copy'),
		});
		copyBtn.addEventListener('click', () => {
			void (async () => {
				try {
					await activeWindow.navigator.clipboard.writeText(this.json);
					new Notice(translate('settings.data_transfer.export.copied'));
				} catch {
					textarea.select();
					new Notice(
						translate('settings.data_transfer.export.copy_failed'),
					);
				}
			})();
		});
		const closeBtn = buttonRow.createEl('button', {
			text: translate('updates.close'),
		});
		closeBtn.addEventListener('click', () => this.close());

		window.requestAnimationFrame(() => textarea.select());
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

export class ImportSettingsDataModal extends Modal {
	private readonly onImport: (payload: SettingsDataPayload) => void | Promise<void>;

	constructor(
		app: App,
		onImport: (payload: SettingsDataPayload) => void | Promise<void>,
	) {
		super(app);
		this.onImport = onImport;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.addClass('vaultman-data-transfer-modal');
		contentEl.createEl('h2', {
			text: translate('settings.data_transfer.import.title'),
		});
		contentEl.createEl('p', {
			cls: 'setting-item-description',
			text: translate('settings.data_transfer.import.desc'),
		});

		const textarea = contentEl.createEl('textarea', {
			cls: 'vaultman-data-transfer-textarea',
		});
		textarea.rows = 16;
		textarea.placeholder = translate(
			'settings.data_transfer.import.placeholder',
		);

		const errorEl = contentEl.createDiv({ cls: 'dialog-warning' });
		errorEl.hide();

		const buttonRow = contentEl.createDiv({ cls: 'modal-button-container' });
		const importBtn = buttonRow.createEl('button', {
			cls: 'mod-warning',
			text: translate('settings.data_transfer.import.apply'),
		});
		importBtn.addEventListener('click', () => {
			void (async () => {
				errorEl.hide();
				let payload: SettingsDataPayload;
				try {
					payload = parseSettingsDataImport(textarea.value);
				} catch (error) {
					errorEl.setText(
						error instanceof Error
							? error.message
							: translate('settings.data_transfer.import.invalid_json'),
					);
					errorEl.show();
					return;
				}
				await this.onImport(payload);
				this.close();
			})();
		});
		const cancelBtn = buttonRow.createEl('button', {
			text: translate('updates.dismiss'),
		});
		cancelBtn.addEventListener('click', () => this.close());

		window.requestAnimationFrame(() => textarea.focus());
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
