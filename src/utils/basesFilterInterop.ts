import {
	Menu,
	Notice,
	TFile,
	parseYaml,
	type App,
} from 'obsidian';
import type { VaultmanPlugin } from '../main';
import type {
	FilterGroup,
	FilterNode,
	FilterRule,
	GroupLogic,
} from '../types/typeFilter';
import { translate } from '../i18n/index';

interface BasesView {
	name?: string;
	type?: string;
	filters?: unknown;
}

interface BasesFile {
	filters?: unknown;
	views?: BasesView[];
}

const DEFAULT_EXPORT_BASE = 'Vaultman Filters.base';

export function openBasesFilterInteropMenu(
	plugin: VaultmanPlugin,
	event: MouseEvent,
	closePopup: () => void,
): void {
	const menu = new Menu();
	const baseFiles = plugin.app.vault
		.getFiles()
		.filter((file) => file.extension === 'base')
		.sort((a, b) => a.path.localeCompare(b.path));

	if (baseFiles.length === 0) {
		menu.addItem((item) =>
			item
				.setTitle(translate('filters.bases.no_files'))
				.setDisabled(true),
		);
	} else {
		for (const file of baseFiles) {
			menu.addItem((item) =>
				item.setTitle(`${translate('filters.bases.import')} ${file.path}`).onClick(
					() => {
						void importBaseFile(plugin, file, closePopup);
					},
				),
			);
		}
	}

	menu.addSeparator();
	menu.addItem((item) =>
		item
			.setTitle(translate('filters.bases.export'))
			.setIcon('lucide-upload')
			.onClick(() => {
				void exportActiveFiltersToBase(plugin);
			}),
	);
	menu.showAtMouseEvent(event);
}

export async function importBaseFile(
	plugin: VaultmanPlugin,
	file: TFile,
	closePopup: () => void = () => undefined,
): Promise<void> {
	const content = await plugin.app.vault.cachedRead(file);
	let parsed: BasesFile | null = null;
	try {
		parsed = parseYaml(content) as BasesFile | null;
	} catch {
		new Notice(translate('filters.bases.invalid_yaml'));
		return;
	}
	const choices = buildImportChoices(parsed);

	if (choices.length === 0) {
		new Notice(translate('filters.bases.no_supported_filters'));
		return;
	}

	if (choices.length === 1) {
		applyImportedBaseFilter(plugin, choices[0].group, closePopup);
		return;
	}

	const menu = new Menu();
	for (const choice of choices) {
		menu.addItem((item) =>
			item.setTitle(choice.label).onClick(() => {
				applyImportedBaseFilter(plugin, choice.group, closePopup);
			}),
		);
	}
	menu.showAtPosition({
		x: window.innerWidth / 2,
		y: window.innerHeight / 2,
	});
}

export function buildImportChoices(parsed: BasesFile | null): Array<{
	label: string;
	group: FilterGroup;
}> {
	if (!parsed) return [];
	const choices: Array<{ label: string; group: FilterGroup }> = [];
	const globalGroup = translateBasesFiltersToVaultman(parsed.filters);
	if (globalGroup.children.length > 0) {
		choices.push({
			label: translate('filters.bases.global_filters'),
			group: globalGroup,
		});
	}

	for (const view of parsed.views ?? []) {
		const combined = combineBasesFilters(parsed.filters, view.filters);
		const group = translateBasesFiltersToVaultman(combined);
		if (group.children.length === 0) continue;
		choices.push({
			label: `${view.name ?? view.type ?? translate('filters.bases.view')}`,
			group,
		});
	}
	return choices;
}

export function translateBasesFiltersToVaultman(filters: unknown): FilterGroup {
	const node = translateBasesFilterNode(filters);
	if (!node) return emptyGroup();
	if (node.type === 'group') return node;
	return {
		type: 'group',
		logic: 'all',
		children: [node],
		id: 'root',
		enabled: true,
	};
}

