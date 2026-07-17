import { Modal, Setting, type App, type TFile } from 'obsidian';
import type { PendingChange } from '../types/typeOps';
import { FolderSuggest } from '../utils/autocomplete';
import { translate } from '../index/i18n/lang';
import { buildFileMoveChange } from '../services/serviceFileQueue';

type QueueCallback = (change: PendingChange) => void;

/**
 * Move files to a target folder.
 * Shows a folder picker with autocomplete and a live preview of old → new paths.
 */
export class FileMoveModal extends Modal {
	private targetFiles: TFile[];
	private onQueue: QueueCallback;
	private targetFolder = '';
	private previewEl: HTMLElement | null = null;

	constructor(app: App, targetFiles: TFile[], onQueue: QueueCallback) {
		super(app);
		this.targetFiles = targetFiles;
		this.onQueue = onQueue;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClasses(['vm-modal', 'vm-move-modal']);

		contentEl.createEl('h3', { text: translate('move.title') });
		contentEl.createEl('p', {
			cls: 'vm-modal-subtitle',
			text: `${this.targetFiles.length} ${translate('section.files').toLowerCase()}`,
		});

		// Folder input with FolderSuggest autocomplete
		const folderSetting = new Setting(contentEl)
			.setName(translate('move.target_folder'))
			.setDesc(translate('move.root_hint'));

		const folderInput = folderSetting.controlEl.createEl('input', {
			cls: 'vm-rename-pattern-input',
			attr: { type: 'text', placeholder: translate('move.target_folder_placeholder') },
		});

		new FolderSuggest(this.app, folderInput, (path: string) => {
			folderInput.value = path;
			this.targetFolder = path;
			this.renderPreview();
		});

		folderInput.addEventListener('input', () => {
			this.targetFolder = folderInput.value.trim();
			this.renderPreview();
		});

		// Preview
		this.previewEl = contentEl.createDiv({ cls: 'vm-rename-preview' });
		this.renderPreview();

		// Buttons
		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText(translate('prop.add_to_queue'))
					.setCta()
					.onClick(() => {
						this.queueMoves();
						this.close();
					}),
			)
			.addButton((btn) => btn.setButtonText('Cancel').onClick(() => this.close()));
	}

	private renderPreview(): void {
		if (!this.previewEl) return;
		this.previewEl.empty();

		const limit = Math.min(this.targetFiles.length, 10);
		for (let i = 0; i < limit; i++) {
			const file = this.targetFiles[i];
			const newPath = this.targetFolder ? `${this.targetFolder}/${file.name}` : file.name;

			const row = this.previewEl.createDiv({ cls: 'vm-rename-row' });
			row.createSpan({ cls: 'vm-diff-deleted', text: file.path });
			row.createSpan({ text: ' → ' });
			row.createSpan({ cls: 'vm-diff-added', text: newPath });
		}

		if (this.targetFiles.length > limit) {
			this.previewEl.createDiv({
				cls: 'vm-text-faint',
				text: `... and ${this.targetFiles.length - limit} more`,
			});
		}
	}

	private queueMoves(): void {
		const targetFolder = this.targetFolder;
		for (const file of this.targetFiles) {
			const change = buildFileMoveChange(file, targetFolder);
			if (change) this.onQueue(change);
		}
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
