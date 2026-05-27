import { Modal, Setting, type App } from 'obsidian';
import type { FilterNode, FilterRule, FilterType, GroupLogic } from '../types/typeFilter';
import { PropertySuggest } from '../utils/autocomplete';
import { translate } from '../i18n/index';

type AddFilterCallback = (node: FilterNode) => void;

/**
 * Modal for creating a new filter rule or group.
 * Provides UI for selecting filter type, property, and values.
 * Uses PropertySuggest for instant autosuggest on property and value fields.
 */
export class AddFilterModal extends Modal {
	private onSubmit: AddFilterCallback;
	private propertyNames: string[];
	private propertyValues: (prop: string) => string[];
	// Form state
	private mode: 'rule' | 'group' = 'rule';
	private filterType: FilterType = 'has_property';
	private property = '';
	private values: string[] = [];
	private groupLogic: GroupLogic = 'all';

	constructor(
		app: App,
		propertyNames: string[],
		propertyValues: (prop: string) => string[],
		onSubmit: AddFilterCallback
	) {
		super(app);
		this.propertyNames = propertyNames;
		this.propertyValues = propertyValues;
		this.onSubmit = onSubmit;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('vaultman-modal');

		contentEl.createEl('h3', { text: translate('filter.add_rule') });

		// Mode toggle: Rule vs Group
		new Setting(contentEl)
			.setName('Mode')
			.addDropdown((dd) =>
				dd
					.addOptions({ rule: 'Filter rule', group: 'Filter group' })
					.setValue(this.mode)
					.onChange((v) => {
						this.mode = v as 'rule' | 'group';
						this.renderForm();
					})
			);

		// Dynamic form container
		contentEl.createDiv({ cls: 'vaultman-add-filter-form' });
		this.renderForm();
	}

	private renderForm(): void {
		const formEl = this.contentEl.querySelector('.vaultman-add-filter-form');
		if (!formEl) return;
		formEl.empty();

		if (this.mode === 'group') {
			new Setting(formEl as HTMLElement)
				.setName('Logic')
				.addDropdown((dd) =>
					dd
						.addOptions({
							all: translate('filter.logic.all'),
							any: translate('filter.logic.any'),
							none: translate('filter.logic.none'),
						})
						.setValue(this.groupLogic)
						.onChange((v) => {
							this.groupLogic = v as GroupLogic;
						})
				);
		} else {
			// Filter type
			new Setting(formEl as HTMLElement)
				.setName(translate('filter.add_rule'))
				.addDropdown((dd) =>
					dd
						.addOptions({
							has_property: translate('filter.has_property'),
							missing_property: translate('filter.missing_property'),
							specific_value: translate('filter.specific_value'),
							multiple_values: translate('filter.multiple_values'),
							folder: translate('filter.folder'),
							folder_exclude: translate('filter.folder_exclude'),
							file_name: translate('filter.file_name'),
							file_name_exclude: translate('filter.file_name_exclude'),
						})
						.setValue(this.filterType)
						.onChange((v) => {
							this.filterType = v as FilterType;
							this.renderForm();
						})
				);

			// Property input (for property-based filters)
			const needsProperty = [
				'has_property',
				'missing_property',
				'specific_value',
				'multiple_values',
			].includes(this.filterType);

			if (needsProperty) {
				new Setting(formEl as HTMLElement)
					.setName(translate('prop.property'))
					.addText((text) => {
						text
							.setPlaceholder('Property name...')
							.setValue(this.property)
							.onChange((v) => {
								this.property = v;
							});
						new PropertySuggest(
							this.app,
							text.inputEl,
							this.propertyNames,
							(val) => {
								this.property = val;
								text.setValue(val);
							}
						);
					});
			}

			// Value input (for value-based filters and folder/filename)
			const needsValue = [
				'specific_value',
				'multiple_values',
				'folder',
				'folder_exclude',
				'file_name',
				'file_name_exclude',
			].includes(this.filterType);

			if (needsValue) {
				new Setting(formEl as HTMLElement)
					.setName(translate('prop.value'))
					.addText((text) => {
						text
							.setPlaceholder(
								this.filterType.includes('folder')
									? 'e.g., +/'
									: this.filterType.includes('file_name')
										? 'e.g., 2026'
										: 'value'
							)
							.setValue(this.values[0] ?? '')
							.onChange((v) => {
								this.values = v
									.split(',')
									.map((s) => s.trim())
									.filter((s) => s.length > 0);
							});
						// Add value autosuggest for property-based value filters
						if (['specific_value', 'multiple_values'].includes(this.filterType) && this.property) {
							new PropertySuggest(
								this.app,
								text.inputEl,
								this.propertyValues(this.property),
								(val) => {
									this.values = [val];
									text.setValue(val);
								}
							);
						}
					});
			}
		}

		// Submit button
		new Setting(formEl as HTMLElement).addButton((btn) =>
			btn
				.setButtonText(this.mode === 'rule' ? translate('filter.add_rule') : translate('filter.add_group'))
				.setCta()
				.onClick(() => {
					const node = this.buildNode();
					if (node) {
						this.onSubmit(node);
						this.close();
					}
				})
		);
	}

	private buildNode(): FilterNode | null {
		if (this.mode === 'group') {
			return {
				type: 'group',
				logic: this.groupLogic,
				children: [],
			};
		}

		const rule: FilterRule = {
			type: 'rule',
			filterType: this.filterType,
			property: this.property,
			values: this.values,
		};

		// Validate
		const needsProperty = ['has_property', 'missing_property', 'specific_value', 'multiple_values'];
		if (needsProperty.includes(this.filterType) && !this.property) {
			return null;
		}

		return rule;
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
