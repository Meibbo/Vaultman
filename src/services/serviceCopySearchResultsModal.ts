import { Modal, Setting, type App, type TFile } from 'obsidian';

import { translate } from '../i18n/index';
import {
	DEFAULT_COPY_RESULTS_OPTIONS,
	formatCopiedSearchResults,
	type CopyLinkStyle,
	type CopyListStyle,
	type CopyResultsOptions,
} from '../logic/logicCopySearchResults';

/**
 * U121-019 #51 — core's "Copy search results" modal, rebuilt over public API.
 *
 * Core's own modal is `new CopySearchResultsModal(app, view.dom)`: it reads the
 * search view's result DOM. Reached from here it copied an empty list, because
 * our scan stops core's search once it has what it needs, and it could never
 * have respected our scope anyway. The controls, the class names and the text
 * format are core's; the results are ours.
 */
export class CopySearchResultsModal extends Modal {
	private options: CopyResultsOptions = { ...DEFAULT_COPY_RESULTS_OPTIONS };
	private textarea: HTMLTextAreaElement | null = null;

	constructor(
		app: App,
		private readonly files: TFile[],
		private readonly initial?: Partial<CopyResultsOptions>,
	) {
		super(app);
		this.options = { ...this.options, ...this.initial };
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		this.titleEl.setText(translate('content.copy_results'));

		// Core's own container class, so a theme styling core's modal styles ours.
		const container = contentEl.createDiv('copy-search-result-container');
		this.textarea = container.createEl('textarea', {
			cls: 'copy-search-result-textarea',
		});
		this.textarea.readOnly = true;

		new Setting(contentEl)
			.setName(translate('content.copy_option_show_path'))
			.addToggle((toggle) =>
				toggle.setValue(this.options.showFullPath).onChange((value) => {
					this.options.showFullPath = value;
					this.refresh();
				}),
			);

		new Setting(contentEl)
			.setName(translate('content.copy_option_link_style'))
			.addDropdown((dropdown) =>
				dropdown
					.addOption('none', translate('content.copy_link_none'))
					.addOption('wikilink', translate('content.copy_link_wikilink'))
					.addOption('markdown', translate('content.copy_link_markdown'))
					.setValue(this.options.linkStyle)
					.onChange((value) => {
						this.options.linkStyle = value as CopyLinkStyle;
						this.refresh();
					}),
			);

		new Setting(contentEl)
			.setName(translate('content.copy_option_list_style'))
			.addDropdown((dropdown) =>
				dropdown
					.addOption('none', translate('content.copy_list_none'))
					.addOption('dash', '-')
					.addOption('asterisk', '*')
					.addOption('number', '1.')
					.setValue(this.options.listStyle)
					.onChange((value) => {
						this.options.listStyle = value as CopyListStyle;
						this.refresh();
					}),
			);

		new Setting(contentEl).addButton((button) =>
			button
				.setCta()
				.setButtonText(translate('content.copy_results_action'))
				.onClick(() => {
					void navigator.clipboard.writeText(this.currentText());
					this.close();
				}),
		);

		this.refresh();
	}

	onClose(): void {
		this.contentEl.empty();
		this.textarea = null;
	}

	private currentText(): string {
		return formatCopiedSearchResults(this.files, this.options);
	}

	private refresh(): void {
		if (!this.textarea) return;
		this.textarea.value = this.currentText();
		this.textarea.select();
	}
}
