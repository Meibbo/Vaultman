import { Modal, Setting, type App, type TFile } from 'obsidian';
import type { PropertyAction, PropertyType, PendingChange } from '../types/typeOps';
import { DELETE_PROP, NATIVE_RENAME_PROP } from '../types/typeOps';
import type { PropertyIndexService } from '../index/utilPropIndex';
import { PropertySuggest } from '../utils/autocomplete';
import { translate } from '../index/i18n/lang';

type QueueCallback = (change: PendingChange) => void;

/**
 * Modal for creating property operations (set, rename, delete, clean, change type).
 * Operations are queued — not executed immediately.
 *
 * Port of Python's PropertyManagerWindow.
 */
export class PropertyManagerModal extends Modal {
	private propertyIndex: PropertyIndexService;
	private targetFiles: TFile[];
	private onQueue: QueueCallback;

	// Form state
	private action: PropertyAction = 'set';
	private property = '';
	private value = '';
	private newName = '';
	private propertyType: PropertyType = 'text';
	private asWikilink = false;
	private appendToList = false;
	private useNativeRename = false;

	constructor(
		app: App,
		propertyIndex: PropertyIndexService,
		targetFiles: TFile[],
		onQueue: QueueCallback,
	) {
		super(app);
		this.propertyIndex = propertyIndex;
		this.targetFiles = targetFiles;
		this.onQueue = onQueue;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('vm-modal');

		contentEl.createEl('h3', { text: translate('prop.title') });
		contentEl.createEl('p', {
			cls: 'vm-modal-subtitle',
			text: `${this.targetFiles.length} files`,
		});

		// Action selector
		new Setting(contentEl).setName(translate('prop.action')).addDropdown((dd) =>
			dd
				.addOptions({
					set: translate('prop.action.set'),
					rename: translate('prop.action.rename'),
					delete: translate('prop.action.delete'),
					clean_empty: translate('prop.action.clean'),
					change_type: translate('prop.action.change_type'),
					add: translate('prop.action.add'),
				})
				.setValue(this.action)
				.onChange((v) => {
					this.action = v as PropertyAction;
					this.renderForm();
				}),
		);

		contentEl.createDiv({ cls: 'vm-prop-form' });
		this.renderForm();
	}

	private renderForm(): void {
		const formEl = this.contentEl.querySelector('.vm-prop-form');
		if (!formEl) return;
		formEl.empty();

		const propertyNames = this.propertyIndex.getPropertyNames();

		// Property selector with autosuggest
		new Setting(formEl as HTMLElement).setName(translate('prop.property')).addText((text) => {
			text
				.setPlaceholder('Property name...')
				.setValue(this.property)
				.onChange((v) => {
					this.property = v;
				});
			new PropertySuggest(this.app, text.inputEl, propertyNames, (val) => {
				this.property = val;
				text.setValue(val);
			});
		});

		// Action-specific fields
		switch (this.action) {
			case 'set':
				this.renderSetFields(formEl as HTMLElement);
				break;
			case 'rename':
				this.renderRenameFields(formEl as HTMLElement);
				break;
			case 'delete':
				// No extra fields needed
				break;
			case 'clean_empty':
				// No extra fields needed
				break;
			case 'change_type':
				this.renderChangeTypeFields(formEl as HTMLElement);
				break;
			case 'add':
				this.renderSetFields(formEl as HTMLElement);
				break;
		}

		// Submit button
		new Setting(formEl as HTMLElement).addButton((btn) =>
			btn
				.setButtonText(translate('prop.add_to_queue'))
				.setCta()
				.onClick(() => {
					const change = this.buildChange();
					if (change) {
						this.onQueue(change);
						this.close();
					}
				}),
		);
	}

