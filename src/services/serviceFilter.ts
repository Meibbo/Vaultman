import { Component, Events, type App, type TFile } from 'obsidian';
import type {
	FilterGroup,
	FilterNode,
	FilterRule,
	FilterTemplate,
} from '../types/typeFilter';
import { evalNode } from '../utils/filter-evaluator';
import { vaultmanPerfMonitor } from '../utils/performanceMonitor';

type FileSearchRuleType = 'file_name' | 'file_folder';

const FILE_SEARCH_RULE_IDS: Record<FileSearchRuleType, string> = {
	file_name: 'vaultman-search-file-name',
	file_folder: 'vaultman-search-file-folder',
};
const CONTENT_SEARCH_RULE_ID = 'vaultman-search-content';

/**
 * Manages the active filter tree and computes the filtered file set.
 *
 * Emits 'changed' when filtered results update.
 */
export class FilterService extends Component {
	private app: App;
	private events = new Events();

	/** The root of the active filter tree */
	activeFilter: FilterGroup = {
		type: 'group',
		logic: 'all',
		children: [],
		id: 'root',
		enabled: true,
	};

	/** Files passing the active filter */
	filteredFiles: TFile[] = [];
	/** Vault files passing the active filter, including non-markdown files */
	filteredVaultFiles: TFile[] = [];
	/** Files currently selected by the user in the file list (updated by FileListComponent) */
	selectedFiles: TFile[] = [];

	/** File name search applied alongside the filter tree */
	private _searchName = '';
	/** Folder path search applied alongside the filter tree */
	private _searchFolder = '';
	private readonly collator = new Intl.Collator(undefined, {
		numeric: true,
		sensitivity: 'base',
	});
	private readonly sortedFilesCache = new Map<
		string,
		{ signature: string; files: TFile[] }
	>();
	private contentSearchPaths: Set<string> | null = null;
	private sortCacheRevision = 0;
	private stateSignature = '';

	constructor(app: App) {
		super();
		this.app = app;
	}

	onload(): void {
		const clearSortCache = () => {
			this.sortCacheRevision += 1;
			this.sortedFilesCache.clear();
		};
		this.registerEvent(this.app.vault.on('create', clearSortCache));
		this.registerEvent(this.app.vault.on('delete', clearSortCache));
		this.registerEvent(this.app.vault.on('modify', clearSortCache));
		this.registerEvent(this.app.vault.on('rename', clearSortCache));
		this.applyFilters();
	}

	on(name: 'changed', callback: () => void): void {
		this.events.on(name, callback);
	}

	off(name: 'changed', callback: () => void): void {
		this.events.off(name, callback);
	}

	setSelectedFiles(files: TFile[]): void {
		this.selectedFiles = [...files];
		this.events.trigger('changed');
	}

	activeFolderFilterPaths(filter: FilterGroup = this.activeFilter): string[] {
		const paths = new Set<string>();
		const walk = (node: FilterNode): void => {
			if (node.enabled === false) return;
			if (node.type === 'rule') {
				if (node.filterType === 'folder') {
					for (const value of node.values) {
						const normalized = value.trim().replace(/^\/|\/$/g, '');
						if (normalized) paths.add(normalized);
					}
				}
				return;
			}
			node.children.forEach(walk);
		};
		walk(filter);
		return Array.from(paths);
	}

	filteredVaultFilesForFolderScopes(folderPaths: string[]): TFile[] {
		const normalizedPaths = normalizeFolderScopePaths(folderPaths);
		if (normalizedPaths.length === 0) return [...this.filteredVaultFiles];
		const vaultFiles = this.app.vault.getFiles();
		const nonFolderFilter = this.filterWithoutFolderRules();
		const metadataMatches =
			nonFolderFilter.children.length > 0
				? this.applyActiveTree(vaultFiles, nonFolderFilter)
				: vaultFiles;
		return this.sortFiles(
			this.applyLegacySearch(
				this.applyContentSearch(metadataMatches).filter((file) =>
					fileMatchesFolderScopes(file, normalizedPaths),
				),
			),
		);
	}

