// src/components/PropsExplorerPanel.ts
import { Component, prepareSimpleSearch, setIcon } from 'obsidian';
import { PropsLogic } from '../../logic/logicProps';
import type { FilterService } from '../../services/serviceFilter';
import type { IconicService } from '../../services/serviceIcons';
import type { ContextMenuService } from '../../services/serviceContextMenu';
import { OperationQueueService } from '../../services/serviceOperationQueue';

export interface PanelPluginCtx {
	app: import('obsidian').App;
	filterService: FilterService;
	iconicService?: IconicService;
	contextMenuService: ContextMenuService;
	queueService: OperationQueueService;
}

import { UnifiedTreeView } from '../layout/viewTree';
import type { TreeNode, PropMeta } from '../../types/typeTree';
import type { PropertyChange } from '../../types/typeOps';
import { showInputModal } from '../../utils/inputModal';

const TYPE_ICON_MAP: Record<string, string> = {
	text: 'lucide-text-align-start',
	number: 'lucide-hash',
	checkbox: 'lucide-check-square',
	date: 'lucide-calendar',
	datetime: 'lucide-clock',
	list: 'lucide-list',
	multitext: 'lucide-list-plus',
};

export class PropsExplorerPanel extends Component {
	private plugin: PanelPluginCtx;
	private logic: PropsLogic;
	private containerEl: HTMLElement;
	private view: UnifiedTreeView;
	private expandedIds = new Set<string>();
	private searchTerm = '';
	private viewMode: 'tree' | 'grid' = 'tree';
	private sortBy: string = 'name';
	private sortDir: 'asc' | 'desc' = 'asc';

	constructor(containerEl: HTMLElement, plugin: PanelPluginCtx) {
		super();
		this.containerEl = containerEl;
		this.plugin = plugin;
		this.logic = new PropsLogic(plugin.app);
		this.view = new UnifiedTreeView(this.containerEl);
	}

