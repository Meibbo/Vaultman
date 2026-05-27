import { Modal, Setting, type App, type TFile } from 'obsidian';
import type { PendingChange } from '../types/typeOps';
import { MOVE_FILE } from '../types/typeOps';
import { FolderSuggest } from '../utils/autocomplete';
import { translate } from '../i18n/index';

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
		contentEl.addClasses(['vaultman-modal', 'vaultman-move-modal']);

		contentEl.createEl('h3', { text: translate('move.title') });
		contentEl.createEl('p', {
			cls: 'vaultman-modal-subtitle',
			text: `${this.targetFiles.length} ${translate('section.files').toLowerCase()}`,
		});

		// Folder input with FolderSuggest autocomplete
		const folderSetting = new Setting(contentEl)
			.setName(translate('move.target_folder'))
			.setDesc(translate('move.root_hint'));

		const folderInput = folderSetting.controlEl.createEl('input', {
			cls: 'vaultman-rename-pattern-input',
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
		this.previewEl = contentEl.createDiv({ cls: 'vaultman-rename-preview' });
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
					})
			)
			.addButton((btn) =>
				btn.setButtonText('Cancel').onClick(() => this.close())
			);
	}

	private renderPreview(): void {
		if (!this.previewEl) return;
		this.previewEl.empty();

		const limit = Math.min(this.targetFiles.length, 10);
		for (let i = 0; i < limit; i++) {
			const file = this.targetFiles[i];
			const newPath = this.targetFolder
				? `${this.targetFolder}/${file.name}`
				: file.name;

			const row = this.previewEl.createDiv({ cls: 'vaultman-rename-row' });
			row.createSpan({ cls: 'vaultman-diff-deleted', text: file.path });
			row.createSpan({ text: ' → ' });
			row.createSpan({ cls: 'vaultman-diff-added', text: newPath });
		}

		if (this.targetFiles.length > limit) {
			this.previewEl.createDiv({
				cls: 'vaultman-text-faint',
				text: `... and ${this.targetFiles.length - limit} more`,
			});
		}
	}

	private queueMoves(): void {
		const targetFolder = this.targetFolder;
		for (const file of this.targetFiles) {
			const newPath = targetFolder ? `${targetFolder}/${file.name}` : file.name;
			if (newPath === file.path) continue;

			const change: PendingChange = {
				type: 'file_move',
				action: 'move',
				details: `${file.path} → ${newPath}`,
				files: [file],
				logicFunc: () => ({ [MOVE_FILE]: targetFolder }),
				customLogic: true,
			};
			this.onQueue(change);
		}
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
