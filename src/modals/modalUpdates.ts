import { Modal } from 'obsidian';
import { translate } from '../i18n/index';

const UPDATE_ITEMS = [
	'updates.clean_filters',
	'updates.floating_toc',
	'updates.files_explorer',
	'updates.addons',
] as const;

export class UpdatesModal extends Modal {
	constructor(
		app: import('obsidian').App,
		private readonly version: string,
	) {
		super(app);
	}

	onOpen(): void {
		this.modalEl.addClass('vaultman-updates-modal');
		this.titleEl.setText(translate('updates.title', { version: this.version }));
		this.contentEl.empty();
		this.contentEl.createEl('p', { text: translate('updates.intro') });
		const list = this.contentEl.createEl('ul');
		for (const key of UPDATE_ITEMS) {
			list.createEl('li', { text: translate(key) });
		}
		const closeButton = this.contentEl.createEl('button', {
			cls: 'mod-cta',
			text: translate('updates.close'),
		});
		closeButton.addEventListener('click', () => this.close());
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
