import { App, Modal } from 'obsidian';
import { translate } from '../i18n/index';

export class ConfirmModal extends Modal {
	private readonly title: string;
	private readonly message: string;
	private readonly ctaLabel: string;
	private readonly warningLabel: string | undefined;
	private readonly onConfirm: () => void | Promise<void>;


	constructor(
		app: App,
		options: {
			title: string;
			message: string;
			ctaLabel?: string;
			warningLabel?: string;
			onConfirm: () => void | Promise<void>;
		},
	) {
		super(app);
		this.title = options.title;
		this.message = options.message;
		this.ctaLabel = options.ctaLabel ?? translate('queue.apply');
		this.warningLabel = options.warningLabel;
		this.onConfirm = options.onConfirm;
	}

	onOpen(): void {
		const { contentEl } = this;
		this.modalEl.addClass('mod-confirmation');

		contentEl.createEl('h2', { text: this.title, cls: 'dialog-title' });
		
		const messageEl = contentEl.createDiv({ cls: 'dialog-text' });
		messageEl.setText(this.message);

		if (this.warningLabel) {
			const warningEl = contentEl.createDiv({ cls: 'dialog-warning' });
			warningEl.setText(this.warningLabel);
		}

		const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });

		const btnCancel = buttonContainer.createEl('button', { text: translate('updates.dismiss') }); // TODO: proper translate
		btnCancel.addEventListener('click', () => {
			this.close();
		});

		const btnConfirm = buttonContainer.createEl('button', {
			text: this.ctaLabel,
			cls: 'mod-warning',
		});
		btnConfirm.addEventListener('click', () => {
			void this.onConfirm();
			this.close();
		});
	}
}
