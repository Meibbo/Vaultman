import type { App, TFile } from 'obsidian';
import { normalizeGroupLogic } from '../types/typeFilter';
import type { FilterGroup, FilterNode, FilterRule, FilterTemplate } from '../types/typeFilter';
import type { IFilterService, IFilesIndex } from '../types/typeContracts';
import { evalNode } from '../utils/filter-evaluator';
import { getActivePerfProbe } from '../dev/perfProbe';
import { PerfMeter } from './perfMeter';

/**
 * Manages the active filter tree and computes the filtered file set.
 * Uses Svelte 5 runes for reactive state; implements IFilterService.
 * Also retains the full legacy API for backward compatibility.
 */
export class FilterService implements IFilterService {
	activeFilter = $state<FilterGroup>({
		type: 'group',
		logic: 'and',
		children: [],
		id: 'root',
		enabled: true,
	});
	selectedFiles = $state<TFile[]>([]);
	filteredFiles = $derived.by(() => this.computeFiltered());

	private app: App;
	private filesIndex: IFilesIndex;
	private subs = new Set<() => void>();
	private indexUnsub: () => void;

	/** File name search applied alongside the filter tree */
	private _searchName = '';
	/** Folder path search applied alongside the filter tree */
	private _searchFolder = '';

	constructor(app: App, filesIndex: IFilesIndex) {
		this.app = app;
		this.filesIndex = filesIndex;
		this.indexUnsub = this.filesIndex.subscribe(() => this.fire());
	}

	private fire(): void {
		const probe = getActivePerfProbe();
		const run = () => {
			for (const cb of this.subs) cb();
		};
		if (probe) {
			probe.measure('filterService.fire', { filters: this.activeFilter.children.length }, run);
		} else {
			run();
		}
	}

	private computeFiltered(): TFile[] {
		const probe = getActivePerfProbe();
		return PerfMeter.time(
			'filter:eval',
			() =>
				probe?.measure(
					'filterService.computeFiltered',
					{
						files: this.filesIndex.nodes.length,
						filters: this.activeFilter.children.length,
					},
					() => this.computeFilteredInner(),
				) ?? this.computeFilteredInner(),
			'service',
		);
	}

	private computeFilteredInner(): TFile[] {
		const allFiles = this.filesIndex.nodes.map((n) => n.file);
		const getMeta = (file: TFile) => this.app.metadataCache.getFileCache(file);

		let base: TFile[];
		if (this.activeFilter.children.length === 0) {
			base = [...allFiles];
		} else {
			const matchingPaths = evalNode(this.activeFilter, allFiles, getMeta);
			base = allFiles.filter((f) => matchingPaths.has(f.path));
		}

		// Apply search filters (AND with filter tree result)
		if (this._searchName) {
			const term = this._searchName.toLowerCase();
			base = base.filter((f) => f.basename.toLowerCase().includes(term));
		}
		if (this._searchFolder) {
			const term = this._searchFolder.toLowerCase();
			base = base.filter((f) => (f.parent?.path ?? '').toLowerCase().includes(term));
		}

		return base.sort((a, b) =>
			a.basename.localeCompare(b.basename, undefined, { sensitivity: 'base' }),
		);
	}

	/** Set a new filter tree and recompute */
	setFilter(filter: FilterGroup): void {
		this.activeFilter = filter;
		this.fire();
	}

	/** Clear all filters (show all files) */
	clearFilters(): void {
		this.activeFilter = { type: 'group', logic: 'and', children: [], id: 'root', enabled: true };
		this._searchName = '';
		this._searchFolder = '';
		this.fire();
	}

	/**
	 * Alias for `clearFilters()` to match the gesture/command vocabulary
	 * used by the navbar double-click clear and the upcoming command
	 * palette entries. Keeps the legacy name available so existing
	 * callers keep working.
	 */
	clearAll(): void {
		this.clearFilters();
	}

	/** Add a child node to the root group (or a given parent) */
	addNode(node: FilterNode, parent?: FilterGroup): void {
		getActivePerfProbe()?.count('filterService.addNode', {
			filters: (parent ?? this.activeFilter).children.length + 1,
		});
		const target = parent ?? this.activeFilter;
		node.id = node.id ?? Math.random().toString(36).substring(2, 11);
		node.enabled = node.enabled ?? true;
		target.children.push(node);
		this.activeFilter = { ...this.activeFilter };
		this.fire();
	}

	/** Remove a node from its parent */
	removeNode(node: FilterNode, parent?: FilterGroup): void {
		const target = parent ?? this.activeFilter;
		const idx = target.children.indexOf(node);
		if (idx !== -1) {
			target.children.splice(idx, 1);
			this.activeFilter = { ...this.activeFilter };
			this.fire();
		}
	}

