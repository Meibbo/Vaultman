import { Menu, Modal, Notice, Setting, type App, type TFile } from 'obsidian';
import { translate } from '../i18n/index';
import type { VaultmanPlugin } from '../main';
import type { FilterGroup, FilterNode } from '../types/typeFilter';
import {
	APPLY_TEMPLATE,
	DELETE_PROP,
	FIND_REPLACE_CONTENT,
	NATIVE_RENAME_PROP,
	NATIVE_SET_PROP_TYPE,
	type PendingChange,
	type PropertyAction,
	type QueueTemplate,
	type QueueTemplateChange,
} from '../types/typeOps';

export type QueueTemplateTargetSource = 'selected' | 'filtered' | 'vault';

export interface QueueTemplateTarget {
	files: TFile[];
	source: QueueTemplateTargetSource;
	targetCount: number;
	vaultCount: number;
}

function cloneTargetFiles(files: TFile[]): TFile[] {
	return [...files];
}

export function isBulkQueueTarget({
	targetCount,
	vaultCount,
}: {
	targetCount: number;
	vaultCount: number;
}): boolean {
	if (targetCount <= 0 || vaultCount <= 0) return false;
	if (targetCount >= vaultCount) return true;
	if (vaultCount < 500) return targetCount / vaultCount >= 0.7;
	return targetCount > 500;
}

export function resolveQueueTemplateTarget(
	plugin: VaultmanPlugin,
): QueueTemplateTarget {
	const vaultFiles = plugin.app.vault.getMarkdownFiles();
	const selectedFiles = plugin.filterService.selectedFiles;
	if (selectedFiles.length > 0) {
		return createTarget('selected', selectedFiles, vaultFiles.length);
	}

	if (hasEnabledFilterRules(plugin.filterService.activeFilter)) {
		return createTarget(
			'filtered',
			plugin.filterService.filteredFiles,
			vaultFiles.length,
		);
	}

	return createTarget('vault', vaultFiles, vaultFiles.length);
}

function createTarget(
	source: QueueTemplateTargetSource,
	files: TFile[],
	vaultCount: number,
): QueueTemplateTarget {
	const clonedFiles = cloneTargetFiles(files);
	return {
		files: clonedFiles,
		source,
		targetCount: clonedFiles.length,
		vaultCount,
	};
}

function hasEnabledFilterRules(group: FilterGroup): boolean {
	return group.children.some((node) => hasEnabledFilterNode(node));
}

function hasEnabledFilterNode(node: FilterNode): boolean {
	if (node.enabled === false) return false;
	if (node.type === 'rule') return true;
	return node.children.some((child) => hasEnabledFilterNode(child));
}

export function serializeQueueTemplateChange(
	change: PendingChange,
): QueueTemplateChange | null {
	if (change.type === 'property') {
		return {
			type: 'property',
			action: change.action as PropertyAction,
			property: change.property,
			value: change.value,
			oldValue: change.oldValue,
			details: change.details,
		};
	}
	if (change.type === 'content_replace') {
		return {
			type: 'content_replace',
			find: change.find,
			replace: change.replace,
			isRegex: change.isRegex,
			caseSensitive: change.caseSensitive,
			details: change.details,
		};
	}
	if (change.type === 'template') {
		return {
			type: 'template',
			templateFileStr: change.templateFileStr,
			details: change.details,
		};
	}
	if (change.type === 'tag' && (change.action === 'add' || change.action === 'delete')) {
		return {
			type: 'tag',
			action: change.action,
			tag: change.tag,
			details: change.details,
		};
	}
	return null;
}

