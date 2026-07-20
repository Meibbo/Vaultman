import { Modal, type App } from 'obsidian';
import { translate } from '../i18n/index';
import type {
	PayloadPreview,
	PayloadPreviewNote,
	PayloadPreviewSection,
} from '../logic/logicPayloadPreview';

const NOTE_KEYS: Record<PayloadPreviewNote, string> = {
	'default-applied': 'payload_preview.note.default_applied',
	'generated-on-load': 'payload_preview.note.generated_on_load',
	'ignored-field': 'payload_preview.note.ignored_field',
	'invalid-shape': 'payload_preview.note.invalid_shape',
	'migration-applied': 'payload_preview.note.migration_applied',
	'missing-field': 'payload_preview.note.missing_field',
	'resolved-on-load': 'payload_preview.note.resolved_on_load',
	unchanged: 'payload_preview.note.unchanged',
	'unknown-field': 'payload_preview.note.unknown_field',
	'unknown-value': 'payload_preview.note.unknown_value',
};

function sectionTitle(section: PayloadPreviewSection): string {
	if (section.id === 'overview') {
		return translate('payload_preview.section.overview');
	}
	if (section.id === 'floating-toc') {
		return translate('payload_preview.section.floating_toc');
	}
	if (section.id === 'filter:root') {
		return translate('payload_preview.section.root_filter');
	}
	if (section.id.startsWith('filter:')) {
		return translate('payload_preview.section.filter', {
			index: section.id.slice('filter:'.length),
		});
	}
	if (section.id.startsWith('operation:')) {
		return translate('payload_preview.section.operation', {
			index: section.id.slice('operation:'.length),
		});
	}
	if (section.id.startsWith('layout:')) {
		const tab = section.id.slice('layout:'.length);
		const knownKey = `filter.tab.${tab}`;
		const localized = translate(knownKey);
		return localized === knownKey ? section.title : localized;
	}
	return section.title;
}

export class PayloadPreviewModal extends Modal {
	constructor(
		app: App,
		private readonly preview: PayloadPreview,
	) {
		super(app);
	}

	onOpen(): void {
		this.modalEl.addClass('vaultman-payload-preview-modal');
		this.titleEl.setText(
			translate('payload_preview.title', { name: this.preview.name }),
		);
		this.contentEl.empty();
		this.contentEl.createEl('p', {
			cls: 'setting-item-description',
			text: translate('payload_preview.read_only'),
		});

		if (this.preview.warningCount > 0) {
			const warningSummary = this.contentEl.createEl('p', {
				cls: 'setting-item-description mod-warning',
				text: translate('payload_preview.warning_count', {
					count: String(this.preview.warningCount),
				}),
			});
			warningSummary.setAttribute('role', 'note');
		}

		this.preview.sections.forEach((section, sectionIndex) => {
			const sectionEl = this.contentEl.createDiv({
				cls: 'vaultman-payload-preview-section',
			});
			const headingId = `vaultman-payload-preview-${sectionIndex}`;
			sectionEl.createEl('h3', {
				attr: { id: headingId },
				text: sectionTitle(section),
			});
			sectionEl.setAttribute('aria-labelledby', headingId);

			for (const row of section.rows) {
				const rowEl = sectionEl.createDiv({ cls: 'setting-item' });
				if (row.status === 'warning') {
					rowEl.addClass('mod-warning');
					rowEl.setAttribute('role', 'note');
				}
				const infoEl = rowEl.createDiv({ cls: 'setting-item-info' });
				infoEl.createDiv({ cls: 'setting-item-name', text: row.key });
				infoEl.createDiv({
					cls: 'setting-item-description',
					text: row.value,
				});
				if (row.note) {
					infoEl.createDiv({
						cls: 'setting-item-description',
						text: translate(NOTE_KEYS[row.note]),
					});
				}
			}
		});

		const actions = this.contentEl.createDiv({
			cls: 'modal-button-container',
		});
		const closeButton = actions.createEl('button', {
			text: translate('payload_preview.close'),
		});
		closeButton.addEventListener('click', () => this.close());
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
