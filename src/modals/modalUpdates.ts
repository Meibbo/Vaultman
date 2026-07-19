import { Modal, Notice } from 'obsidian';
import { translate } from '../i18n/index';
import {
	openUpdatesBulletin,
	updatesUrlForVersion,
} from '../logic/logicUpdateNotice';

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

		const actions = this.contentEl.createDiv({
			cls: 'modal-button-container',
		});
		const bulletinButton = actions.createEl('button', {
			cls: 'mod-cta',
			text: translate('updates.view_bulletin'),
		});
		bulletinButton.addEventListener('click', () => {
			try {
				openUpdatesBulletin(this.version);
			} catch {
				new Notice(translate('updates.open_failed'));
			}
		});

		const copyButton = actions.createEl('button', {
			text: translate('updates.copy_url'),
		});
		copyButton.addEventListener('click', () => {
			void this.copyBulletinUrl();
		});

		const closeButton = this.contentEl.createEl('button', {
			text: translate('updates.close'),
		});
		closeButton.addEventListener('click', () => this.close());
	}

	private async copyBulletinUrl(): Promise<void> {
		try {
			await activeWindow.navigator.clipboard.writeText(
				updatesUrlForVersion(this.version),
			);
			new Notice(translate('updates.url_copied'));
		} catch {
			new Notice(translate('updates.copy_failed'));
		}
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