	private renderSetFields(container: HTMLElement): void {
		// Type selector
		new Setting(container).setName(translate('prop.type')).addDropdown((dd) =>
			dd
				.addOptions({
					text: translate('prop.type.text'),
					number: translate('prop.type.number'),
					checkbox: translate('prop.type.checkbox'),
					list: translate('prop.type.list'),
					date: translate('prop.type.date'),
				})
				.setValue(this.propertyType)
				.onChange((v) => {
					this.propertyType = v as PropertyType;
				}),
		);

		// Value input with autosuggest
		new Setting(container).setName(translate('prop.value')).addText((text) => {
			text
				.setPlaceholder('Value')
				.setValue(this.value)
				.onChange((v) => {
					this.value = v;
				});
			if (this.property) {
				new PropertySuggest(
					this.app,
					text.inputEl,
					this.propertyIndex.getPropertyValues(this.property),
					(val) => {
						this.value = val;
						text.setValue(val);
					},
				);
			}
		});

		// Wikilink toggle
		new Setting(container).setName(translate('prop.option.wikilink')).addToggle((toggle) =>
			toggle.setValue(this.asWikilink).onChange((v) => {
				this.asWikilink = v;
			}),
		);

		// Append toggle (for list type)
		if (this.propertyType === 'list') {
			new Setting(container).setName(translate('prop.option.append')).addToggle((toggle) =>
				toggle.setValue(this.appendToList).onChange((v) => {
					this.appendToList = v;
				}),
			);
		}
	}

	private renderRenameFields(container: HTMLElement): void {
		new Setting(container).setName(translate('prop.new_name')).addText((text) => {
			text
				.setPlaceholder('New property name')
				.setValue(this.newName)
				.onChange((v) => {
					this.newName = v;
				});
			new PropertySuggest(this.app, text.inputEl, this.propertyIndex.getPropertyNames(), (val) => {
				this.newName = val;
				text.setValue(val);
			});
		});

		// Native rename toggle — only if rename is selected
		new Setting(container)
			.setName(translate('prop.option.native_rename'))
			.setDesc(translate('prop.option.native_rename_desc'))
			.addToggle((toggle) =>
				toggle.setValue(this.useNativeRename).onChange((v) => {
					this.useNativeRename = v;
				}),
			);
	}

	private renderChangeTypeFields(container: HTMLElement): void {
		new Setting(container).setName(translate('prop.type')).addDropdown((dd) =>
			dd
				.addOptions({
					text: translate('prop.type.text'),
					number: translate('prop.type.number'),
					checkbox: translate('prop.type.checkbox'),
					list: translate('prop.type.list'),
					date: translate('prop.type.date'),
					wikilink: translate('prop.type.wikilink'),
				})
				.setValue(this.propertyType)
				.onChange((v) => {
					this.propertyType = v as PropertyType;
				}),
		);
	}

	private buildChange(): PendingChange | null {
		if (!this.property) return null;

		const files = [...this.targetFiles];

		switch (this.action) {
			case 'set': {
				const parsedValue = this.parseValue(this.value, this.propertyType);
				const strParsed = String(parsedValue);
				const finalValue = this.asWikilink ? `[[${strParsed}]]` : parsedValue;
				return {
					type: 'property',
					property: this.property,
					action: 'set',
					details: `${this.property} = ${String(finalValue)}`,
					files,
					logicFunc: (_file, metadata) => {
						if (this.propertyType === 'list' && this.appendToList) {
							const existing = metadata[this.property];
							const list = Array.isArray(existing) ? [...(existing as unknown[])] : [];
							if (Array.isArray(finalValue)) {
								list.push(...(finalValue as unknown[]));
							} else {
								list.push(finalValue);
							}
							return { [this.property]: list };
						}
						return { [this.property]: finalValue };
					},
					customLogic: false,
				};
			}

			case 'rename': {
				if (!this.newName) return null;
				return {
					type: 'property',
					property: this.property,
					action: 'rename',
					details: `${this.property} → ${this.newName}`,
					files,
					logicFunc: (_file, metadata) => {
						if (!(this.property in metadata)) return null;
						const value = metadata[this.property];

						// If native rename is enabled, we signal it via a special key.
						// The OperationQueueService will handle the vault-wide call.
						if (this.useNativeRename) {
							return {
								[NATIVE_RENAME_PROP]: {
									oldName: this.property,
									newName: this.newName,
								},
							};
						}

						return {
							[this.newName]: value,
							[DELETE_PROP]: this.property,
						};
					},
					customLogic: false,
				};
			}

			case 'delete':
				return {
					type: 'property',
					property: this.property,
					action: 'delete',
					details: `delete ${this.property}`,
					files,
					logicFunc: () => ({ [DELETE_PROP]: this.property }),
					customLogic: false,
				};

			case 'clean_empty':
				return {
					type: 'property',
					property: this.property,
					action: 'clean_empty',
					details: `clean empty ${this.property}`,
					files,
					logicFunc: (_file, metadata) => {
						const val = metadata[this.property];
						if (
							val === null ||
							val === undefined ||
							val === '' ||
							(Array.isArray(val) && val.length === 0)
						) {
							return { [DELETE_PROP]: this.property };
						}
						return null;
					},
					customLogic: false,
				};

			case 'change_type':
				return {
					type: 'property',
					property: this.property,
					action: 'change_type',
					details: `${this.property} → ${this.propertyType}`,
					files,
					logicFunc: (_file, metadata) => {
						if (!(this.property in metadata)) return null;
						const current = metadata[this.property];
						return { [this.property]: this.convertType(current, this.propertyType) };
					},
					customLogic: false,
				};

			case 'add':
				return {
					type: 'property',
					property: this.property,
					action: 'add',
					details: `add ${this.property} = ${this.value}`,
					files,
					logicFunc: (_file, metadata) => {
						if (this.property in metadata) return null;
						const parsedValue = this.parseValue(this.value, this.propertyType);
						return { [this.property]: parsedValue };
					},
					customLogic: false,
				};

			default:
				return null;
		}
	}

