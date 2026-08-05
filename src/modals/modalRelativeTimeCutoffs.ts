import { Modal, Setting, type App } from 'obsidian';
import {
	DEFAULT_RELATIVE_TIME_CUTOFFS,
	type RelativeTimeCutoffs,
} from '../logic/logicRelativeTime';
import type { VaultmanSettings } from '../types/typeSettings';
import { translate } from '../i18n/index';

interface CutoffsHost {
	settings: VaultmanSettings;
	saveSettings(): Promise<void>;
}

/** Which settings field this modal edits (cells vs hover-tooltip trio). */
export type CutoffsTarget =
	| 'timestampRelativeCutoffs'
	| 'tooltipTimestampRelativeCutoffs';

/**
 * U121-027: fine-tuning for the relative-time wording — at how many of the
 * current unit the copy switches to the next one (60 s → minutes, 60 min →
 * hours, … up to years). Every change saves immediately: `saveSettings()`
 * notifies the settings listeners, so the visible cells repaint live while the
 * modal is still open (LivreUI).
 */
export class RelativeTimeCutoffsModal extends Modal {
	constructor(
		app: App,
		private readonly host: CutoffsHost,
		private readonly target: CutoffsTarget = 'timestampRelativeCutoffs',
	) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClasses(['vaultman-modal', 'vaultman-time-cutoffs-modal']);
		contentEl.createEl('h3', {
			text: translate('settings.timestamp_cutoffs.title'),
		});
		contentEl.createEl('p', {
			cls: 'vaultman-modal-subtitle',
			text: translate('settings.timestamp_cutoffs.subtitle'),
		});
		this.renderFields();
	}

	private renderFields(): void {
		const { contentEl } = this;
		const fields: (keyof RelativeTimeCutoffs)[] = [
			'minuteFromSeconds',
			'hourFromMinutes',
			'dayFromHours',
			'weekFromDays',
			'monthFromWeeks',
			'quarterFromMonths',
			'semesterFromQuarters',
			'yearFromSemesters',
		];

		const hidePredicateKey = this.target === 'timestampRelativeCutoffs' 
			? 'timestampRelativeHidePredicate' 
			: 'tooltipTimestampRelativeHidePredicate';

		new Setting(contentEl)
			.setName('Hide relative time predicate')
			.setDesc("Hides the 'ago' / 'hace' wording from relative timestamps (e.g. '5 minutes').")
			.addToggle((toggle) => 
				toggle
					.setValue(this.host.settings[hidePredicateKey] as boolean)
					.onChange(async (value) => {
						(this.host.settings[hidePredicateKey] as boolean) = value;
						await this.host.saveSettings();
					})
			);

		for (const field of fields) {
			const fallback = DEFAULT_RELATIVE_TIME_CUTOFFS[field];
			new Setting(contentEl)
				.setName(translate(`settings.timestamp_cutoffs.${field}`))
				.setDesc(translate(`settings.timestamp_cutoffs.${field}.desc`))
				.addText((text) => {
					text.inputEl.type = 'number';
					text.inputEl.min = '1';
					const cutoffs = this.host.settings[this.target];
					text
						.setPlaceholder(String(fallback))
						.setValue(
							cutoffs[field] === undefined ? '' : String(cutoffs[field]),
						)
						.onChange(async (value) => {
							const parsed = Number.parseInt(value, 10);
							if (value.trim() === '' || !Number.isFinite(parsed) || parsed < 1) {
								// Blank or invalid falls back to the default.
								delete this.host.settings[this.target][field];
							} else {
								this.host.settings[this.target][field] = parsed;
							}
							await this.host.saveSettings();
						});
				});
		}
		new Setting(contentEl).addButton((button) =>
			button
				.setButtonText(translate('settings.timestamp_cutoffs.reset'))
				.onClick(async () => {
					this.host.settings[this.target] = {};
					await this.host.saveSettings();
					this.onOpen();
				}),
		);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