export function rehydrateQueueTemplateChange(
	change: QueueTemplateChange,
	files: TFile[],
): PendingChange | null {
	const targetFiles = cloneTargetFiles(files);
	if (targetFiles.length === 0) return null;

	if (change.type === 'property') {
		return {
			type: 'property',
			action: change.action,
			property: change.property,
			value: change.value,
			oldValue: change.oldValue,
			details: change.details,
			files: targetFiles,
			customLogic: true,
			logicFunc: (_file, fm) => propertyTemplateLogic(change, fm),
		};
	}
	if (change.type === 'content_replace') {
		return {
			type: 'content_replace',
			find: change.find,
			replace: change.replace,
			isRegex: change.isRegex,
			caseSensitive: change.caseSensitive,
			details: change.details,
			files: targetFiles,
			action: 'replace',
			logicFunc: () => ({
				[FIND_REPLACE_CONTENT]: {
					pattern: change.find,
					replacement: change.replace,
					isRegex: change.isRegex,
					caseSensitive: change.caseSensitive,
				},
			}),
		};
	}
	if (change.type === 'template') {
		return {
			type: 'template',
			templateFileStr: change.templateFileStr,
			details: change.details,
			files: targetFiles,
			action: 'apply',
			logicFunc: () => ({ [APPLY_TEMPLATE]: change.templateFileStr }),
		};
	}
	if (change.type === 'tag') {
		return {
			type: 'tag',
			tag: change.tag,
			action: change.action,
			details: change.details,
			files: targetFiles,
			customLogic: true,
			logicFunc: (_file, fm) => tagTemplateLogic(change, fm),
		};
	}
	return null;
}

function propertyTemplateLogic(
	change: Extract<QueueTemplateChange, { type: 'property' }>,
	fm: Record<string, unknown>,
): Record<string, unknown> | null {
	switch (change.action) {
		case 'set':
			return { [change.property]: change.value ?? '' };
		case 'add':
			if (change.property in fm) return null;
			return { [change.property]: change.value ?? '' };
		case 'delete':
			if (change.oldValue !== undefined || change.value !== undefined) {
				const target = change.oldValue ?? change.value ?? '';
				const current = fm[change.property];
				if (Array.isArray(current)) {
					const next = current.filter(
						(value) => scalarToString(value) !== target,
					);
					return { [change.property]: next };
				}
				return scalarToString(current) === target
					? { [DELETE_PROP]: change.property }
					: null;
			}
			return { [DELETE_PROP]: change.property };
		case 'clean_empty':
			if (fm[change.property] === '' || fm[change.property] == null) {
				return { [DELETE_PROP]: change.property };
			}
			return null;
		case 'rename':
			return {
				[NATIVE_RENAME_PROP]: {
					oldName: change.property,
					newName: change.value ?? '',
				},
			};
		case 'change_type':
			return {
				[NATIVE_SET_PROP_TYPE]: {
					propName: change.property,
					type: change.value ?? 'text',
				},
			};
		default:
			return null;
	}
}

function scalarToString(value: unknown): string {
	if (value === null || value === undefined) return '';
	if (
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'boolean'
	) {
		return String(value);
	}
	return '';
}

function tagTemplateLogic(
	change: Extract<QueueTemplateChange, { type: 'tag' }>,
	fm: Record<string, unknown>,
): Record<string, unknown> | null {
	const raw = fm.tags;
	const existing = Array.isArray(raw)
		? raw.map((value) => scalarToString(value)).filter((value) => value)
		: typeof raw === 'string'
			? [raw]
			: [];
	if (change.action === 'add') {
		if (existing.includes(change.tag) || existing.includes(`#${change.tag}`)) {
			return null;
		}
		return { tags: [...existing, change.tag] };
	}
	const filtered = existing.filter(
		(tag) => tag !== change.tag && tag !== `#${change.tag}`,
	);
	return { tags: filtered.length > 0 ? filtered : undefined };
}

export function openQueueTemplateMenu(
	plugin: VaultmanPlugin,
	event: MouseEvent,
	onClose: () => void,
): void {
	const menu = new Menu();

	for (const template of plugin.settings.queueTemplates ?? []) {
		menu.addItem((item) =>
			item.setTitle(template.name).onClick(() => {
				void loadQueueTemplate(plugin, template);
			}),
		);
	}

	menu.addSeparator();
	menu.addItem((item) =>
		item.setTitle(translate('queue.template.save')).onClick(() => {
			new SaveQueueTemplateModal(plugin.app, plugin).open();
			onClose();
		}),
	);

	menu.showAtMouseEvent(event);
}

async function loadQueueTemplate(
	plugin: VaultmanPlugin,
	template: QueueTemplate,
): Promise<void> {
	const target = resolveQueueTemplateTarget(plugin);
	if (
		isBulkQueueTarget(target) &&
		!plugin.settings.suppressBulkOperationWarning
	) {
		const confirmed = await confirmBulkTarget(plugin, target);
		if (!confirmed) return;
	}

	const changes = template.changes
		.map((change) => rehydrateQueueTemplateChange(change, target.files))
		.filter((change): change is PendingChange => change !== null);
	if (changes.length === 0) {
		new Notice(translate('queue.template.no_serializable'));
		return;
	}
	plugin.queueService.addBatch(changes);
}

