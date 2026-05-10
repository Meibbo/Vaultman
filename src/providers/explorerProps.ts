import type { TFile } from 'obsidian';
import { PropsLogic } from '../logic/logicProps';
import type { TreeNode, PropMeta, NodeBadge } from '../types/typeNode';
import { DELETE_PROP, NATIVE_RENAME_PROP } from '../types/typeOps';
import { showInputModal } from '../utils/inputModal';
import {
	createFnRState,
	startPropRenameHandoff,
	startValueRenameHandoff,
} from '../services/serviceFnR';
import type { FnRRenameHandoff, FnRScope } from '../types/typeFnR';
import {
	highlightsFromViewLayers,
	nodeBadgesFromViewLayers,
	withViewStateClasses,
} from '../utils/utilViewLayers';
import { getActivePerfProbe } from '../dev/perfProbe';
import type { VaultmanPlugin } from '../main';
import type { ExplorerProvider, ExplorerViewMode } from '../types/typeExplorer';
import type { MenuCtx } from '../types/typeCtxMenu';
import { serviceMessage } from '../services/serviceMessage';

const TYPE_ICON_MAP: Record<string, string> = {
	text: 'lucide-text-align-start',
	number: 'lucide-hash',
	checkbox: 'lucide-check-square',
	date: 'lucide-calendar',
	datetime: 'lucide-clock',
	list: 'lucide-list',
	multitext: 'lucide-list-plus',
};

export interface ExplorerPropsOptions {
	startRenameHandoff?: (handoff: FnRRenameHandoff) => void;
	/**
	 * Phase 7: open the FnR island in `add-prop` mode pre-filled with the
	 * `<propName>: ` template. The Svelte shell wires this to the
	 * panel-scoped `FnRIslandService`.
	 */
	openPropSetIsland?: (propName: string) => void;
}

export class explorerProps implements ExplorerProvider<PropMeta> {
	id = 'props';
	private plugin: VaultmanPlugin;
	private logic: PropsLogic;
	private options: ExplorerPropsOptions;
	private searchTerm = '';
	private searchMode: 'all' | 'leaf' = 'all';
	private sortBy: string = 'name';
	private sortDir: 'asc' | 'desc' = 'asc';
	private addMode = false;
	private unsubscribePropsIndex: () => void;

	constructor(plugin: VaultmanPlugin, options: ExplorerPropsOptions = {}) {
		this.plugin = plugin;
		this.options = options;
		this.logic = new PropsLogic(plugin.app, plugin.propsIndex);
		this.unsubscribePropsIndex = this.plugin.propsIndex.subscribe(() => {
			getActivePerfProbe()?.count('explorerProps.invalidate');
			this.logic.invalidate();
		});
		this.registerActions();
	}

	destroy(): void {
		this.unsubscribePropsIndex();
	}

