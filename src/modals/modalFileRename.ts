import { Modal, Setting, type App, type TFile } from 'obsidian';
import type { PendingChange } from '../types/typeOps';
import { RENAME_FILE } from '../types/typeOps';
import type { PropertyIndexService } from '../services/servicePropertyIndex';
import { PropertySuggest } from '../utils/autocomplete';
import { translate } from '../i18n/index';

type QueueCallback = (change: PendingChange) => void;

/**
 * File rename modal with pattern-based renaming.
 *
 * Supports placeholders:
 * - {property} — value of a frontmatter property
 * - {basename} — current file basename
 * - {date} — today's date (YYYY-MM-DD)
 * - {counter} — auto-incrementing counter
 *
 * Shows a live preview of old → new names before queuing.
 */
export class FileRenameModal extends Modal {
	private propertyIndex: PropertyIndexService;
	private targetFiles: TFile[];
	private onQueue: QueueCallback;

	private pattern = '{basename}';
	private previewEl: HTMLElement | null = null;

	constructor(
		app: App,
		propertyIndex: PropertyIndexService,
		targetFiles: TFile[],
		onQueue: QueueCallback
	) {
		super(app);
		this.propertyIndex = propertyIndex;
		this.targetFiles = targetFiles;
		this.onQueue = onQueue;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClasses(['vaultman-modal', 'vaultman-rename-modal']);

		contentEl.createEl('h3', { text: translate('rename.title') });
		contentEl.createEl('p', {
			cls: 'vaultman-modal-subtitle',
			text: `${this.targetFiles.length} ${translate('section.files').toLowerCase()}`,
		});

		// Pattern input with property autosuggest
		const patternSetting = new Setting(contentEl)
			.setName(translate('rename.pattern'))
			.setDesc(translate('rename.pattern_desc'));

		const patternInput = patternSetting.controlEl.createEl('input', {
			cls: 'vaultman-rename-pattern-input',
			attr: { type: 'text', value: this.pattern },
		});

		// Attach autosuggest for inserting property placeholders
		new PropertySuggest(
			this.app,
			patternInput,
			this.propertyIndex.getPropertyNames().map((p) => `{${p}}`),
			(value) => {
				// Insert at cursor position
				const pos = patternInput.selectionStart ?? patternInput.value.length;
				const before = patternInput.value.slice(0, pos);
				const after = patternInput.value.slice(pos);
				patternInput.value = before + value + after;
				this.pattern = patternInput.value;
				this.renderPreview();
			}
		);

		patternInput.addEventListener('input', () => {
			this.pattern = patternInput.value;
			this.renderPreview();
		});

		// Available placeholders reference
		const helpEl = contentEl.createDiv({ cls: 'vaultman-rename-help' });
		helpEl.createEl('small', {
			text: translate('rename.help'),
			cls: 'vaultman-text-faint',
		});

		// Preview
		this.previewEl = contentEl.createDiv({ cls: 'vaultman-rename-preview' });
		this.renderPreview();

		// Buttons
		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText(translate('prop.add_to_queue'))
					.setCta()
					.onClick(() => {
						this.queueRenames();
						this.close();
					})
			)
			.addButton((btn) =>
				btn.setButtonText('Cancel').onClick(() => this.close())
			);
	}

	private renderPreview(): void {
		if (!this.previewEl) return;
		this.previewEl.empty();

		const previews = this.computeRenames();
		const limit = Math.min(previews.length, 10);

		for (let i = 0; i < limit; i++) {
			const { oldName, newName } = previews[i];
			const row = this.previewEl.createDiv({ cls: 'vaultman-rename-row' });
			row.createSpan({ cls: 'vaultman-diff-deleted', text: oldName });
			row.createSpan({ text: ' → ' });
			row.createSpan({ cls: 'vaultman-diff-added', text: newName });
		}

		if (previews.length > limit) {
			this.previewEl.createDiv({
				cls: 'vaultman-text-faint',
				text: `... and ${previews.length - limit} more`,
			});
		}
	}

	private computeRenames(): { file: TFile; oldName: string; newName: string }[] {
		const today = new Date().toISOString().slice(0, 10);
		return this.targetFiles.map((file, index) => {
			const cache = this.app.metadataCache.getFileCache(file);
			const fm = (cache?.frontmatter ?? {}) as Record<string, unknown>;

			let newName = this.pattern;
			// natural wildcards aliases
			newName = newName.replace(/\{basename\}|\*/g, file.basename);
			newName = newName.replace(/\{date\}|\[fecha\]/ig, today);
			newName = newName.replace(/\{counter\}|\(1\)/ig, String(index + 1).padStart(3, '0'));

			// Replace {propertyName} with property values
			newName = newName.replace(/\{(\w[\w-]*)\}/g, (_match: string, prop: string) => {
				const val: unknown = fm[prop];
				if (val == null) return '';
				if (Array.isArray(val)) return val.map(String).join('-');
				if (typeof val === 'string') return val;
				if (typeof val === 'number' || typeof val === 'boolean' || typeof val === 'bigint') return String(val);
				if (typeof val === 'symbol') return val.description ?? val.toString();
				if (typeof val === 'function') return val.name;
				return JSON.stringify(val) ?? '';
			});

			// Sanitize filename
			newName = newName.replace(/[<>:"/\\|?*]/g, '-').trim();

			return { file, oldName: file.name, newName: newName + '.md' };
		});
	}

	private queueRenames(): void {
		const renames = this.computeRenames();

		for (const { file, newName } of renames) {
			if (newName === file.name) continue;

			const change: PendingChange = {
				type: 'file_rename',
				action: 'rename',
				details: `${file.name} → ${newName}`,
				files: [file],
				logicFunc: () => ({ [RENAME_FILE]: newName }),
				customLogic: true,
			};
			this.onQueue(change);
		}
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