async function confirmBulkTarget(
	plugin: VaultmanPlugin,
	target: QueueTemplateTarget,
): Promise<boolean> {
	return new Promise((resolve) => {
		new BulkQueueTargetModal(plugin, target, resolve).open();
	});
}

class BulkQueueTargetModal extends Modal {
	private resolved = false;
	private suppressFutureWarnings = false;

	constructor(
		private readonly plugin: VaultmanPlugin,
		private readonly target: QueueTemplateTarget,
		private readonly resolve: (confirmed: boolean) => void,
	) {
		super(plugin.app);
	}

	onOpen(): void {
		this.contentEl.empty();
		this.contentEl.addClass('vaultman-modal');
		this.contentEl.createEl('h3', {
			text: translate('queue.template.bulk_title'),
		});
		this.contentEl.createEl('p', {
			cls: 'setting-item-description',
			text: translate('queue.template.bulk_desc', {
				count: this.target.targetCount,
				total: this.target.vaultCount,
				source: translate(`queue.template.source.${this.target.source}`),
			}),
		});

		new Setting(this.contentEl)
			.setName(translate('queue.template.bulk_suppress'))
			.addToggle((toggle) =>
				toggle.setValue(false).onChange((value) => {
					this.suppressFutureWarnings = value;
				}),
			);

		new Setting(this.contentEl)
			.addButton((button) =>
				button
					.setButtonText(translate('common.cancel'))
					.onClick(() => this.closeWith(false)),
			)
			.addButton((button) =>
				button
					.setButtonText(translate('queue.template.bulk_confirm'))
					.setCta()
					.onClick(() => {
						void this.confirm();
					}),
			);
	}

	onClose(): void {
		this.contentEl.empty();
		if (!this.resolved) this.resolve(false);
	}

	private async confirm(): Promise<void> {
		if (this.suppressFutureWarnings) {
			this.plugin.settings.suppressBulkOperationWarning = true;
			await this.plugin.saveSettings();
		}
		this.closeWith(true);
	}

	private closeWith(confirmed: boolean): void {
		if (this.resolved) return;
		this.resolved = true;
		this.resolve(confirmed);
		this.close();
	}
}

class SaveQueueTemplateModal extends Modal {
	private plugin: VaultmanPlugin;
	private templateName = '';

	constructor(app: App, plugin: VaultmanPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen(): void {
		this.contentEl.empty();
		this.contentEl.addClass('vaultman-modal');
		this.contentEl.createEl('h3', { text: translate('queue.template.save') });

		const existing = this.plugin.settings.queueTemplates ?? [];
		if (existing.length > 0) {
			const listEl = this.contentEl.createDiv({ cls: 'vaultman-template-list' });
			listEl.createEl('small', {
				cls: 'vaultman-text-faint',
				text: `${translate('settings.templates')}: ${existing
					.map((template) => template.name)
					.join(', ')}`,
			});
		}

		new Setting(this.contentEl)
			.setName(translate('session.name'))
			.addText((text) =>
				text
					.setPlaceholder('Template name...')
					.setValue(this.templateName)
					.onChange((value) => {
						this.templateName = value.trim();
					}),
			);

		new Setting(this.contentEl)
			.addButton((button) =>
				button
					.setButtonText(translate('queue.template.save'))
					.setCta()
					.onClick(() => {
						void this.saveTemplate();
						this.close();
					}),
			)
			.addButton((button) =>
				button.setButtonText(translate('common.cancel')).onClick(() => {
					this.close();
				}),
			);
	}

	private async saveTemplate(): Promise<void> {
		const name = this.templateName.trim();
		if (!name) return;

		const changes = this.plugin.queueService.queue
			.map(serializeQueueTemplateChange)
			.filter((change): change is QueueTemplateChange => change !== null);
		if (changes.length === 0) {
			new Notice(translate('queue.template.no_serializable'));
			return;
		}

		const template: QueueTemplate = { name, changes };
		const templates = this.plugin.settings.queueTemplates ?? [];
		const index = templates.findIndex((candidate) => candidate.name === name);
		if (index === -1) templates.push(template);
		else templates[index] = template;
		this.plugin.settings.queueTemplates = templates;
		await this.plugin.saveSettings();
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