export function translateBasesFilterExpression(
	expression: string,
): FilterNode | null {
	const expr = expression.trim();
	if (!expr) return null;

	const negated = expr.startsWith('!');
	const source = negated ? expr.slice(1).trim() : expr;

	const tag = readCallArg(source, 'file.hasTag');
	if (tag !== null) return maybeNegate(rule('has_tag', '', [tag]), negated);

	const folder = readCallArg(source, 'file.inFolder');
	if (folder !== null) return maybeNegate(rule('folder', '', [folder]), negated);

	const fileNameContains = readCallArg(source, 'file.name.contains');
	if (fileNameContains !== null)
		return maybeNegate(rule('file_name', '', [fileNameContains]), negated);

	const folderContains = readCallArg(source, 'file.folder.contains');
	if (folderContains !== null)
		return maybeNegate(rule('folder', '', [folderContains]), negated);

	const extEquals = source.match(/^file\.ext\s*={2,3}\s*["']?([^"']+)["']?$/);
	if (extEquals) {
		const ext = extEquals[1].replace(/^\./, '');
		return maybeNegate(rule('file_name', '', [`.${ext}`]), negated);
	}

	const folderEquals = source.match(/^file\.folder\s*={2,3}\s*["']([^"']+)["']$/);
	if (folderEquals)
		return maybeNegate(rule('folder', '', [folderEquals[1]]), negated);

	const nameEquals = source.match(/^file\.name\s*={2,3}\s*["']([^"']+)["']$/);
	if (nameEquals)
		return maybeNegate(rule('file_name', '', [nameEquals[1]]), negated);

	const inequality = source.match(
		/^([A-Za-z_][\w.-]*)\s*!={1,2}\s*["']([^"']+)["']$/,
	);
	if (inequality) {
		return group('none', [rule('specific_value', inequality[1], [inequality[2]])]);
	}

	const equality = source.match(
		/^([A-Za-z_][\w.-]*)\s*={2,3}\s*["']([^"']+)["']$/,
	);
	if (equality) {
		return maybeNegate(
			rule('specific_value', equality[1], [equality[2]]),
			negated,
		);
	}

	const exists = source.match(/^([A-Za-z_][\w.-]*)\s*!=\s*null$/);
	if (exists) return maybeNegate(rule('has_property', exists[1], []), negated);

	const missing = source.match(/^([A-Za-z_][\w.-]*)\s*={2,3}\s*null$/);
	if (missing)
		return maybeNegate(rule('missing_property', missing[1], []), negated);

	return null;
}

export function filterGroupToBasesFilters(groupNode: FilterGroup): unknown {
	return groupToBases(groupNode);
}

async function exportActiveFiltersToBase(plugin: VaultmanPlugin): Promise<void> {
	const filters = filterGroupToBasesFilters(plugin.filterService.activeFilter);
	if (!filters) {
		new Notice(translate('filters.bases.no_active_filters'));
		return;
	}
	const path = plugin.settings.basesLastUsedPath || DEFAULT_EXPORT_BASE;
	const yaml = toYaml({
		filters,
		views: [
			{
				type: 'table',
				name: 'Vaultman active filters',
				filters,
				order: ['file.name', 'file.ext', 'file.folder'],
			},
		],
	});
	await writeVaultFile(plugin.app, path, yaml);
	plugin.settings.basesLastUsedPath = path;
	await plugin.saveSettings();
	new Notice(translate('filters.bases.exported').replace('{path}', path));
}

function applyImportedBaseFilter(
	plugin: VaultmanPlugin,
	groupNode: FilterGroup,
	closePopup: () => void,
): void {
	plugin.filterService.setFilter(groupNode);
	closePopup();
	new Notice(translate('filters.bases.imported'));
}

function buildGroupFromArray(logic: GroupLogic, values: unknown[]): FilterGroup {
	return group(
		logic,
		values
			.map(translateBasesFilterNode)
			.filter((node): node is FilterNode => node !== null),
	);
}