	private registerActions() {
		const svc = this.plugin.contextMenuService;

		svc.registerAction({
			id: 'prop.rename',
			nodeTypes: ['prop'],
			surfaces: ['panel'],
			label: (ctx) => `Rename "${ctx.node.label}"`,
			icon: 'lucide-pencil',
			when: (ctx) => !(ctx.node.meta as PropMeta).isValueNode,
			run: (ctx) => this._renameProp((ctx.node.meta as PropMeta).propName),
		});

		svc.registerAction({
			id: 'prop.delete',
			nodeTypes: ['prop'],
			surfaces: ['panel'],
			label: (ctx) => {
				const nodes = this.contextPropNodes(ctx);
				return nodes.length > 1
					? `Delete ${nodes.length} properties`
					: `Delete "${ctx.node.label}"`;
			},
			icon: 'lucide-trash-2',
			when: (ctx) => !(ctx.node.meta as PropMeta).isValueNode,
			run: (ctx) => {
				for (const node of this.contextPropNodes(ctx)) this._deleteProp(node.meta.propName);
			},
		});

		const types = ['text', 'number', 'checkbox', 'date', 'list'] as const;
		types.forEach((type) => {
			svc.registerAction({
				id: `prop.type-${type}`,
				nodeTypes: ['prop'],
				surfaces: ['panel'],
				label: type.charAt(0).toUpperCase() + type.slice(1),
				icon: TYPE_ICON_MAP[type],
				submenu: 'Change type',
				when: (ctx) => !(ctx.node.meta as PropMeta).isValueNode,
				run: (ctx) => {
					for (const node of this.contextPropNodes(ctx))
						this._changePropType(node.meta.propName, type);
				},
			});
		});

		svc.registerAction({
			id: 'prop.set',
			nodeTypes: ['prop'],
			surfaces: ['panel'],
			label: (ctx) => `Set "${ctx.node.label}"`,
			icon: 'lucide-plus-circle',
			when: (ctx) => !(ctx.node.meta as PropMeta).isValueNode,
			run: (ctx) => {
				const meta = ctx.node.meta as PropMeta;
				this.openPropSet(meta.propName);
			},
		});

		svc.registerAction({
			id: 'prop.bindingNote',
			nodeTypes: ['prop'],
			surfaces: ['panel'],
			label: 'Create / open binding note',
			icon: 'lucide-link',
			when: (ctx) => !(ctx.node.meta as PropMeta).isValueNode,
			run: (ctx) => {
				const meta = ctx.node.meta as PropMeta;
				void this.plugin.nodeBindingService?.bindOrCreate({
					kind: 'prop',
					label: meta.propName,
					propName: meta.propName,
				});
			},
		});

		svc.registerAction({
			id: 'value.set',
			nodeTypes: ['value'],
			surfaces: ['panel'],
			label: (ctx) => `Set value "${ctx.node.label}"`,
			icon: 'lucide-plus-circle',
			when: (ctx) => (ctx.node.meta as PropMeta).isValueNode,
			run: (ctx) => {
				const meta = ctx.node.meta as PropMeta;
				this._setValueOnFiltered(meta.propName, meta.rawValue ?? meta.propName);
			},
		});

		svc.registerAction({
			id: 'value.bindingNote',
			nodeTypes: ['value'],
			surfaces: ['panel'],
			label: 'Create / open binding note',
			icon: 'lucide-link',
			when: (ctx) => (ctx.node.meta as PropMeta).isValueNode,
			run: (ctx) => {
				const meta = ctx.node.meta as PropMeta;
				void this.plugin.nodeBindingService?.bindOrCreate({
					kind: 'value',
					label: meta.rawValue ?? ctx.node.label,
					propName: meta.propName,
				});
			},
		});

		svc.registerAction({
			id: 'value.rename',
			nodeTypes: ['value'],
			surfaces: ['panel'],
			label: 'Rename value',
			icon: 'lucide-pencil',
			when: (ctx) => (ctx.node.meta as PropMeta).isValueNode,
			run: (ctx) => {
				const meta = ctx.node.meta as PropMeta;
				return this._renameValue(meta.propName, meta.rawValue ?? '');
			},
		});

		svc.registerAction({
			id: 'value.delete',
			nodeTypes: ['value'],
			surfaces: ['panel'],
			label: 'Delete value',
			icon: 'lucide-trash-2',
			when: (ctx) => (ctx.node.meta as PropMeta).isValueNode,
			run: (ctx) => {
				for (const node of this.contextValueNodes(ctx)) {
					this._deleteValue(node.meta.propName, node.meta.rawValue ?? '');
				}
			},
		});
	}

	getTree(): TreeNode<PropMeta>[] {
		const probe = getActivePerfProbe();
		let tree =
			probe?.measure('explorerProps.logicTree', undefined, () => this.logic.getTree()) ??
			this.logic.getTree();
		if (this.searchTerm) {
			const filterTree = () =>
				this.logic.filterTree(tree, this.searchTerm, this.searchMode === 'leaf' ? 1 : 0);
			tree =
				probe?.measure('explorerProps.filterTree', { nodes: tree.length }, filterTree) ??
				filterTree();
		}
		const sortTree = () => this._applySort(tree);
		const sorted =
			probe?.measure('explorerProps.sort', { nodes: tree.length }, sortTree) ?? sortTree();
		const decorateTree = () => this._decorateTree(sorted);
		return (
			probe?.measure(
				'explorerProps.decorateTree',
				{ nodes: probe ? countTreeNodes(sorted) : 0 },
				decorateTree,
			) ?? decorateTree()
		);
	}

