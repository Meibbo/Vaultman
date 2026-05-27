// src/utils/inputModal.ts
import { Modal, type App } from 'obsidian';

/**
 * Shows a simple text-input modal and resolves with the entered value,
 * or null if the user cancels. Replaces window.prompt() which is
 * flagged by no-alert ESLint rule.
 */
export function showInputModal(app: App, message: string): Promise<string | null> {
	return new Promise((resolve) => {
		let resolved = false;

		class PromptModal extends Modal {
			private inputEl!: HTMLInputElement;

			onOpen(): void {
				const { contentEl } = this;
				contentEl.addClass('vaultman-prompt-modal');
				contentEl.createEl('p', { cls: 'vaultman-prompt-message', text: message });
				this.inputEl = contentEl.createEl('input', {
					cls: 'vaultman-prompt-input',
					type: 'text',
				});
				const btnRow = contentEl.createDiv({ cls: 'vaultman-prompt-buttons' });
				const okBtn = btnRow.createEl('button', { cls: 'mod-cta', text: 'OK' });
				const cancelBtn = btnRow.createEl('button', { text: 'Cancel' });

				const submit = () => {
					if (resolved) return;
					resolved = true;
					resolve(this.inputEl.value.trim() || null);
					this.close();
				};
				const cancel = () => {
					if (resolved) return;
					resolved = true;
					resolve(null);
					this.close();
				};

				okBtn.addEventListener('click', submit);
				cancelBtn.addEventListener('click', cancel);
				this.inputEl.addEventListener('keydown', (e) => {
					if (e.key === 'Enter') submit();
					else if (e.key === 'Escape') cancel();
				});
				window.requestAnimationFrame(() => this.inputEl.focus());
			}

			onClose(): void {
				if (!resolved) { resolved = true; resolve(null); }
				this.contentEl.empty();
			}
		}

		new PromptModal(app).open();
	});
}