function translateBasesFilterNode(input: unknown): FilterNode | null {
	if (!input) return null;
	if (typeof input === 'string') return translateBasesFilterExpression(input);
	if (Array.isArray(input)) return buildGroupFromArray('all', input);
	if (typeof input !== 'object') return null;

	const record = input as Record<string, unknown>;
	if (Array.isArray(record.and)) return buildGroupFromArray('all', record.and);
	if (Array.isArray(record.or)) return buildGroupFromArray('any', record.or);
	if (Array.isArray(record.not)) return buildGroupFromArray('none', record.not);
	if (record.not) {
		const child = translateBasesFilterNode(record.not);
		return child ? group('none', [child]) : null;
	}
	return null;
}

function combineBasesFilters(globalFilters: unknown, viewFilters: unknown): unknown {
	const parts = [globalFilters, viewFilters].filter(Boolean);
	if (parts.length === 0) return null;
	if (parts.length === 1) return parts[0];
	return { and: parts };
}

function group(logic: GroupLogic, children: FilterNode[]): FilterGroup {
	return {
		type: 'group',
		logic,
		children,
		id: `bases-${logic}-${Math.random().toString(36).slice(2)}`,
		enabled: true,
	};
}

function emptyGroup(): FilterGroup {
	return {
		type: 'group',
		logic: 'all',
		children: [],
		id: 'root',
		enabled: true,
	};
}

function rule(
	filterType: FilterRule['filterType'],
	property: string,
	values: string[],
): FilterRule {
	return {
		type: 'rule',
		filterType,
		property,
		values,
		id: `bases-rule-${Math.random().toString(36).slice(2)}`,
		enabled: true,
	};
}

function maybeNegate(node: FilterNode, negated: boolean): FilterNode {
	return negated ? group('none', [node]) : node;
}

function readCallArg(source: string, fn: string): string | null {
	const escaped = fn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const match = source.match(new RegExp(`^${escaped}\\(["']([^"']+)["']\\)$`));
	return match?.[1] ?? null;
}

function groupToBases(groupNode: FilterGroup): unknown {
	const children = groupNode.children
		.map(nodeToBases)
		.filter((node) => node !== null);
	if (children.length === 0) return null;
	const key =
		groupNode.logic === 'all'
			? 'and'
			: groupNode.logic === 'any'
				? 'or'
				: 'not';
	return { [key]: children };
}

function nodeToBases(node: FilterNode): unknown {
	if (node.enabled === false) return null;
	if (node.type === 'group') return groupToBases(node);
	switch (node.filterType) {
		case 'has_tag':
			return `file.hasTag("${escapeExpressionValue(node.values[0] ?? '')}")`;
		case 'folder':
		case 'file_folder':
			return `file.inFolder("${escapeExpressionValue(node.values[0] ?? '')}")`;
		case 'file_name':
			return `file.name.contains("${escapeExpressionValue(node.values[0] ?? '')}")`;
		case 'has_property':
			return `${node.property} != null`;
		case 'missing_property':
			return `${node.property} == null`;
		case 'specific_value':
			return `${node.property} == "${escapeExpressionValue(node.values[0] ?? '')}"`;
		default:
			return null;
	}
}

function escapeExpressionValue(value: string): string {
	return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

async function writeVaultFile(
	app: App,
	path: string,
	content: string,
): Promise<void> {
	const existing = app.vault.getAbstractFileByPath(path);
	if (existing instanceof TFile) {
		await app.vault.modify(existing, content);
		return;
	}
	await app.vault.create(path, content);
}

function toYaml(value: unknown, indent = 0): string {
	const pad = ' '.repeat(indent);
	if (Array.isArray(value)) {
		return value
			.map((item) => `${pad}- ${toYamlInlineOrNested(item, indent + 2)}`)
			.join('\n');
	}
	if (value && typeof value === 'object') {
		return Object.entries(value as Record<string, unknown>)
			.map(([key, child]) => `${pad}${key}: ${toYamlInlineOrNested(child, indent + 2)}`)
			.join('\n');
	}
	return JSON.stringify(value ?? null);
}

function toYamlInlineOrNested(value: unknown, indent: number): string {
	if (Array.isArray(value) || (value && typeof value === 'object')) {
		return `\n${toYaml(value, indent)}`;
	}
	return JSON.stringify(value ?? null);
}