	/** Toggle-helper: remove rule matching property/optional value */
	removeNodeByProperty(propName: string, value?: string): void {
		const walkAndRemove = (group: FilterGroup): boolean => {
			const idx = group.children.findIndex((node) => {
				if (node.type === 'rule') {
					if (value !== undefined) {
						return (
							node.filterType === 'specific_value' &&
							node.property === propName &&
							node.values?.includes(value)
						);
					} else {
						return node.filterType === 'has_property' && node.property === propName;
					}
				}
				return false;
			});

			if (idx !== -1) {
				group.children.splice(idx, 1);
				return true;
			}

			for (const child of group.children) {
				if (child.type === 'group' && walkAndRemove(child)) return true;
			}
			return false;
		};

		if (walkAndRemove(this.activeFilter)) {
			this.activeFilter = { ...this.activeFilter };
			this.fire();
		}
	}

	/** Toggle-helper: remove rule matching tag value */
	removeNodeByTag(tagId: string): void {
		const walkAndRemove = (group: FilterGroup): boolean => {
			const idx = group.children.findIndex((node) => {
				return (
					node.type === 'rule' && node.filterType === 'has_tag' && node.values?.includes(tagId)
				);
			});

			if (idx !== -1) {
				group.children.splice(idx, 1);
				return true;
			}

			for (const child of group.children) {
				if (child.type === 'group' && walkAndRemove(child)) return true;
			}
			return false;
		};

		if (walkAndRemove(this.activeFilter)) {
			this.activeFilter = { ...this.activeFilter };
			this.fire();
		}
	}

	/** Set file name and folder search terms. Pass empty strings to clear. */
	setSearchFilter(name: string, folder: string): void {
		if (this._searchName === name && this._searchFolder === folder) return;
		this._searchName = name;
		this._searchFolder = folder;
		this.fire();
	}

	getSearchFilters(): { name: string; folder: string } {
		return { name: this._searchName, folder: this._searchFolder };
	}

	getSearchFilterRules(): FilterRule[] {
		const rules: FilterRule[] = [];
		if (this._searchName.trim()) {
			rules.push({
				type: 'rule',
				filterType: 'file_name',
				property: '',
				values: [this._searchName],
				id: 'search:file_name',
				enabled: true,
			});
		}
		if (this._searchFolder.trim()) {
			rules.push({
				type: 'rule',
				filterType: 'file_folder',
				property: '',
				values: [this._searchFolder],
				id: 'search:file_folder',
				enabled: true,
			});
		}
		return rules;
	}

	addIsInFolderFilter(folder: { path: string; name: string }): void {
		const path = folder.path.trim().replace(/^\/+|\/+$/g, '');
		if (!path) return;
		const id = `folder:${path}`;
		const existing = this.activeFilter.children.find(
			(node) => node.type === 'rule' && node.id === id,
		);
		if (existing) return;
		this.addNode({
			type: 'rule',
			filterType: 'folder',
			property: 'file.folder',
			values: [path],
			id,
			enabled: true,
		});
	}

	clearSearchFilter(kind: 'name' | 'folder' | 'all' = 'all'): void {
		const nextName = kind === 'folder' ? this._searchName : '';
		const nextFolder = kind === 'name' ? this._searchFolder : '';
		this.setSearchFilter(nextName, nextFolder);
	}

	/** Load a saved filter template */
	loadTemplate(template: FilterTemplate): void {
		this.activeFilter = JSON.parse(JSON.stringify(template.root)) as FilterGroup;
		// Ensure IDs/enabled exist on loaded nodes
		const ensureMeta = (node: FilterNode) => {
			node.id = node.id ?? Math.random().toString(36).substring(2, 11);
			node.enabled = node.enabled ?? true;
			if (node.type === 'group') {
				node.logic = normalizeGroupLogic(node.logic);
				node.children.forEach(ensureMeta);
			}
		};
		ensureMeta(this.activeFilter);
		this.fire();
	}

	/** Returns a flat list of rules (with descriptions) for the Island view */
	getFlatRules(): { id: string; description: string; enabled: boolean }[] {
		const rules: { id: string; description: string; enabled: boolean }[] = [];
		const walk = (node: FilterNode) => {
			if (node.type === 'rule') {
				let desc = '';
				switch (node.filterType) {
					case 'has_property':
						desc = `Has property: ${node.property}`;
						break;
					case 'missing_property':
						desc = `Missing property: ${node.property}`;
						break;
					case 'specific_value':
						desc = `${node.property} = ${node.values[0]}`;
						break;
					case 'has_tag':
						desc = `Has tag: ${node.values[0]}`;
						break;
					case 'file_name':
						desc = `Name contains: ${node.values[0]}`;
						break;
					case 'file_path':
						desc = `File: ${node.values[0]}`;
						break;
					case 'folder':
						desc = node.id?.startsWith('folder:')
							? `is in folder ${node.values[0]}`
							: `In folder: ${node.values[0]}`;
						break;
					case 'file_folder':
						desc = `Folder contains: ${node.values[0]}`;
						break;
					default:
						desc = `${node.filterType}: ${node.property}`;
				}
				rules.push({ id: node.id!, description: desc, enabled: node.enabled !== false });
			} else {
				node.children.forEach(walk);
			}
		};
		walk(this.activeFilter);
		return rules;
	}

