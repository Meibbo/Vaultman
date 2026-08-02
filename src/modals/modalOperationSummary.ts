import { Modal, Setting, type App } from 'obsidian';
import { translate } from '../i18n/index';
import type { PropMoveTypeChange } from '../logic/logicPropMoveConflict';

/**
 * The confirmation that bypass mode has no queue to provide.
 *
 * With `operationMode === 'stage'` the queue's own review is the
 * confirmation, so this modal never opens. With `bypass` the operations run
 * immediately and there is nothing to read them in afterwards, which is why a
 * composed multi-target move stops here first.
 *
 * It renders the plan the pure logic produced. It computes nothing.
 */
export interface OperationSummaryLine {
	/** The destination property this line is about. */
	destination: string;
	/** The destination's type as it stands now. */
	destinationType: string;
	/** How many files this line writes. */
	fileCount: number;
	/** Whether the origin value is removed or kept. */
	originDisposition: 'move' | 'copy';
	/** The type change this line carries, when the policy coerced one. */
	typeChange: PropMoveTypeChange | null;
	/** For `replace`, what is overwritten and where. */
	overwrites?: readonly { file: string; values: readonly string[] }[];
	/** Why this destination is excluded, when it is. */
	blockedReason?: string | null;
}

export class OperationSummaryModal extends Modal {
	private readonly lines: readonly OperationSummaryLine[];
	private readonly onConfirm: () => void;
	private confirmed = false;

	constructor(
		app: App,
		lines: readonly OperationSummaryLine[],
		onConfirm: () => void,
	) {
		super(app);
		this.lines = lines;
		this.onConfirm = onConfirm;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClasses(['vaultman-modal', 'vaultman-operation-summary']);
		contentEl.createEl('h3', { text: translate('explorer.move_to_prop.summary') });

		for (const line of this.lines) {
			const lineEl = contentEl.createDiv({
				cls: 'vaultman-operation-summary-line',
			});
			lineEl.createSpan({
				cls: 'vaultman-operation-summary-destination',
				text: `${line.destination}: ${line.destinationType}`,
			});
			lineEl.createSpan({
				cls: 'vaultman-operation-summary-files',
				text: translate('explorer.move_to_prop.summary.files', {
					count: line.fileCount,
				}),
			});
			lineEl.createSpan({
				cls: 'vaultman-operation-summary-origin',
				text: translate(
					line.originDisposition === 'move'
						? 'explorer.move_to_prop.origin.move'
						: 'explorer.move_to_prop.origin.copy',
				),
			});

			if (line.typeChange) {
				// Stated literally, so the coercion is read before it is accepted.
				lineEl.createSpan({
					cls: 'vaultman-operation-summary-coercion',
					text: line.typeChange.declaration,
				});
			}

			if (line.blockedReason) {
				lineEl.createSpan({
					cls: 'vaultman-operation-summary-blocked',
					text: line.blockedReason,
				});
			}

			for (const overwrite of line.overwrites ?? []) {
				lineEl.createDiv({
					cls: 'vaultman-operation-summary-overwrite',
					text: `${overwrite.file}: ${overwrite.values.join(', ')}`,
				});
			}
		}

		new Setting(contentEl)
			.addButton((button) =>
				button
					.setButtonText(translate('common.cancel'))
					.onClick(() => this.close()),
			)
			.addButton((button) =>
				button
					.setButtonText(translate('explorer.move_to_prop.summary.confirm'))
					.setCta()
					.onClick(() => {
						this.confirmed = true;
						this.close();
					}),
			);
	}

	onClose(): void {
		this.contentEl.empty();
		// Nothing runs unless the confirm button was the way out: closing by
		// escape or by the backdrop queues nothing.
		if (this.confirmed) this.onConfirm();
	}
}