	private _decorateTree(nodes: TreeNode<PropMeta>[], parentDeleted = false): TreeNode<PropMeta>[] {
		const operations = this.plugin.operationsIndex.nodes;
		const activeFilters = this.plugin.activeFiltersIndex.nodes;
		const revisions = {
			propsRevision: this.plugin.propsIndex?.revision,
			queueRevision: this.plugin.operationsIndex?.revision,
			filterRevision: this.plugin.activeFiltersIndex?.revision,
		};
		return nodes.map((node) => {
			const meta = node.meta;
			let currentCls = node.cls || '';

			const iconic = !meta.isValueNode ? this.plugin.iconicService?.getIcon(meta.propName) : null;
			const viewRow = this.plugin.viewService.getModel({
				explorerId: this.id,
				mode: 'tree',
				nodes: [node],
				operations,
				activeFilters,
				revisions,
				getLabel: (item) => item.label,
				getDecorationContext: () => ({
					kind: 'prop',
					highlightQuery: this.searchTerm,
					propType: meta.propType,
					isValueNode: meta.isValueNode,
					iconicIcon: iconic?.icon ?? null,
					propName: meta.propName,
					rawValue: meta.rawValue,
				}),
			}).rows[0];
			const highlights = highlightsFromViewLayers(viewRow.layers);
			if (highlights && !currentCls.includes('vm-search-highlight')) {
				currentCls = `${currentCls} vm-search-highlight`.trim();
			}
			const deletedClass = meta.isValueNode ? 'is-deleted-value' : 'is-deleted-prop';
			currentCls = withViewStateClasses(currentCls, viewRow.layers, { deletedClass });
			if (parentDeleted)
				currentCls = withViewStateClasses(
					currentCls,
					{ state: { deleted: true } },
					{ deletedClass },
				);

			const badges: import('../types/typeNode').NodeBadge[] = [];
			if (meta.isTypeIncompatible) {
				badges.push({ text: 'Conflict', color: 'red', solid: true, icon: 'lucide-alert-triangle' });
			}
			badges.push(...nodeBadgesFromViewLayers(viewRow.layers, operations));
			badges.push(...this.quickActionBadges(meta));
			const isDeleted = parentDeleted || viewRow.layers.state?.deleted === true;

			return {
				...node,
				cls: currentCls,
				icon: viewRow.icon,
				highlights,
				badges,
				children: node.children ? this._decorateTree(node.children, isDeleted) : undefined,
			};
		});
	}

	handleNodeClick(node: TreeNode<PropMeta>): void {
		const meta = node.meta;
		if (this.addMode && !meta.isValueNode) {
			this._addProp(meta.propName);
			return;
		}

		// Logic to toggle filter...
		if (meta.isValueNode) {
			const value = meta.rawValue ?? '';
			if (this.plugin.filterService.hasValueFilter(meta.propName, value)) {
				void this.plugin.filterService.removeNodeByProperty(meta.propName, value);
				return;
			}
			void this.plugin.filterService.addNode({
				type: 'rule',
				filterType: 'specific_value',
				property: meta.propName,
				values: [value],
			});
		} else {
			if (this.plugin.filterService.hasPropFilter(meta.propName)) {
				void this.plugin.filterService.removeNodeByProperty(meta.propName);
				return;
			}
			void this.plugin.filterService.addNode({
				type: 'rule',
				filterType: 'has_property',
				property: meta.propName,
				values: [],
			});
		}
	}

	handleNodeSecondaryAction(node: TreeNode<PropMeta>): void {
		const meta = node.meta;
		const term = meta.isValueNode ? String(meta.rawValue ?? node.label) : meta.propName;
		this.openContentSearch(term);
	}

	handleContextMenu(
		node: TreeNode<PropMeta>,
		e: MouseEvent,
		selectedNodes: TreeNode<PropMeta>[] = [],
	): void {
		const nodeType = this.getNodeType(node);
		this.plugin.contextMenuService.openPanelMenu(
			{ nodeType, node: node, selectedNodes, surface: 'panel' },
			e,
		);
	}

