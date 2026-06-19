import { Modal, Notice, Setting, type App, type TFile } from 'obsidian';
import type { PendingChange } from '../types/typeOps';
import { RENAME_FILE } from '../types/typeOps';
import type { PropertyIndexService } from '../services/servicePropertyIndex';
import { PropertySuggest } from '../utils/autocomplete';
import { translate } from '../i18n/index';

type QueueCallback = (change: PendingChange) => void;

export type RenameTargetFile = Pick<TFile, 'name' | 'basename' | 'extension'>;
export type FileRenameValidationIssue =
	| { code: 'missing_property'; property: string }
	| { code: 'non_text_property'; property: string }
	| { code: 'invalid_pattern'; token: string };

export interface FileRenameTargetResult {
	newName: string;
	issues: FileRenameValidationIssue[];
}

interface FileRenamePreview extends FileRenameTargetResult {
	file: TFile;
	oldName: string;
}

export function formatFileRenameTarget(
	file: RenameTargetFile,
	pattern: string,
	frontmatter: Record<string, unknown>,
	index: number,
	today = new Date().toISOString().slice(0, 10),
): FileRenameTargetResult {
	const issues: FileRenameValidationIssue[] = collectInvalidPatternTokens(
		pattern,
	).map((token) => ({ code: 'invalid_pattern', token }));
	let newName = pattern;

	newName = newName.replace(/\{basename\}|\*/g, file.basename);
	newName = newName.replace(/\{date\}|\[fecha\]/gi, today);
	newName = newName.replace(
		/\{counter\}|\(1\)/gi,
		String(index + 1).padStart(3, '0'),
	);

	newName = newName.replace(/\{(\w[\w-]*)\}/g, (_match: string, prop: string) =>
		resolveTextFrontmatterProperty(frontmatter, prop, issues),
	);

	let sanitizedName = newName.replace(/[<>:"/\\|?*]/g, '-').trim();
	if (!sanitizedName) {
		sanitizedName = file.basename;
		if (issues.length === 0) {
			issues.push({ code: 'invalid_pattern', token: pattern });
		}
	}

	if (!patternHasExplicitExtension(pattern)) {
		const extension = file.extension.replace(/^\./, '');
		if (extension) sanitizedName = `${sanitizedName}.${extension}`;
	}

	return { newName: sanitizedName, issues };
}

export function formatFileRenameTargetName(
	file: RenameTargetFile,
	pattern: string,
	frontmatter: Record<string, unknown>,
	index: number,
	today = new Date().toISOString().slice(0, 10),
): string {
	return formatFileRenameTarget(file, pattern, frontmatter, index, today).newName;
}

function resolveTextFrontmatterProperty(
	frontmatter: Record<string, unknown>,
	prop: string,
	issues: FileRenameValidationIssue[],
): string {
	const value = frontmatter[prop];
	if (value == null || (typeof value === 'string' && value.trim() === '')) {
		issues.push({ code: 'missing_property', property: prop });
		return '';
	}
	if (typeof value !== 'string') {
		issues.push({ code: 'non_text_property', property: prop });
		return '';
	}
	return value;
}

function collectInvalidPatternTokens(pattern: string): string[] {
	const unmatched = pattern
		.replace(/\{basename\}|\*/g, '')
		.replace(/\{date\}|\[fecha\]/gi, '')
		.replace(/\{counter\}|\(1\)/gi, '')
		.replace(/\{(\w[\w-]*)\}/g, '');

	return (unmatched.match(/\{[^{}]*\}?|[^{}\s]*\}/g) ?? [])
		.map((token) => token.trim())
		.filter(Boolean);
}

function patternHasExplicitExtension(pattern: string): boolean {
	const sanitized = pattern.replace(/[<>:"/\\|?*]/g, '-').trim();
	return /\.[A-Za-z0-9][A-Za-z0-9_-]{0,31}$/.test(sanitized);
}

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

	private computeRenames(): FileRenamePreview[] {
		const today = new Date().toISOString().slice(0, 10);
		return this.targetFiles.map((file, index) => {
			const cache = this.app.metadataCache.getFileCache(file);
			const fm = (cache?.frontmatter ?? {}) as Record<string, unknown>;
			const result = formatFileRenameTarget(
				file,
				this.pattern,
				fm,
				index,
				today,
			);

			return {
				file,
				oldName: file.name,
				newName: result.newName,
				issues: result.issues,
			};
		});
	}

	private queueRenames(): void {
		const renames = this.computeRenames();
		const blockedRenames = renames.filter(({ issues }) => issues.length > 0);

		if (blockedRenames.length > 0) {
			new Notice(translate('rename.pattern_warning')
				.replace('{count}', String(blockedRenames.length))
				.replace('{reason}', this.formatRenameIssue(blockedRenames[0].issues[0])));
			return;
		}

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

	private formatRenameIssue(issue: FileRenameValidationIssue): string {
		if (issue.code === 'missing_property') {
			return translate('rename.issue.missing_property').replace(
				'{property}',
				issue.property,
			);
		}
		if (issue.code === 'non_text_property') {
			return translate('rename.issue.non_text_property').replace(
				'{property}',
				issue.property,
			);
		}
		return translate('rename.issue.invalid_pattern').replace(
			'{token}',
			issue.token,
		);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
