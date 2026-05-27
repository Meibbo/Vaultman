import { Modal, Notice, Setting, type App, type TFile } from 'obsidian';
import type { PropertyIndexService } from '../services/servicePropertyIndex';
import { PropertySuggest } from '../utils/autocomplete';
import { translate } from '../i18n/index';

/**
 * Linter modal — integrates with obsidian-linter's yaml-key-sort rule.
 *
 * Shows the current priority order, lets user reorder properties,
 * and applies linting to selected/filtered/all files by calling
 * the linter plugin's command per file.
 */
export class LinterModal extends Modal {
	private propertyIndex: PropertyIndexService;
	private targetFiles: TFile[];
	private priorityOrder: string[] = [];
	private listEl: HTMLElement | null = null;

	constructor(
		app: App,
		propertyIndex: PropertyIndexService,
		targetFiles: TFile[]
	) {
		super(app);
		this.propertyIndex = propertyIndex;
		this.targetFiles = targetFiles;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClasses(['vaultman-modal', 'vaultman-linter-modal']);

		contentEl.createEl('h3', { text: translate('linter.title') });

		// Check if obsidian-linter is installed
		const linterPlugin = this.getLinterPlugin();
		if (!linterPlugin) {
			contentEl.createEl('p', {
				cls: 'vaultman-linter-warning',
				text: translate('linter.not_installed'),
			});
			return;
		}

		// Load current priority order from linter config
		this.priorityOrder = this.loadLinterPriorityOrder();

		contentEl.createEl('p', {
			cls: 'vaultman-modal-subtitle',
			text: translate('linter.description'),
		});

		// Scope info
		contentEl.createDiv({
			cls: 'vaultman-linter-scope',
			text: `${translate('linter.scope')}: ${this.targetFiles.length} ${translate('section.files').toLowerCase()}`,
		});

		// Priority order list
		this.listEl = contentEl.createDiv({ cls: 'vaultman-linter-list' });
		this.renderList();

		// Add property input with autosuggest
		const addRow = contentEl.createDiv({ cls: 'vaultman-linter-add-row' });
		const addInput = addRow.createEl('input', {
			cls: 'vaultman-linter-add-input',
			attr: { type: 'text', placeholder: translate('linter.add_property') },
		});

		new PropertySuggest(
			this.app,
			addInput,
			this.propertyIndex.getPropertyNames().filter(
				(p) => !this.priorityOrder.includes(p)
			),
			(value) => {
				if (value && !this.priorityOrder.includes(value)) {
					this.priorityOrder.push(value);
					addInput.value = '';
					this.renderList();
				}
			}
		);

		addInput.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				const val = addInput.value.trim();
				if (val && !this.priorityOrder.includes(val)) {
					this.priorityOrder.push(val);
					addInput.value = '';
					this.renderList();
				}
			}
		});

		// Action buttons
		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText(translate('linter.save_order'))
					.onClick(() => this.savePriorityOrder())
			)
			.addButton((btn) =>
				btn
					.setButtonText(translate('linter.apply'))
					.setCta()
					.onClick(async () => {
						this.savePriorityOrder();
						this.close();
						await this.applyLinting();
					})
			)
			.addButton((btn) =>
				btn.setButtonText('Cancel').onClick(() => this.close())
			);
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private renderList(): void {
		if (!this.listEl) return;
		this.listEl.empty();

		for (let i = 0; i < this.priorityOrder.length; i++) {
			const prop = this.priorityOrder[i];
			const row = this.listEl.createDiv({ cls: 'vaultman-linter-item' });

			// Index
			row.createSpan({
				cls: 'vaultman-linter-index',
				text: String(i + 1),
			});

			// Property name
			row.createSpan({
				cls: 'vaultman-linter-prop',
				text: prop,
			});

			// Move up button
			const upBtn = row.createEl('button', {
				cls: 'vaultman-btn-small',
				text: '↑',
			});
			upBtn.disabled = i === 0;
			upBtn.addEventListener('click', () => {
				if (i > 0) {
					[this.priorityOrder[i - 1], this.priorityOrder[i]] =
						[this.priorityOrder[i], this.priorityOrder[i - 1]];
					this.renderList();
				}
			});

			// Move down button
			const downBtn = row.createEl('button', {
				cls: 'vaultman-btn-small',
				text: '↓',
			});
			downBtn.disabled = i === this.priorityOrder.length - 1;
			downBtn.addEventListener('click', () => {
				if (i < this.priorityOrder.length - 1) {
					[this.priorityOrder[i], this.priorityOrder[i + 1]] =
						[this.priorityOrder[i + 1], this.priorityOrder[i]];
					this.renderList();
				}
			});

			// Remove button
			const removeBtn = row.createEl('button', {
				cls: 'vaultman-filter-remove-btn',
				text: '×',
			});
			removeBtn.addEventListener('click', () => {
				this.priorityOrder.splice(i, 1);
				this.renderList();
			});
		}
	}

	/** Read the linter plugin's yaml-key-sort priority order */
	private loadLinterPriorityOrder(): string[] {
		const linterPlugin = this.getLinterPlugin();
		if (!linterPlugin) return [];

		try {
			// Access linter's settings via its data
			const settings = (linterPlugin as Record<string, unknown>).settings as Record<string, unknown> | undefined;
			const ruleConfigs = settings?.ruleConfigs as Record<string, Record<string, unknown>> | undefined;
			const yamlKeySort = ruleConfigs?.['yaml-key-sort'];
			const orderStr = yamlKeySort?.['yaml-key-priority-sort-order'] as string | undefined;

			if (orderStr) {
				return orderStr.split('\n').filter((s) => s.trim().length > 0);
			}
		} catch {
			// Fallback: try reading from data.json directly
		}

		return [];
	}

	/** Save priority order back to linter's config */
	private savePriorityOrder(): void {
		const linterPlugin = this.getLinterPlugin();
		if (!linterPlugin) return;

		try {
			const settings = (linterPlugin as Record<string, unknown>).settings as Record<string, unknown> | undefined;
			const ruleConfigs = settings?.ruleConfigs as Record<string, Record<string, unknown>> | undefined;
			const yamlKeySort = ruleConfigs?.['yaml-key-sort'];

			if (yamlKeySort) {
				yamlKeySort['yaml-key-priority-sort-order'] = this.priorityOrder.join('\n');
				// Trigger linter's save
				const saveSettings = (linterPlugin as Record<string, unknown>).saveSettings;
				if (typeof saveSettings === 'function') {
					saveSettings.call(linterPlugin);
				}
				new Notice(translate('linter.order_saved'));
			}
		} catch {
			new Notice(translate('linter.save_error'));
		}
	}

	/** Apply linting to all target files by opening each and running lint command */
	private async applyLinting(): Promise<void> {
		const commandId = 'obsidian-linter:lint-file';
		const total = this.targetFiles.length;
		let success = 0;
		let errors = 0;

		new Notice(`${translate('linter.applying')} (0/${total})...`);

		for (let i = 0; i < this.targetFiles.length; i++) {
			const file = this.targetFiles[i];
			try {
				// Open the file in a background leaf so linter can act on it
				const leaf = this.app.workspace.getLeaf('tab');
				await leaf.openFile(file);

				// Small delay for metadataCache to sync
				await new Promise((r) => window.setTimeout(r, 50));

				// Execute linter command (internal Obsidian API — no public alternative)
				(this.app as unknown as { commands: { executeCommandById: (id: string) => boolean } })
					.commands.executeCommandById(commandId);

				success++;
			} catch {
				errors++;
			}

			// Progress notice every 10 files
			if ((i + 1) % 10 === 0 || i === total - 1) {
				new Notice(`${translate('linter.applying')} (${i + 1}/${total})...`);
			}
		}

		new Notice(
			`${translate('linter.done')}: ${success} ${translate('result.success').replace('{count}', '')}` +
			(errors > 0 ? `, ${errors} errors` : '')
		);
	}

	private getLinterPlugin(): unknown {
		return (this.app as unknown as { plugins: { plugins: Record<string, unknown> } })
			.plugins?.plugins?.['obsidian-linter'] ?? null;
	}
}