	getNodeType(node: TreeNode<PropMeta>): 'prop' | 'value' {
		return node.meta.isValueNode ? 'value' : 'prop';
	}

	handleHoverBadge(
		node: TreeNode<PropMeta>,
		kind: string,
		selectedNodes: TreeNode<PropMeta>[] = [],
	): void {
		const nodes = selectedNodes.length > 0 ? selectedNodes : [node];
		const meta = node.meta;
		if (kind === 'set') {
			for (const candidate of nodes) {
				if (!candidate.meta.isValueNode) {
					this.openPropSet(candidate.meta.propName);
					continue;
				}
				this._setValueOnFiltered(
					candidate.meta.propName,
					candidate.meta.rawValue ?? candidate.meta.propName,
				);
			}
			return;
		}
		if (kind === 'delete') {
			for (const candidate of nodes) {
				if (candidate.meta.isValueNode)
					this._deleteValue(candidate.meta.propName, candidate.meta.rawValue ?? '');
				else this._deleteProp(candidate.meta.propName);
			}
			return;
		}
		if (kind === 'filter') {
			for (const candidate of nodes) this.handleNodeClick(candidate);
			return;
		}
		if (kind === 'rename') {
			if (meta.isValueNode) void this._renameValue(meta.propName, meta.rawValue ?? '');
			else void this._renameProp(meta.propName);
		}
	}

	setSearchTerm(term: string, mode: 'all' | 'leaf' = 'all'): void {
		this.searchTerm = term;
		this.searchMode = mode;
	}
	setSortBy(sortBy: string, direction: 'asc' | 'desc'): void {
		this.sortBy = sortBy;
		this.sortDir = direction;
	}
	setViewMode(_mode: ExplorerViewMode): void {}
	setAddMode(active: boolean): void {
		this.addMode = active;
	}

	private _applySort(nodes: TreeNode<PropMeta>[]): TreeNode<PropMeta>[] {
		const dir = this.sortDir === 'asc' ? 1 : -1;
		return [...nodes].sort((a, b) => {
			if (this.sortBy === 'count') return dir * ((a.count ?? 0) - (b.count ?? 0));
			return dir * a.label.localeCompare(b.label);
		});
	}

	private async _renameProp(propName: string): Promise<void> {
		const files = this.scopedFilesWithProperty(propName);
		if (this.options.startRenameHandoff) {
			const state = startPropRenameHandoff(createFnRState(), {
				propName: this.canonicalPropName(propName),
				files,
				scope: this.fnrScope(),
			});
			this.options.startRenameHandoff(state.rename);
			return;
		}

		const newName = await showInputModal(this.plugin.app, `Rename "${propName}" to:`);
		if (!newName) return;
		const canonicalName = this.canonicalPropName(propName);
		this.plugin.queueService.add({
			type: 'property',
			property: canonicalName,
			action: 'rename',
			details: `Rename property "${propName}" ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ "${newName}"`,
			files,
			customLogic: true,
			logicFunc: (_file, fm) => {
				const actualKey = frontmatterKey(fm, propName);
				if (!actualKey) return null;
				return {
					[NATIVE_RENAME_PROP]: {
						oldName: actualKey,
						newName,
					},
				};
			},
		});
	}

	private _deleteProp(propName: string): void {
		const canonicalName = this.canonicalPropName(propName);
		this.plugin.queueService.add({
			type: 'property',
			property: canonicalName,
			action: 'delete',
			details: `Bulk delete property "${propName}"`,
			files: this.scopedFilesWithProperty(propName),
			customLogic: true,
			logicFunc: (_file, fm) => {
				const actualKey = frontmatterKey(fm, propName);
				if (!actualKey) return null;
				return { [DELETE_PROP]: actualKey };
			},
		});
	}

	private _addProp(propName: string): void {
		void this.plugin.queueService.add({
			type: 'property',
			property: propName,
			action: 'add',
			details: `Add property "${propName}"`,
			files: this.operationScopeFiles(),
			customLogic: true,
			logicFunc: (_file, fm) => {
				if (propName in fm) return null;
				return { [propName]: '' };
			},
		});
	}