	private parseValue(raw: string, type: PropertyType): unknown {
		switch (type) {
			case 'number': {
				const n = Number(raw);
				return isNaN(n) ? 0 : n;
			}
			case 'checkbox':
				return !['false', '0', 'no', 'none', 'null', ''].includes(raw.toLowerCase().trim());
			case 'list':
				return raw
					.split(',')
					.map((s) => s.trim())
					.filter((s) => s.length > 0);
			case 'date':
			case 'text':
			default:
				return raw;
		}
	}

	private convertType(value: unknown, targetType: PropertyType): unknown {
		switch (targetType) {
			case 'wikilink': {
				// Wrap in [[...]] if not already wrapped
				const toWikilink = (v: unknown): string => {
					const s = String((v as string | number | boolean) ?? '').replace(/^\[\[|\]\]$/g, '');
					return s ? `[[${s}]]` : '';
				};
				if (Array.isArray(value)) return value.map(toWikilink);
				return toWikilink(value);
			}
			case 'text':
				if (Array.isArray(value)) return value.map(String).join(', ');
				// Strip wikilink brackets if present
				return String((value as string | number | boolean) ?? '').replace(/^\[\[|\]\]$/g, '');
			case 'number': {
				if (Array.isArray(value)) {
					const first = (value as unknown[])[0];
					const n = Number(first);
					return isNaN(n) ? 0 : n;
				}
				const n = Number(value);
				return isNaN(n) ? 0 : n;
			}
			case 'checkbox': {
				if (typeof value === 'string') {
					return !['false', '0', 'no', 'none', 'null', ''].includes(value.toLowerCase().trim());
				}
				return Boolean(value);
			}
			case 'list':
				if (Array.isArray(value)) return value;
				if (typeof value === 'string') {
					return value
						.split(',')
						.map((s) => s.trim())
						.filter(Boolean);
				}
				if (value == null) return [];
				if (typeof value === 'object') return [JSON.stringify(value)];
				// eslint-disable-next-line @typescript-eslint/no-base-to-string -- guarded above (primitive only)
				return [String(value)];
			case 'date': {
				if (Array.isArray(value)) return String(value[0] ?? '');
				const str = String((value as string | number | boolean) ?? '');
				// Try to extract ISO date pattern
				const dateMatch = str.match(/(\d{4}-\d{2}-\d{2})(?:T|\s)?(\d{2}:\d{2}:\d{2})?/);
				if (dateMatch) {
					return dateMatch[2] ? `${dateMatch[1]}T${dateMatch[2]}` : dateMatch[1];
				}
				return str;
			}
		}
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
