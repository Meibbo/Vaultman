import { Component, Events, type App, type TFile } from 'obsidian';
import type { FilterGroup, FilterNode, FilterTemplate } from '../types/typeFilter';
import { evalNode } from '../utils/filter-evaluator';

/**
 * Manages the active filter tree and computes the filtered file set.
 *
 * Emits 'changed' when filtered results update.
 */
export class FilterService extends Component {
	private app: App;
	private events = new Events();

	/** The root of the active filter tree */
	activeFilter: FilterGroup = { type: 'group', logic: 'all', children: [], id: 'root', enabled: true };

	/** Files passing the active filter */
	filteredFiles: TFile[] = [];
	/** Files currently selected by the user in the file list (updated by FileListComponent) */
	selectedFiles: TFile[] = [];

	/** File name search applied alongside the filter tree */
	private _searchName = '';
	/** Folder path search applied alongside the filter tree */
	private _searchFolder = '';

	constructor(app: App) {
		super();
		this.app = app;
	}

	onload(): void {
		this.applyFilters();
	}

	on(name: 'changed', callback: () => void): void {
		this.events.on(name, callback);
	}

	off(name: 'changed', callback: () => void): void {
		this.events.off(name, callback);
	}

	/** Set a new filter tree and recompute */
	setFilter(filter: FilterGroup): void {
		this.activeFilter = filter;
		this.applyFilters();
	}

	/** Clear all filters (show all files) */
	clearFilters(): void {
		this.activeFilter = { type: 'group', logic: 'all', children: [], id: 'root', enabled: true };
		this.applyFilters();
	}

	/** Add a child node to the root group */
	addNode(node: FilterNode, parent?: FilterGroup): void {
		const target = parent ?? this.activeFilter;
		node.id = node.id ?? Math.random().toString(36).substring(2, 11);
		node.enabled = node.enabled ?? true;
		target.children.push(node);
		this.applyFilters();
	}

	/** Remove a node from its parent */
	removeNode(node: FilterNode, parent?: FilterGroup): void {
		const target = parent ?? this.activeFilter;
		const idx = target.children.indexOf(node);
		if (idx !== -1) {
			target.children.splice(idx, 1);
			this.applyFilters();
		}
	}

	/** Toggle-helper: remove rule matching property/optional value */
	removeNodeByProperty(propName: string, value?: string): void {
		const walkAndRemove = (group: FilterGroup): boolean => {
			const idx = group.children.findIndex(node => {
				if (node.type === 'rule') {
					if (value !== undefined) {
						return node.filterType === 'specific_value' && node.property === propName && node.values?.includes(value);
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
			this.applyFilters();
		}
	}

	/** Toggle-helper: remove rule matching tag value */
	removeNodeByTag(tagId: string): void {
		const walkAndRemove = (group: FilterGroup): boolean => {
			const idx = group.children.findIndex(node => {
				return node.type === 'rule' && node.filterType === 'has_tag' && node.values?.includes(tagId);
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
			this.applyFilters();
		}
	}

	/** Set file name and folder search terms. Pass empty strings to clear. */
	setSearchFilter(name: string, folder: string): void {
		this._searchName = name;
		this._searchFolder = folder;
		this.applyFilters();
	}

	/** Load a saved filter template */
	loadTemplate(template: FilterTemplate): void {
		this.activeFilter = JSON.parse(JSON.stringify(template.root)) as FilterGroup;
		// Ensure IDs/enabled exist on loaded nodes
		const ensureMeta = (node: FilterNode) => {
			node.id = node.id ?? Math.random().toString(36).substring(2, 11);
			node.enabled = node.enabled ?? true;
			if (node.type === 'group') node.children.forEach(ensureMeta);
		};
		ensureMeta(this.activeFilter);
		this.applyFilters();
	}

	/** Returns a flat list of rules (with descriptions) for the Island view */
	getFlatRules(): { id: string, description: string, enabled: boolean }[] {
		const rules: { id: string, description: string, enabled: boolean }[] = [];
		const walk = (node: FilterNode) => {
			if (node.type === 'rule') {
				let desc = '';
				switch (node.filterType) {
					case 'has_property': desc = `Has property: ${node.property}`; break;
					case 'missing_property': desc = `Missing property: ${node.property}`; break;
					case 'specific_value': desc = `${node.property} = ${node.values[0]}`; break;
					case 'has_tag': desc = `Has tag: ${node.values[0]}`; break;
					case 'file_name': desc = `Name contains: ${node.values[0]}`; break;
					case 'folder': desc = `In folder: ${node.values[0]}`; break;
					default: desc = `${node.filterType}: ${node.property}`;
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
		const walk = (node: FilterNode) => {
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
		if (walk(this.activeFilter)) this.applyFilters();
	}

	deleteFilterRule(id: string): void {
		const walk = (group: FilterGroup): boolean => {
			const idx = group.children.findIndex(c => c.id === id);
			if (idx !== -1) {
				group.children.splice(idx, 1);
				return true;
			}
			for (const child of group.children) {
				if (child.type === 'group' && walk(child)) return true;
			}
			return false;
		};
		if (walk(this.activeFilter)) this.applyFilters();
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
			if (node.type === 'rule' && node.filterType === 'has_property' && node.property === propName) {
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
			if (node.type === 'rule' && node.filterType === 'specific_value' && node.property === propName && Array.isArray(node.values)) {
				return node.values.includes(value);
			}
			if (node.type === 'group') {
				return node.children.some(walk);
			}
			return false;
		};
		return walk(this.activeFilter);
	}

	/** Recompute filtered files from the active filter tree + search fields */
	applyFilters(): void {
		const allFiles = this.app.vault.getMarkdownFiles();

		let base: TFile[];
		if (this.activeFilter.children.length === 0) {
			base = [...allFiles];
		} else {
			const getMeta = (file: TFile) =>
				this.app.metadataCache.getFileCache(file);
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
			base = base.filter((f) =>
				(f.parent?.path ?? '').toLowerCase().includes(term)
			);
		}

		this.filteredFiles = base.sort((a, b) =>
			a.basename.localeCompare(b.basename, undefined, { sensitivity: 'base' })
		);

		this.events.trigger('changed');
	}
}