	onload(): void {
		const svc = this.plugin.contextMenuService;

		// Property actions
		svc.registerAction({
			id: 'prop.rename',
			nodeTypes: ['prop'],
			surfaces: ['panel'],
			label: (ctx) => `Rename "${ctx.node.label}"`,
			icon: 'lucide-pencil',
			when: (ctx) => !(ctx.node.meta as PropMeta).isValueNode,
			run: (ctx) => this._renameProp(ctx.node.label),
		});

		svc.registerAction({
			id: 'prop.delete',
			nodeTypes: ['prop'],
			surfaces: ['panel'],
			label: (ctx) => `Delete "${ctx.node.label}"`,
			icon: 'lucide-trash-2',
			when: (ctx) => !(ctx.node.meta as PropMeta).isValueNode,
			run: (ctx) => this._deleteProp(ctx.node.label),
		});

		// Change type actions
		const types = ['text', 'number', 'checkbox', 'date', 'list'] as const;
		types.forEach(type => {
			svc.registerAction({
				id: `prop.type-${type}`,
				nodeTypes: ['prop'],
				surfaces: ['panel'],
				label: type.charAt(0).toUpperCase() + type.slice(1),
				icon: TYPE_ICON_MAP[type],
				submenu: 'Change type',
				when: (ctx) => !(ctx.node.meta as PropMeta).isValueNode,
				run: (ctx) => this._changePropType(ctx.node.label, type),
			});
		});

		// Value actions
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
			id: 'value.case-lower',
			nodeTypes: ['value'],
			surfaces: ['panel'],
			label: 'Lowercase',
			icon: 'lucide-case-lower',
			submenu: 'Convert',
			section: 'Text',
			when: (ctx) => {
				const meta = ctx.node.meta as PropMeta;
				return meta.isValueNode && !meta.isTypeIncompatible && meta.propType === 'text';
			},
			run: (ctx) => {
				const meta = ctx.node.meta as PropMeta;
				return this._convertValue(meta.propName, meta.rawValue ?? '', v => v.toLowerCase(), 'lowercase');
			},
		});

		svc.registerAction({
			id: 'value.case-upper',
			nodeTypes: ['value'],
			surfaces: ['panel'],
			label: 'Uppercase',
			icon: 'lucide-case-upper',
			submenu: 'Convert',
			section: 'Text',
			when: (ctx) => {
				const meta = ctx.node.meta as PropMeta;
				return meta.isValueNode && !meta.isTypeIncompatible && meta.propType === 'text';
			},
			run: (ctx) => {
				const meta = ctx.node.meta as PropMeta;
				return this._convertValue(meta.propName, meta.rawValue ?? '', v => v.toUpperCase(), 'uppercase');
			},
		});

		svc.registerAction({
			id: 'value.case-title',
			nodeTypes: ['value'],
			surfaces: ['panel'],
			label: 'Title case',
			icon: 'lucide-type',
			submenu: 'Convert',
			section: 'Text',
			when: (ctx) => {
				const meta = ctx.node.meta as PropMeta;
				return meta.isValueNode && !meta.isTypeIncompatible && meta.propType === 'text';
			},
			run: (ctx) => {
				const meta = ctx.node.meta as PropMeta;
				return this._convertValue(
					meta.propName,
					meta.rawValue ?? '',
					v => v.charAt(0).toUpperCase() + v.slice(1).toLowerCase(),
					'title case'
				);
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
				const meta = ctx.node.meta as PropMeta;
				return this._deleteValue(meta.propName, meta.rawValue ?? '');
			},
		});

		this.registerEvent(
			this.plugin.app.metadataCache.on('resolved', () => {
				this.logic.invalidate();
				this._render();
			}),
		);
		// Re-render after Iconic finishes loading
		this.plugin.iconicService?.onLoaded(() => this._render());

		// Re-render dynamically when filters or queues change
		this.plugin.filterService.on('changed', this._handleStateChange);
		this.plugin.queueService.on('changed', this._handleStateChange);

		this._render();
	}

	onunload(): void {
		this.plugin.filterService.off('changed', this._handleStateChange);
		this.plugin.queueService.off('changed', this._handleStateChange);
		super.onunload();
	}

	private addMode = false;

	setAddMode(active: boolean): void {
		this.addMode = active;
	}

	private readonly _handleStateChange = () => this._render();

	private _getFilesWithProp(propName: string): import('obsidian').TFile[] {
		return this.plugin.app.vault.getMarkdownFiles().filter(f =>
			propName in (this.plugin.app.metadataCache.getFileCache(f)?.frontmatter ?? {})
		);
	}

	private _getFilesWithValue(propName: string, value: string): import('obsidian').TFile[] {
		return this.plugin.app.vault.getMarkdownFiles().filter(f => {
			const fm: Record<string, unknown> = this.plugin.app.metadataCache.getFileCache(f)?.frontmatter ?? {};
			if (!(propName in fm)) return false;
			const v: unknown = fm[propName];
			if (Array.isArray(v)) return v.some(x => String(x) === value);
			return String(v) === value;
		});
	}

	setSearchTerm(term: string): void {
		this.searchTerm = term;
		this._render();
	}

	setViewMode(mode: 'tree' | 'grid'): void {
		this.viewMode = mode;
		if (mode === 'tree') {
			this.view = new UnifiedTreeView(this.containerEl);
		}
		this._render();
	}

	setSortBy(sortBy: string, direction: 'asc' | 'desc'): void {
		this.sortBy = sortBy;
		this.sortDir = direction;
		this._render();
	}

	private _findNode(id: string, nodes: TreeNode<PropMeta>[]): TreeNode<PropMeta> | null {
		for (const n of nodes) {
			if (n.id === id) return n;
			if (n.children) {
				const found = this._findNode(id, n.children);
				if (found) return found;
			}
		}
		return null;
	}

	private _render(): void {
		if (this.viewMode === 'grid') {
			this._renderGrid();
			return;
		}
		const tree = this.logic.getTree();
		const activeFilter = this.plugin.filterService.activeFilter;

		const activeFilterIds = new Set<string>();
		const highlightIds = new Set<string>();
		const warningIds = new Set<string>();

		// Helper to find filter matches
		const walkFilter = (node: import('../../types/typeFilter').FilterNode) => {
			if (node.type === 'rule' && node.property) {
				if (node.filterType === 'has_property') {
					activeFilterIds.add(node.property);
				} else if (node.filterType === 'specific_value') {
					node.values?.forEach(v => activeFilterIds.add(`${node.property}::${v}`));
				}
			} else if (node.type === 'group') {
				node.children.forEach(walkFilter);
			}
		};
		walkFilter(activeFilter);

		// FIX: prepare search function once
		const searcher = this.searchTerm ? prepareSimpleSearch(this.searchTerm) : null;
		const searchFunc = searcher ? (text: string) => searcher(text) : null;

		const sorted = this._applySort(tree);
		const nodesWithIcons = this._resolveIcons(sorted, warningIds, highlightIds, searchFunc, this.plugin.queueService.queue);

		this.view.render({
			nodes: nodesWithIcons,
			expandedIds: this.expandedIds,
			activeFilterIds,
			warningIds,
			searchHighlightIds: highlightIds,
			onToggle: (id: string) => {
				if (this.expandedIds.has(id)) this.expandedIds.delete(id);
				else this.expandedIds.add(id);
				void this._render();
			},
			onRowClick: (id: string) => {
				const node = this._findNode(id, tree);
				if (!node) return;
				const meta = node.meta;

				// ADD MODE: queue add-property operation instead of toggling filter
				if (this.addMode && !meta.isValueNode) {
					this.plugin.queueService.add({
						type: 'property',
						property: meta.propName,
						action: 'add',
						details: `Add property "${meta.propName}"`,
						files: this.plugin.filterService.filteredFiles,
						customLogic: true,
						logicFunc: (_file, fm) => {
							if (meta.propName in fm) return null;
							fm[meta.propName] = '';
							return fm;
						},
					});
					return;
				}

				// Block interaction if property is being deleted
				const isPropDeleted = this.plugin.queueService.queue.some(op =>
					op.type === 'property' && op.property === meta.propName && op.action === 'delete' && !('value' in op)
				);
				if (isPropDeleted) return;

				// TOGGLE LOGIC: remove if already active filter
				const filterId = meta.isValueNode ? `${meta.propName}::${meta.rawValue}` : meta.propName;
				if (activeFilterIds.has(filterId)) {
					if (meta.isValueNode) {
						void this.plugin.filterService.removeNodeByProperty(meta.propName, meta.rawValue ?? '');
					} else {
						void this.plugin.filterService.removeNodeByProperty(meta.propName);
					}
					return;
				}

				if (meta.isValueNode) {
					void this.plugin.filterService.addNode({
						type: 'rule', filterType: 'specific_value',
						property: meta.propName, values: [meta.rawValue ?? ''],
					});
				} else {
					void this.plugin.filterService.addNode({
						type: 'rule', filterType: 'has_property',
						property: meta.propName, values: [],
					});
				}
			},
			onContextMenu: (id: string, e: MouseEvent) => {
				const node = this._findNode(id, tree);
				if (!node) return;
				const meta = node.meta;
				const nodeType: 'prop' | 'value' = meta.isValueNode ? 'value' : 'prop';
				this.plugin.contextMenuService.openPanelMenu(
					{ nodeType, node, surface: 'panel' },
					e,
				);
			},
			onBadgeDoubleClick: (queueIndex: number) => {
				this.plugin.queueService.remove(queueIndex);
				void this._render();
			},
		});
	}

	private _applySort(nodes: TreeNode<PropMeta>[]): TreeNode<PropMeta>[] {
		const dir = this.sortDir === 'asc' ? 1 : -1;
		if (this.sortBy === 'date') {
			const mtimeMap = new Map<string, number>();
			for (const node of nodes) {
				if (node.meta.isValueNode) continue;
				const propName = node.meta.propName;
				let maxMtime = 0;
				for (const file of this.plugin.app.vault.getMarkdownFiles()) {
					const fm = this.plugin.app.metadataCache.getFileCache(file)?.frontmatter;
					if (fm && propName in fm && file.stat.mtime > maxMtime) {
						maxMtime = file.stat.mtime;
					}
				}
				mtimeMap.set(node.id, maxMtime);
			}
			return [...nodes].sort((a, b) => dir * ((mtimeMap.get(a.id) ?? 0) - (mtimeMap.get(b.id) ?? 0)));
		}
		return [...nodes].sort((a, b) => {
			if (this.sortBy === 'count') return dir * ((a.count ?? 0) - (b.count ?? 0));
			if (this.sortBy === 'sub')   return dir * ((a.children?.length ?? 0) - (b.children?.length ?? 0));
			return dir * a.label.localeCompare(b.label);
		});
	}

	private _renderGrid(): void {
		this.containerEl.empty();
		const tree = this.logic.getTree();
		const topProps = tree.filter(n => !n.meta.isValueNode);
		const sorted = this._applySort(topProps);

		const searcher = this.searchTerm ? prepareSimpleSearch(this.searchTerm) : null;
		const filtered = searcher ? sorted.filter(n => searcher(n.label)) : sorted;

		const grid = this.containerEl.createDiv({ cls: 'vaultman-props-grid' });
		for (const node of filtered) {
			const card = grid.createDiv({ cls: 'vaultman-prop-card' });
			const iconEl = card.createDiv({ cls: 'vaultman-prop-card-icon' });
			setIcon(iconEl, TYPE_ICON_MAP[node.meta.propType ?? ''] ?? 'lucide-tag');
			card.createDiv({ cls: 'vaultman-prop-card-name', text: node.label });
			const count = node.count ?? 0;
			if (count) card.createDiv({ cls: 'vaultman-prop-card-count', text: String(count) });
		}
		if (filtered.length === 0) {
			this.containerEl.createDiv({ cls: 'vaultman-empty-state', text: 'No properties' });
		}
	}

	private _resolveIcons(nodes: TreeNode<PropMeta>[], warningIds: Set<string>, highlightIds: Set<string>, searchFunc: ((text: string) => unknown) | null, queue: import('../../types/typeOps').PendingChange[], parentDeleted = false): TreeNode<PropMeta>[] {
		return nodes.map(node => {
			const meta = node.meta;
			let currentCls = node.cls || '';

			if (meta.isTypeIncompatible) warningIds.add(node.id);
			if (searchFunc && searchFunc(node.label)) highlightIds.add(node.id);

			const isPropDeleted = parentDeleted || queue.some(op => op.type === 'property' && op.property === meta.propName && op.action === 'delete' && !('value' in op));

			if (isPropDeleted) {
				if (!currentCls.includes('is-deleted-prop')) {
					currentCls = (currentCls + ' is-deleted-prop').trim();
				}
			} else if (meta.isValueNode) {
				const isValueDeleted = queue.some((op): op is PropertyChange =>
					op.type === 'property' &&
					op.property === meta.propName &&
					op.action === 'delete' &&
					op.oldValue === meta.rawValue
				);
				if (isValueDeleted) {
					if (!currentCls.includes('is-deleted-value')) {
						currentCls = (currentCls + ' is-deleted-value').trim();
					}
				}
			}

			const resolvedChildren = node.children
				? this._resolveIcons(node.children, warningIds, highlightIds, searchFunc, queue, isPropDeleted)
				: [];

			const badges: import('../../types/typeTree').NodeBadge[] = [];
			if (meta.isTypeIncompatible) {
				badges.push({ text: 'Conflict', color: 'red', solid: true, icon: 'lucide-alert-triangle' });
			}

			const relevantOps = queue.filter(op =>
				op.type === 'property' &&
				op.property === meta.propName &&
				(meta.isValueNode
					? (op.value === meta.rawValue || op.oldValue === meta.rawValue || op.action === 'change_type')
					: true)
			) as import('../../types/typeOps').PropertyChange[];

			for (const op of relevantOps) {
				const action = op.action;
				const opIdx = queue.indexOf(op);
				if (action === 'delete') badges.push({ text: 'Delete', icon: 'lucide-trash-2', color: 'red', queueIndex: opIdx });
				else if (action === 'rename' || action === 'set') badges.push({ text: 'Update', icon: 'lucide-pencil', color: 'blue', queueIndex: opIdx });
				else if (action === 'move') badges.push({ text: 'Move', icon: 'lucide-move', color: 'orange', queueIndex: opIdx });
				else if (action === 'change_type' || (meta.isValueNode && op.details.toLowerCase().includes('convert'))) {
					badges.push({ text: 'Convert', icon: 'lucide-arrow-right-left', color: 'blue', queueIndex: opIdx });
				} else badges.push({ text: 'In Queue', icon: 'lucide-clock', color: 'purple', queueIndex: opIdx });
			}

			// BUBLLE UP: If collapsed property node, show badges from resolved children
			const isExpanded = this.expandedIds.has(node.id);
			if (!meta.isValueNode && !isExpanded && resolvedChildren.length > 0) {
				const childBadges = resolvedChildren.flatMap(c => c.badges || []);
				const seen = new Set<string>();
				for (const b of childBadges) {
					const key = `${b.text}-${b.icon}`;
					if (!seen.has(key)) {
						badges.push({ ...b, isInherited: true });
						seen.add(key);
					}
				}
			}

			const iconic = !meta.isValueNode
				? this.plugin.iconicService?.getIcon(meta.propName)
				: null;
			const defaultIcon = !meta.isValueNode
				? (TYPE_ICON_MAP[meta.propType] ?? 'lucide-tag')
				: undefined;

			return {
				...node,
				cls: currentCls,
				icon: (iconic?.icon ?? defaultIcon) || undefined,
				badges: badges,
				children: resolvedChildren,
			};
		});
	}

	private async _changePropType(propName: string, newType: string): Promise<void> {
		const files = this._getFilesWithProp(propName);
		this.plugin.queueService.add({
			type: 'property',
			property: propName,
			action: 'change_type',
			details: `Change type of "${propName}" to ${newType}`,
			files,
			customLogic: true,
			logicFunc: (_file, fm) => fm
		});
	}

	private async _renameProp(propName: string): Promise<void> {
		const newName = await showInputModal(this.plugin.app, `Rename "${propName}" to:`);
		if (!newName) return;
		const files = this._getFilesWithProp(propName);
		this.plugin.queueService.add({
			type: 'property',
			property: propName,
			action: 'rename',
			details: `Rename property "${propName}" → "${newName}"`,
			files,
			customLogic: true,
			logicFunc: (_file, fm) => {
				if (!(propName in fm)) return null;
				fm[newName] = fm[propName];
				delete fm[propName];
				return fm;
			}
		});
	}

	private async _deleteProp(propName: string): Promise<void> {
		const files = this._getFilesWithProp(propName);
		this.plugin.queueService.add({
			type: 'property',
			property: propName,
			action: 'delete',
			details: `Bulk delete property "${propName}"`,
			files,
			customLogic: true,
			logicFunc: (_file, fm) => {
				if (!(propName in fm)) return null;
				delete fm[propName];
				return fm;
			}
		});
	}

	private async _renameValue(propName: string, oldValue: string): Promise<void> {
		const newVal = await showInputModal(this.plugin.app, `Rename value "${oldValue}" to:`);
		if (!newVal) return;
		await this._replaceValueInVault(propName, oldValue, newVal);
	}

	private async _deleteValue(propName: string, oldValue: string): Promise<void> {
		const files = this._getFilesWithValue(propName, oldValue);
		this.plugin.queueService.add({
			type: 'property',
			property: propName,
			action: 'delete',
			details: `Delete value "${oldValue}" from "${propName}"`,
			files,
			customLogic: true,
			logicFunc: (_file, fm) => {
				if (!(propName in fm)) return null;
				const val = fm[propName];
				if (Array.isArray(val)) {
					fm[propName] = (val as unknown[]).filter(v => String(v) !== oldValue);
				} else if (String(val) === oldValue) {
					delete fm[propName];
				} else {
					return null;
				}
				return fm;
			}
		});
	}

	private async _convertValue(propName: string, oldValue: string, transform: (v: string) => string, details: string): Promise<void> {
		await this._replaceValueInVault(propName, oldValue, transform(oldValue), details);
	}

	private async _replaceValueInVault(propName: string, oldValue: string, newValue: string, label?: string): Promise<void> {
		const files = this._getFilesWithValue(propName, oldValue);
		this.plugin.queueService.add({
			type: 'property',
			property: propName,
			action: 'set',
			details: label ? `Convert "${oldValue}" to ${label}` : `Rename value "${oldValue}" → "${newValue}"`,
			files,
			value: newValue,
			oldValue: oldValue,
			customLogic: true,
			logicFunc: (_file, fm) => {
				if (!(propName in fm)) return null;
				const val = fm[propName];
				let changed = false;
				if (Array.isArray(val)) {
					const newArr = (val as unknown[]).map(v => {
						if (String(v) === oldValue) { changed = true; return newValue; }
						return v;
					});
					if (changed) fm[propName] = newArr;
				} else if (String(val) === oldValue) {
					fm[propName] = newValue;
					changed = true;
				}
				return changed ? fm : null;
			}
		});
	}
}
