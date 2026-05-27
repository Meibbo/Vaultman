import type { PendingChange } from '../types/typeOps';
import { translate } from '../i18n/index';

export interface QueueListCallbacks {
	onRemove: (index: number) => void;
	selectable?: boolean;
}

/**
 * Renders the operation queue as a list.
 * When selectable=true, items get checkboxes for batch operations.
 */
export class QueueListComponent {
	private containerEl: HTMLElement;
	private callbacks: QueueListCallbacks;
	private selectedIndices = new Set<number>();

	constructor(containerEl: HTMLElement, callbacks: QueueListCallbacks) {
		this.containerEl = containerEl;
		this.callbacks = callbacks;
	}

	render(queue: PendingChange[]): void {
		this.containerEl.empty();
		this.selectedIndices.clear();

		if (queue.length === 0) {
			this.containerEl.createDiv({
				cls: 'vaultman-queue-empty',
				text: translate('ops.queue.empty'),
			});
			return;
		}

		const headerEl = this.containerEl.createDiv({ cls: 'vaultman-queue-header' });
		headerEl.createSpan({
			text: translate('ops.queue', { count: queue.length }),
			cls: 'vaultman-queue-title',
		});

		const listEl = this.containerEl.createDiv({ cls: 'vaultman-queue-list' });
		for (let i = 0; i < queue.length; i++) {
			this.renderItem(listEl, queue[i], i);
		}
	}

	getSelectedIndices(): number[] {
		return [...this.selectedIndices];
	}

	private renderItem(parent: HTMLElement, change: PendingChange, index: number): void {
		const itemEl = parent.createDiv({ cls: 'vaultman-queue-item' });

		// Checkbox for selection (when selectable)
		if (this.callbacks.selectable) {
			const cb = itemEl.createEl('input', {
				cls: 'vaultman-queue-checkbox',
				attr: { type: 'checkbox' },
			});
			cb.addEventListener('change', () => {
				if (cb.checked) {
					this.selectedIndices.add(index);
				} else {
					this.selectedIndices.delete(index);
				}
			});
		}

		itemEl.createSpan({
			cls: 'vaultman-queue-index',
			text: `${index + 1}.`,
		});

		const descEl = itemEl.createSpan({
			cls: 'vaultman-queue-desc',
		});
		descEl.createSpan({
			cls: 'vaultman-queue-action',
			text: change.action,
		});
		descEl.createSpan({
			text: ` ${change.details}`,
		});

		itemEl.createSpan({
			cls: 'vaultman-queue-file-count',
			text: `(${change.files.length} files)`,
		});

		const removeBtn = itemEl.createEl('button', {
			cls: 'vaultman-filter-remove-btn clickable-icon',
			attr: { 'aria-label': 'Remove from queue' },
		});
		removeBtn.setText('\u00d7');
		removeBtn.addEventListener('click', () => this.callbacks.onRemove(index));
	}
}
