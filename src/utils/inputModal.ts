// src/utils/inputModal.ts
import { Modal, Setting, type App } from 'obsidian';
import { translate } from '../i18n/index';

export interface PromptModalOptions {
	placeholder?: string;
	initialValue?: string;
	confirmText?: string;
	cancelText?: string;
}

/**
 * U130-GGC-012: Responsive text-input modal replacing window.prompt() and
 * the legacy unstyled rectangular modal.
 * Uses Obsidian's standard Setting and Modal layout with proper mobile/desktop responsiveness.
 */
export class ResponsivePromptModal extends Modal {
	private message: string;
	private options: PromptModalOptions;
	private value: string;
	private resolvePromise: (value: string | null) => void = () => undefined;
	private inputEl: HTMLInputElement | null = null;

	constructor(app: App, message: string, options: PromptModalOptions = {}) {
		super(app);
		this.message = message;
		this.options = options;
		this.value = options.initialValue ?? '';
	}

	wait(): Promise<string | null> {
		return new Promise((resolve) => {
			this.resolvePromise = resolve;
		});
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('vaultman-modal');
		contentEl.addClass('vaultman-prompt-modal');

		contentEl.createEl('h3', { text: this.message });

		new Setting(contentEl)
			.addText((text) => {
				text
					.setPlaceholder(this.options.placeholder ?? '')
					.setValue(this.value)
					.onChange((v) => {
						this.value = v;
					});
				const el = (text as unknown as { inputEl?: HTMLInputElement }).inputEl;
				if (el) {
					this.inputEl = el;
					el.addEventListener('keydown', (e: KeyboardEvent) => {
						if (e.key === 'Enter') {
							e.preventDefault();
							this.submit();
						} else if (e.key === 'Escape') {
							e.preventDefault();
							this.close();
						}
					});
				}
			});

		new Setting(contentEl)
			.addButton((btn) => {
				btn
					.setButtonText(this.options.confirmText ?? 'OK')
					.setCta()
					.onClick(() => this.submit());
			})
			.addButton((btn) => {
				btn
					.setButtonText(this.options.cancelText ?? translate('group.row.cancel') ?? 'Cancel')
					.onClick(() => this.close());
			});

		if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
			window.requestAnimationFrame(() => {
				if (this.inputEl) {
					this.inputEl.focus();
					this.inputEl.select();
				}
			});
		}
	}

	private submit(): void {
		const trimmed = this.value.trim();
		this.resolvePromise(trimmed || null);
		this.close();
	}

	onClose(): void {
		super.onClose();
		this.resolvePromise(null);
		this.contentEl.empty();
	}
}

/**
 * Shows a responsive text-input modal and resolves with the entered value,
 * or null if the user cancels. Replaces the legacy unstyled prompt modal.
 */
export function showInputModal(
	app: App,
	message: string,
	options: PromptModalOptions = {},
): Promise<string | null> {
	const modal = new ResponsivePromptModal(app, message, options);
	modal.open();
	return modal.wait();
}
