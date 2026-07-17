/**
 * @deprecated Transitional adapter during Fase 1 of the File-Centric Queue refactor.
 * Replaced by `src/components/views/viewDiff.svelte` in Fase 2 (D3 of plan anchor
 * `twinkling-pearl.md`). Scheduled for deletion in Fase 5. Do not extend.
 */
import { Modal, Setting, type App } from 'obsidian';
import type { OperationQueueService } from '../services/serviceQueue.svelte';
import { translate } from '../index/i18n/lang';
import { buildDiff, computeBodyHunks, type FileDiff } from '../services/serviceDiff';
import { serviceMessage } from '../services/serviceMessage';

/**
 * Transitional diff preview modal.
 * @deprecated See file-level JSDoc.
 */
export class QueueDetailsModal extends Modal {
	private queueService: OperationQueueService;

	constructor(app: App, queueService: OperationQueueService) {
		super(app);
		this.queueService = queueService;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClasses(['vm-modal', 'vm-queue-details']);

		contentEl.createEl('h3', { text: translate('queue.title') });

		const diffs = buildDiff(this.queueService.transactions);
		if (diffs.length === 0) {
			contentEl.createEl('p', { text: translate('result.no_changes') });
			return;
		}
		const totalOps = diffs.reduce((s, d) => s + d.opSummaries.length, 0);

		// --- Summary header ---
		const summaryEl = contentEl.createDiv({ cls: 'vm-diff-summary' });
		summaryEl.createSpan({
			text: `${diffs.length} ${translate('section.files').toLowerCase()} · ${totalOps} ${translate('section.operations').toLowerCase()}`,
		});

		// --- File diffs ---
		const diffContainer = contentEl.createDiv({ cls: 'vm-diff-container' });
		this.renderDiffs(diffContainer, diffs);

		// --- Apply / Cancel buttons ---
		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText(translate('ops.apply'))
					.setCta()
					.onClick(async () => {
						this.close();
						await this.executeWithProgress();
					}),
			)
			.addButton((btn) => btn.setButtonText('Cancel').onClick(() => this.close()));
	}

	private renderDiffs(container: HTMLElement, diffs: FileDiff[]): void {
		container.empty();
		for (const fd of diffs) {
			const fileEl = container.createDiv({ cls: 'vm-diff-file' });

			// Header: path (or rename path) + op count
			const headerEl = fileEl.createDiv({ cls: 'vm-diff-file-header' });
			const pathText =
				fd.newPath && fd.newPath !== fd.path ? `${fd.path} → ${fd.newPath}` : fd.path;
			headerEl.createSpan({ cls: 'vm-diff-file-path', text: pathText });
			headerEl.createSpan({
				cls: 'vm-diff-file-ops',
				text: ` (${fd.opSummaries.length} ops)`,
			});

			// FM deltas
			if (fd.fmDeltas.length > 0) {
				const fmEl = fileEl.createDiv({ cls: 'vm-diff-fm' });
				for (const delta of fd.fmDeltas) {
					if (delta.kind === 'unchanged') continue;
					const rowEl = fmEl.createDiv({ cls: 'vm-diff-row' });
					rowEl.addClass(`vm-diff-${delta.kind}`);
					rowEl.createSpan({ cls: 'vm-diff-key', text: delta.key });
					if (delta.kind === 'changed') {
						rowEl.createSpan({ cls: 'vm-diff-before', text: this.formatDiffValue(delta.before) });
						rowEl.createSpan({ cls: 'vm-diff-sep', text: ' → ' });
						rowEl.createSpan({ cls: 'vm-diff-after', text: this.formatDiffValue(delta.after) });
					} else if (delta.kind === 'added') {
						rowEl.createSpan({ cls: 'vm-diff-after', text: this.formatDiffValue(delta.after) });
					} else if (delta.kind === 'removed') {
						rowEl.createSpan({ cls: 'vm-diff-before', text: this.formatDiffValue(delta.before) });
					}
				}
			}

			// Body hunks (lazy — compute on first render of this file)
			if (fd.bodyChanged) {
				const bodyEl = fileEl.createDiv({ cls: 'vm-diff-body' });
				const hunks = computeBodyHunks(fd.bodyBefore, fd.bodyAfter);
				for (const hunk of hunks) {
					bodyEl.createDiv({ cls: 'vm-diff-hunk-header', text: hunk.header });
					for (const line of hunk.lines) {
						const lineEl = bodyEl.createDiv({ cls: 'vm-diff-hunk-line' });
						lineEl.addClass(`vm-diff-line-${line.kind}`);
						lineEl.setText(line.text);
					}
				}
			}

			// Op summaries with × remove buttons
			const opsEl = fileEl.createDiv({ cls: 'vm-diff-ops' });
			for (const op of fd.opSummaries) {
				const opEl = opsEl.createDiv({ cls: 'vm-diff-op' });
				opEl.createSpan({ cls: 'vm-diff-op-detail', text: op.details });
				const removeBtn = opEl.createEl('button', {
					cls: 'vm-filter-remove-btn clickable-icon',
					attr: { 'aria-label': 'Remove op' },
				});
				removeBtn.setText('×');
				removeBtn.addEventListener('click', () => {
					this.queueService.removeOp(fd.path, op.id);
					this.onOpen(); // re-render
				});
			}
		}
	}

	private formatDiffValue(value: unknown): string {
		if (value === undefined || value === null) return '';
		if (typeof value === 'string') return value;
		return JSON.stringify(value);
	}

	private async executeWithProgress(): Promise<void> {
		const total = this.queueService.fileCount;
		serviceMessage.info(`${translate('linter.applying')} (0/${total})...`);

		const result = await this.queueService.execute();

		if (result.errors > 0 && result.messages.length > 0) {
			serviceMessage.warning('Vaultman execution errors', { details: result.messages });
		}
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