	toggleFilterRule(id: string): void {
		const walk = (node: FilterNode): boolean => {
			if (node.id === id) {
				node.enabled = !node.enabled;
				return true;
			}
			if (node.type === 'group') {
				for (const child of node.children) {
					if (walk(child)) return true;
				}
			}
			return false;
		};
		if (walk(this.activeFilter)) {
			this.activeFilter = { ...this.activeFilter };
			this.fire();
		}
	}

	deleteFilterRule(id: string): void {
		const walk = (group: FilterGroup): boolean => {
			const idx = group.children.findIndex((c) => c.id === id);
			if (idx !== -1) {
				group.children.splice(idx, 1);
				return true;
			}
			for (const child of group.children) {
				if (child.type === 'group' && walk(child)) return true;
			}
			return false;
		};
		if (walk(this.activeFilter)) {
			this.activeFilter = { ...this.activeFilter };
			this.fire();
		}
	}

	/** Returns true if the tag is already in the active filter tree */
	hasTagFilter(tagName: string): boolean {
		const walk = (node: FilterNode): boolean => {
			if (node.type === 'rule' && node.filterType === 'has_tag' && Array.isArray(node.values)) {
				return node.values.includes(tagName);
			}
			if (node.type === 'group') {
				return node.children.some(walk);
			}
			return false;
		};
		return walk(this.activeFilter);
	}

	/** Returns true if the property is already in the active filter tree */
	hasPropFilter(propName: string): boolean {
		const walk = (node: FilterNode): boolean => {
			if (
				node.type === 'rule' &&
				node.filterType === 'has_property' &&
				node.property === propName
			) {
				return true;
			}
			if (node.type === 'group') {
				return node.children.some(walk);
			}
			return false;
		};
		return walk(this.activeFilter);
	}

	/** Returns true if a specific value is already in the active filter tree */
	hasValueFilter(propName: string, value: string): boolean {
		const walk = (node: FilterNode): boolean => {
			if (
				node.type === 'rule' &&
				node.filterType === 'specific_value' &&
				node.property === propName &&
				Array.isArray(node.values)
			) {
				return node.values.includes(value);
			}
			if (node.type === 'group') {
				return node.children.some(walk);
			}
			return false;
		};
		return walk(this.activeFilter);
	}

	setSelectedFiles(files: TFile[]): void {
		this.selectedFiles = files;
		this.fire();
	}

	setSelectedFileFilter(files: TFile[]): void {
		const selected = uniqueFiles(files);
		const currentSelectedGroup = this.activeFilter.children.find(
			(child) => child.type === 'group' && child.id === 'selected-files',
		);
		const currentPaths: string[] = [];
		if (currentSelectedGroup?.type === 'group') {
			for (const child of currentSelectedGroup.children) {
				if (child.type === 'rule' && child.filterType === 'file_path') {
					currentPaths.push(...(child.values ?? []));
				}
			}
		}
		const selectedPaths = selected.map((file) => file.path);
		const children = this.activeFilter.children.filter(
			(child) => !(child.type === 'group' && child.id === 'selected-files'),
		);

		if (selected.length > 0 && samePathSet(currentPaths, selectedPaths)) {
			this.selectedFiles = [];
			this.activeFilter = { ...this.activeFilter, children };
			this.fire();
			return;
		}

		if (selected.length > 0) {
			children.push({
				type: 'group',
				logic: 'or',
				id: 'selected-files',
				kind: 'selected_files',
				label: `${selected.length} selected file${selected.length === 1 ? '' : 's'}`,
				enabled: true,
				children: selected.map((file) => ({
					type: 'rule',
					filterType: 'file_path',
					property: '',
					values: [file.path],
					id: `selected-file:${file.path}`,
					enabled: true,
				})),
			});
		}
		this.selectedFiles = selected;
		this.activeFilter = { ...this.activeFilter, children };
		this.fire();
	}

	subscribe(cb: () => void): () => void {
		this.subs.add(cb);
		return () => this.subs.delete(cb);
	}

	/** Cleanup: unsubscribe from filesIndex and clear all subscribers */
	destroy(): void {
		this.indexUnsub();
		this.subs.clear();
	}
}

function uniqueFiles(files: TFile[]): TFile[] {
	const seen = new Set<string>();
	const out: TFile[] = [];
	for (const file of files) {
		if (seen.has(file.path)) continue;
		seen.add(file.path);
		out.push(file);
	}
	return out;
}

function samePathSet(left: string[], right: string[]): boolean {
	if (left.length !== right.length) return false;
	const set = new Set(left);
	return right.every((path) => set.has(path));
}