	/** Set a new filter tree and recompute */
	setFilter(filter: FilterGroup): void {
		this.activeFilter = filter;
		this.applyFilters();
	}

	/** Clear all filters (show all files) */
	clearFilters(): void {
		this.activeFilter = {
			type: 'group',
			logic: 'all',
			children: [],
			id: 'root',
			enabled: true,
		};
		this._searchName = '';
		this._searchFolder = '';
		this.contentSearchPaths = null;
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
			const idx = group.children.findIndex((node) => {
				if (node.type === 'rule') {
					if (value !== undefined) {
						return (
							node.filterType === 'specific_value' &&
							node.property === propName &&
							node.values?.includes(value)
						);
					} else {
						return (
							node.filterType === 'has_property' && node.property === propName
						);
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
			const idx = group.children.findIndex((node) => {
				return (
					node.type === 'rule' &&
					node.filterType === 'has_tag' &&
					node.values?.includes(tagId)
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
			this.applyFilters();
		}
	}

	/** Set file name and folder search terms. Pass empty strings to clear. */
	setSearchFilter(name: string, folder: string): void {
		this._searchName = name;
		this._searchFolder = folder;
		this.applyFilters();
	}

	/**
	 * Upsert the Files explorer search as a visible root filter rule.
	 *
	 * Files search reduces the Files result set, so it belongs in active filters
	 * instead of remaining a hidden local panel constraint.
	 */
	setFileSearchRule(kind: FileSearchRuleType, value: string): void {
		const term = value.trim();
		let changed = false;

		for (const id of Object.values(FILE_SEARCH_RULE_IDS)) {
			if (!term || id !== FILE_SEARCH_RULE_IDS[kind]) {
				changed = this.removeRootRuleById(id) || changed;
			}
		}

		if (term) {
			const id = FILE_SEARCH_RULE_IDS[kind];
			const existing = this.findRootRuleById(id);
			if (existing) {
				if (
					existing.filterType !== kind ||
					existing.values[0] !== term ||
					existing.enabled === false
				) {
					existing.filterType = kind;
					existing.property = '';
					existing.values = [term];
					existing.enabled = true;
					changed = true;
				}
			} else {
				this.activeFilter.children.push({
					type: 'rule',
					filterType: kind,
					property: '',
					values: [term],
					id,
					enabled: true,
				});
				changed = true;
			}
		}

		if (changed) this.applyFilters();
	}

	/**
	 * Upsert the Content tab search as an active root filter without making
	 * applyFilters read file contents. The expensive search runs in the Content
	 * tab; this service only intersects with the matched file paths.
	 */
	setContentSearchPending(value: string): void {
		const term = value.trim();
		let changed = false;

		if (!term) {
			this.setContentSearchRule('', []);
			return;
		}

		if (this.contentSearchPaths !== null) {
			this.contentSearchPaths = null;
			changed = true;
		}

		changed = this.upsertContentSearchRootRule(term) || changed;
		if (changed) this.applyFilters();
	}

	setContentSearchRule(value: string, files: TFile[]): void {
		const term = value.trim();
		let changed = false;

		if (!term) {
			this.contentSearchPaths = null;
			changed = this.removeRootRuleById(CONTENT_SEARCH_RULE_ID) || changed;
			if (changed) this.applyFilters();
			return;
		}

		const nextPaths = new Set(files.map((file) => file.path));
		if (!this.samePathSet(this.contentSearchPaths, nextPaths)) {
			this.contentSearchPaths = nextPaths;
			changed = true;
		}

		changed = this.upsertContentSearchRootRule(term) || changed;
		if (changed) this.applyFilters();
	}

	getFilesIgnoringContentSearch(vaultWide = false): TFile[] {
		const files = vaultWide
			? this.app.vault.getFiles()
			: this.app.vault.getMarkdownFiles();
		const filter = this.filterWithoutContentSearch();
		const hasTreeFilters = filter.children.length > 0;
		const matches = this.applyLegacySearch(
			hasTreeFilters ? this.applyActiveTree(files, filter) : files,
		);
		return this.sortFiles(matches);
	}

	getContentSearchScopeSignature(): string {
		return JSON.stringify({
			searchName: this._searchName,
			searchFolder: this._searchFolder,
			activeFilter: this.filterWithoutContentSearch(),
		});
	}

	/** Load a saved filter template */
	loadTemplate(template: FilterTemplate): void {
		this.activeFilter = JSON.parse(
			JSON.stringify(template.root),
		) as FilterGroup;
		// Ensure IDs/enabled exist on loaded nodes
		const ensureMeta = (node: FilterNode) => {
			node.id = node.id ?? Math.random().toString(36).substring(2, 11);
			node.enabled = node.enabled ?? true;
			if (node.type === 'group') node.children.forEach(ensureMeta);
		};
		ensureMeta(this.activeFilter);
		this.applyFilters();
	}

	/** Returns a flat list of active filter rules for compact UI surfaces. */
	getFlatRules(): {
		id: string;
		rule: string;
		label: string;
		description: string;
		warning?: string;
		enabled: boolean;
	}[] {
		const rules: {
			id: string;
			rule: string;
			label: string;
			description: string;
			warning?: string;
			enabled: boolean;
		}[] = [];
		const walk = (node: FilterNode) => {
			if (node.type === 'rule') {
				let rule = '';
				let label = '';
				let warning: string | undefined;
				switch (node.filterType) {
					case 'has_property':
						rule = 'Has property';
						label = node.property;
						break;
					case 'missing_property':
						rule = 'Missing property';
						label = node.property;
						break;
					case 'specific_value':
						rule = node.property;
						label = node.values[0] ?? '';
						break;
					case 'has_tag':
						rule = 'Has tag';
						label = node.values[0] ?? '';
						break;
					case 'file_name': {
						const extension = extensionFilterLabel(node.values[0] ?? '');
						if (extension) {
							rule = 'With extension';
							label = extension;
						} else {
							rule = 'Name contains';
							label = node.values[0] ?? '';
						}
						break;
					}
					case 'file_name_exclude':
						rule = 'Name excludes';
						label = node.values[0] ?? '';
						break;
					case 'file_folder':
						rule = 'Folder path contains';
						label = node.values[0] ?? '';
						warning = this.warningForFolderRule();
						break;
					case 'content_search':
						rule = 'Content contains';
						label = node.values[0] ?? '';
						break;
					case 'folder':
						rule = 'In folder';
						label = node.values[0] ?? '';
						warning = this.warningForFolderRule();
						break;
					case 'folder_exclude':
						rule = 'Exclude folder';
						label = node.values[0] ?? '';
						warning = this.warningForFolderRule();
						break;
					default:
						rule = node.filterType;
						label = node.property || (node.values[0] ?? '');
				}
				rules.push({
					id: node.id!,
					rule,
					label,
					description: label ? `${rule}: ${label}` : rule,
					...(warning ? { warning } : {}),
					enabled: node.enabled !== false,
				});
			} else {
				node.children.forEach(walk);
			}
		};
		walk(this.activeFilter);
		return rules;
	}

	private warningForFolderRule(): string | undefined {
		if (this.filteredFiles.length > 0) return undefined;
		if (this.filteredVaultFiles.length > 0) {
			return 'This folder filter matches only non-note files; note-scoped views show 0 files.';
		}
		return 'No files match this folder filter.';
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
			if (id === CONTENT_SEARCH_RULE_ID) this.contentSearchPaths = null;
			this.applyFilters();
		}
	}

	/** Returns true if the tag is already in the active filter tree */
	hasTagFilter(tagName: string): boolean {
		const walk = (node: FilterNode): boolean => {
			if (
				node.type === 'rule' &&
				node.filterType === 'has_tag' &&
				Array.isArray(node.values)
			) {
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

	/** Recompute filtered files from the active filter tree + search fields */
	applyFilters(): void {
		vaultmanPerfMonitor.measure(
			'filter.applyFilters',
			() => {
				const markdownFiles = this.app.vault.getMarkdownFiles();
				const vaultFiles = this.app.vault.getFiles();
				const metadataFilter = this.filterWithoutContentSearch();
				const hasTreeFilters =
					metadataFilter.children.length > 0 ||
					this.hasEnabledContentSearchRule();
				const hasLegacySearch = !!(this._searchName || this._searchFolder);

				const markdownMatches = this.applyLegacySearch(
					this.applyContentSearch(
						metadataFilter.children.length > 0
							? this.applyActiveTree(markdownFiles, metadataFilter)
							: markdownFiles,
					),
				);
				const vaultMatches = this.applyLegacySearch(
					this.applyContentSearch(
						metadataFilter.children.length > 0
							? this.applyActiveTree(vaultFiles, metadataFilter)
							: vaultFiles,
					),
				);

				const nextFilteredFiles =
					hasTreeFilters || hasLegacySearch
						? this.sortFiles(markdownMatches)
						: this.sortFiles(markdownMatches, 'all-markdown');
				const nextFilteredVaultFiles =
					hasTreeFilters || hasLegacySearch
						? this.sortFiles(vaultMatches)
						: this.sortFiles(vaultMatches, 'all-vault');

				const nextStateSignature = this.filterStateSignature();
				const resultsChanged =
					!this.sameFileList(this.filteredFiles, nextFilteredFiles) ||
					!this.sameFileList(this.filteredVaultFiles, nextFilteredVaultFiles);
				const stateChanged = nextStateSignature !== this.stateSignature;
				this.filteredFiles = nextFilteredFiles;
				this.filteredVaultFiles = nextFilteredVaultFiles;
				this.stateSignature = nextStateSignature;
				if (resultsChanged || stateChanged) this.events.trigger('changed');
			},
			{
				rules: this.activeFilter.children.length,
				searchName: this._searchName.length,
				searchFolder: this._searchFolder.length,
			},
		);
	}

	private applyActiveTree(
		files: TFile[],
		filter: FilterGroup = this.activeFilter,
	): TFile[] {
		if (filter.children.length === 0) return [...files];
		const getMeta = (file: TFile) => this.app.metadataCache.getFileCache(file);
		const matchingPaths = evalNode(filter, files, getMeta);
		return files.filter((f) => matchingPaths.has(f.path));
	}

	private applyContentSearch(files: TFile[]): TFile[] {
		if (!this.hasEnabledContentSearchRule()) return files;
		if (this.contentSearchPaths === null) return files;
		const paths = this.contentSearchPaths;
		return files.filter((file) => paths.has(file.path));
	}

	private applyLegacySearch(files: TFile[]): TFile[] {
		let base = files;
		if (this._searchName) {
			const term = this._searchName.toLowerCase();
			base = base.filter((f) => this.matchesFileName(f, term));
		}
		if (this._searchFolder) {
			const term = this._searchFolder.toLowerCase();
			base = base.filter((f) =>
				(f.parent?.path ?? '').toLowerCase().includes(term),
			);
		}
		return base;
	}

	private matchesFileName(file: TFile, lowerTerm: string): boolean {
		return [file.basename, file.name, file.path].some((candidate) =>
			candidate.toLowerCase().includes(lowerTerm),
		);
	}

	private sortFiles(files: TFile[], cacheKey?: string): TFile[] {
		if (!cacheKey) {
			return [...files].sort((a, b) =>
				this.collator.compare(a.basename, b.basename),
			);
		}

		const signature = `${this.sortCacheRevision}:${files.length}`;
		const cached = this.sortedFilesCache.get(cacheKey);
		if (cached?.signature === signature) return [...cached.files];

		const sorted = [...files].sort((a, b) =>
			this.collator.compare(a.basename, b.basename),
		);
		this.sortedFilesCache.set(cacheKey, { signature, files: sorted });
		return [...sorted];
	}

	private sameFileList(left: TFile[], right: TFile[]): boolean {
		if (left.length !== right.length) return false;
		for (let index = 0; index < left.length; index += 1) {
			if (left[index] !== right[index]) return false;
		}
		return true;
	}

	private filterStateSignature(): string {
		return JSON.stringify({
			searchName: this._searchName,
			searchFolder: this._searchFolder,
			activeFilter: this.activeFilter,
			contentSearchPaths: this.contentSearchPaths
				? Array.from(this.contentSearchPaths).sort()
				: null,
		});
	}

	private filterWithoutContentSearch(): FilterGroup {
		return {
			...this.activeFilter,
			children: this.activeFilter.children.filter(
				(node) => node.id !== CONTENT_SEARCH_RULE_ID,
			),
		};
	}

	private filterWithoutFolderRules(
		filter: FilterGroup = this.filterWithoutContentSearch(),
	): FilterGroup {
		return {
			...filter,
			children: filter.children
				.map((node): FilterNode | null => {
					if (node.type === 'rule') {
						return node.filterType === 'folder' ? null : node;
					}
					return this.filterWithoutFolderRules(node);
				})
				.filter((node): node is FilterNode => node !== null),
		};
	}

	hasEnabledContentSearchRule(): boolean {
		const rule = this.findRootRuleById(CONTENT_SEARCH_RULE_ID);
		return rule?.filterType === 'content_search' && rule.enabled !== false;
	}

	private samePathSet(
		left: Set<string> | null,
		right: Set<string> | null,
	): boolean {
		if (left === right) return true;
		if (!left || !right) return false;
		if (left.size !== right.size) return false;
		for (const path of left) {
			if (!right.has(path)) return false;
		}
		return true;
	}

	private findRootRuleById(id: string): FilterRule | undefined {
		return this.activeFilter.children.find(
			(node): node is FilterRule => node.type === 'rule' && node.id === id,
		);
	}

	private upsertContentSearchRootRule(term: string): boolean {
		const existing = this.findRootRuleById(CONTENT_SEARCH_RULE_ID);
		if (existing) {
			if (
				existing.filterType === 'content_search' &&
				existing.values[0] === term &&
				existing.enabled !== false
			) {
				return false;
			}
			existing.filterType = 'content_search';
			existing.property = '';
			existing.values = [term];
			existing.enabled = true;
			return true;
		}

		this.activeFilter.children.push({
			type: 'rule',
			filterType: 'content_search',
			property: '',
			values: [term],
			id: CONTENT_SEARCH_RULE_ID,
			enabled: true,
		});
		return true;
	}

	private removeRootRuleById(id: string): boolean {
		const idx = this.activeFilter.children.findIndex(
			(node) => node.type === 'rule' && node.id === id,
		);
		if (idx === -1) return false;
		this.activeFilter.children.splice(idx, 1);
		return true;
	}
}

function normalizeFolderScopePaths(folderPaths: string[]): string[] {
	return Array.from(
		new Set(
			folderPaths
				.map((path) => path.trim().replace(/^\/|\/$/g, ''))
				.filter((path) => path.length > 0),
		),
	).sort((a, b) => b.length - a.length);
}

function fileMatchesFolderScopes(file: TFile, folderPaths: string[]): boolean {
	const folderPath = (file.parent?.path ?? '').replace(/^\/|\/$/g, '');
	return folderPaths.some(
		(path) => folderPath === path || folderPath.startsWith(`${path}/`),
	);
}

function extensionFilterLabel(value: string): string | null {
	const match = value.trim().match(/^\.([a-z0-9][a-z0-9_-]*)$/i);
	return match?.[1]?.toLowerCase() ?? null;
}