	/**
	 * Phase 7 `set` value action: queue a `set_prop` change writing
	 * `{ key: parentProp, value: label }` over every operation-scope file.
	 * Existing keys are overwritten per spec.
	 */
	private _setValueOnFiltered(propName: string, value: string): void {
		const files = this.operationScopeFiles();
		if (files.length === 0 || !propName) return;
		const canonicalName = this.canonicalPropName(propName);
		void this.plugin.queueService.add({
			type: 'property',
			property: canonicalName,
			action: 'set',
			details: `Set ${canonicalName}: ${value}`,
			files,
			value,
			customLogic: true,
			logicFunc: () => ({ [canonicalName]: value }),
		});
	}

	private openPropSet(propName: string): void {
		if (!propName) {
			serviceMessage.warning('No prop selected');
			return;
		}
		if (this.options.openPropSetIsland) {
			this.options.openPropSetIsland(propName);
			return;
		}
		serviceMessage.warning('Prop set requires the fnr island to be mounted.');
	}

	private openContentSearch(term: string): void {
		const search = term.trim();
		if (!search) return;
		if (this.plugin.openContentSearchHook) {
			this.plugin.openContentSearchHook(search);
			return;
		}
		this.plugin.contentIndex?.setQuery(search);
	}

	private quickActionBadges(meta: PropMeta): NodeBadge[] {
		if (!this.addMode || meta.isValueNode) return [];
		return [
			{
				text: 'add',
				icon: 'lucide-plus',
				color: 'green',
				quickAction: true,
				title: `Queue add property "${meta.propName}"`,
				ariaLabel: `Queue add property "${meta.propName}"`,
				onClick: () => this._addProp(meta.propName),
			},
		];
	}

	private _changePropType(propName: string, newType: string): void {
		const canonicalName = this.canonicalPropName(propName);
		this.plugin.queueService.add({
			type: 'property',
			property: canonicalName,
			action: 'change_type',
			details: `Change type of "${propName}" to ${newType}`,
			files: this.scopedFilesWithProperty(propName),
			customLogic: true,
			logicFunc: (_file, fm) => {
				const actualKey = frontmatterKey(fm, propName);
				if (!actualKey) return null;
				return { [actualKey]: fm[actualKey] };
			},
		});
	}

	private async _renameValue(propName: string, oldValue: string): Promise<void> {
		const files = this.scopedFilesWithValue(propName, oldValue);
		if (this.options.startRenameHandoff) {
			const state = startValueRenameHandoff(createFnRState(), {
				propName,
				oldValue,
				files,
				scope: this.fnrScope(),
			});
			this.options.startRenameHandoff(state.rename);
			return;
		}

		const newVal = await showInputModal(this.plugin.app, `Rename value "${oldValue}" to:`);
		if (!newVal) return;
		this.plugin.queueService.add({
			type: 'property',
			property: propName,
			action: 'set',
			details: `Rename value "${oldValue}" -> "${newVal}"`,
			files,
			value: newVal,
			oldValue: oldValue,
			customLogic: true,
			logicFunc: (_file, fm) => {
				const actualKey = frontmatterKey(fm, propName);
				if (!actualKey) return null;
				return replaceValueUpdate(actualKey, fm[actualKey], oldValue, newVal);
			},
		});
	}

	private _deleteValue(propName: string, oldValue: string): void {
		this.plugin.queueService.add({
			type: 'property',
			property: propName,
			action: 'delete',
			details: `Delete value "${oldValue}" from "${propName}"`,
			files: this.scopedFilesWithValue(propName, oldValue),
			customLogic: true,
			logicFunc: (_file, fm) => {
				const actualKey = frontmatterKey(fm, propName);
				if (!actualKey) return null;
				return deleteValueUpdate(actualKey, fm[actualKey], oldValue);
			},
		});
	}

	private contextPropNodes(ctx: MenuCtx): TreeNode<PropMeta>[] {
		return contextNodes<PropMeta>(ctx).filter((node) => !node.meta.isValueNode);
	}

	private contextValueNodes(ctx: MenuCtx): TreeNode<PropMeta>[] {
		return contextNodes<PropMeta>(ctx).filter((node) => node.meta.isValueNode);
	}

	private scopedFilesWithProperty(propName: string): TFile[] {
		return this.operationScopeFiles().filter((file) => {
			const fm = this.plugin.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
			return Boolean(frontmatterKey(fm, propName));
		});
	}

	private scopedFilesWithValue(propName: string, value: string): TFile[] {
		return this.operationScopeFiles().filter((file) => {
			const fm = this.plugin.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
			const actualKey = frontmatterKey(fm, propName);
			return Boolean(actualKey && valueContains(fm[actualKey], value));
		});
	}

	private operationScopeFiles(): TFile[] {
		const allFiles = this.plugin.app.vault.getMarkdownFiles();
		const filteredFiles = [...(this.plugin.filterService.filteredFiles ?? [])] as TFile[];
		const selectedFiles = [...(this.plugin.filterService.selectedFiles ?? [])] as TFile[];
		const scope = this.plugin.settings?.explorerOperationScope ?? 'filtered';
		if (scope === 'all') return allFiles;
		if (scope === 'selected') return selectedFiles;
		if (scope === 'filtered') return filteredFiles.length > 0 ? filteredFiles : allFiles;
		if (selectedFiles.length > 0) return selectedFiles;
		if (filteredFiles.length > 0) return filteredFiles;
		return allFiles;
	}

	private fnrScope(): FnRScope {
		const scope = this.plugin.settings?.explorerOperationScope;
		if (scope === 'selected' || scope === 'all') return scope;
		return 'filtered';
	}

	private canonicalPropName(propName: string): string {
		for (const file of this.plugin.app.vault.getMarkdownFiles()) {
			const fm = this.plugin.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
			const key = frontmatterKey(fm, propName);
			if (key) return key;
		}
		return propName;
	}
}

function contextNodes<TMeta>(ctx: MenuCtx): TreeNode<TMeta>[] {
	const selected = (ctx.selectedNodes ?? []) as TreeNode<TMeta>[];
	return (selected.length > 0 ? selected : [ctx.node as TreeNode<TMeta>]).filter(Boolean);
}

function frontmatterKey(fm: Record<string, unknown>, propName: string): string | null {
	const expected = propName.toLowerCase();
	return Object.keys(fm).find((key) => key.toLowerCase() === expected) ?? null;
}

function valueContains(value: unknown, needle: string): boolean {
	if (Array.isArray(value))
		return (value as unknown[]).some((item) => valueToString(item) === needle);
	return valueToString(value) === needle;
}

function replaceValueUpdate(
	propName: string,
	current: unknown,
	oldValue: string,
	newValue: string,
): Record<string, unknown> | null {
	if (Array.isArray(current)) {
		if (!valueContains(current, oldValue)) return null;
		const values = current as unknown[];
		return {
			[propName]: values.map((item): unknown =>
				valueToString(item) === oldValue ? newValue : item,
			),
		};
	}
	if (valueToString(current) !== oldValue) return null;
	return { [propName]: newValue };
}

function deleteValueUpdate(
	propName: string,
	current: unknown,
	oldValue: string,
): Record<string, unknown> | null {
	if (Array.isArray(current)) {
		const values = current as unknown[];
		const next = values.filter((item) => valueToString(item) !== oldValue);
		if (next.length === current.length) return null;
		if (next.length === 0) return { [DELETE_PROP]: propName };
		return { [propName]: next };
	}
	if (valueToString(current) !== oldValue) return null;
	return { [DELETE_PROP]: propName };
}

function countTreeNodes(nodes: TreeNode<PropMeta>[]): number {
	let count = 0;
	const stack = [...nodes];
	while (stack.length > 0) {
		const node = stack.pop()!;
		count += 1;
		if (node.children) stack.push(...node.children);
	}
	return count;
}

function valueToString(value: unknown): string {
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
		return String(value);
	}
	return JSON.stringify(value) ?? '';
}
