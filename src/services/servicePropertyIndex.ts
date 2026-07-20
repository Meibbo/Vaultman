import { Component, type App, type TAbstractFile, type CachedMetadata } from 'obsidian';

/**
 * Builds and maintains a live index of all frontmatter property names
 * and their observed values across the vault.
 *
 * Replaces Python's CacheManager + available_properties dictionary.
 * Uses Obsidian's metadataCache instead of a pickle file.
 */
export class PropertyIndexService extends Component {
	/** property name → set of observed string values */
	readonly index: Map<string, Set<string>> = new Map();

	/** Total files scanned */
	fileCount = 0;

	private app: App;

	/** Per-file property/value contributions for incremental replacement. */
	private fileProperties: Map<string, Map<string, Set<string>>> = new Map();
	private propertyReferenceCounts: Map<string, number> = new Map();
	private valueReferenceCounts: Map<string, Map<string, number>> = new Map();

	/** Debounce timer for batching metadata changes */
	private metadataTimer: number | null = null;
	private pendingFiles: Set<string> = new Set();
	private readonly METADATA_DEBOUNCE_MS = 50;
	private hasHandledInitialResolve = false;

	constructor(app: App) {
		super();
		this.app = app;
	}

	onload(): void {
		this.hasHandledInitialResolve = false;
		// Build index immediately (cache may already be resolved)
		this.rebuild();

		// Rebuild again when the metadata cache finishes resolving
		// (handles large vaults where cache isn't ready during onload)
		this.registerEvent(
			this.app.metadataCache.on('resolved', () => {
				if (this.hasHandledInitialResolve) return;
				this.hasHandledInitialResolve = true;
				this.rebuild();
			})
		);

		// Live update on metadata changes (debounced)
		this.registerEvent(
			this.app.metadataCache.on('changed', (file) => {
				this.pendingFiles.add(file.path);
				this.scheduleFlush();
			})
		);

		// Incremental removal on file delete
		this.registerEvent(
			this.app.vault.on('delete', (file: TAbstractFile) => {
				this.removeFile(file.path);
			})
		);

		// Track new files for fileCount
		this.registerEvent(
			this.app.vault.on('create', () => {
				this.fileCount = this.app.vault.getMarkdownFiles().length;
			})
		);

		this.registerEvent(
			this.app.vault.on(
				'rename',
				(file: TAbstractFile, oldPath: string) => {
					this.renameFile(file, oldPath);
				},
			),
		);
	}

	onunload(): void {
		if (this.metadataTimer) {
			window.clearTimeout(this.metadataTimer);
			this.metadataTimer = null;
		}
	}

	/** Full rebuild from all markdown files */
	rebuild(): void {
		this.index.clear();
		this.fileProperties.clear();
		this.propertyReferenceCounts.clear();
		this.valueReferenceCounts.clear();
		const files = this.app.vault.getMarkdownFiles();
		this.fileCount = files.length;

		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			this.indexFile(file.path, cache);
		}
	}

	/** Get sorted property names for autocomplete */
	getPropertyNames(): string[] {
		return [...this.index.keys()].sort((a, b) =>
			a.localeCompare(b, undefined, { sensitivity: 'base' })
		);
	}

	/** Get sorted values for a given property */
	getPropertyValues(property: string): string[] {
		const values = this.index.get(property);
		if (!values) return [];
		return [...values].sort((a, b) =>
			a.localeCompare(b, undefined, { sensitivity: 'base' })
		);
	}

	/** Schedule a debounced flush of pending metadata updates */
	private scheduleFlush(): void {
		if (this.metadataTimer) return;
		this.metadataTimer = window.setTimeout(() => {
			this.metadataTimer = null;
			this.flushPending();
		}, this.METADATA_DEBOUNCE_MS);
	}

	/** Process all pending metadata changes in one batch */
	private flushPending(): void {
		for (const path of this.pendingFiles) {
			const file = this.app.vault.getFileByPath(path);
			if (file) {
				const cache = this.app.metadataCache.getFileCache(file);
				this.indexFile(path, cache);
			}
		}
		this.pendingFiles.clear();
	}

	/** Index a single file's frontmatter, replacing any previous contribution */
	private indexFile(path: string, cache: CachedMetadata | null): void {
		this.removeFileContributions(path);
		const props = new Map<string, Set<string>>();
		this.fileProperties.set(path, props);

		const fm = cache?.frontmatter;
		if (!fm) return;

		for (const [key, value] of Object.entries(fm)) {
			if (key === 'position') continue;

			const contributedValues = new Set<string>();
			this.addValues(contributedValues, value);
			props.set(key, contributedValues);
			this.propertyReferenceCounts.set(
				key,
				(this.propertyReferenceCounts.get(key) ?? 0) + 1,
			);
			if (!this.index.has(key)) {
				this.index.set(key, new Set());
			}
			if (!this.valueReferenceCounts.has(key)) {
				this.valueReferenceCounts.set(key, new Map());
			}
			const values = this.index.get(key)!;
			const referenceCounts = this.valueReferenceCounts.get(key)!;
			for (const contributedValue of contributedValues) {
				values.add(contributedValue);
				referenceCounts.set(
					contributedValue,
					(referenceCounts.get(contributedValue) ?? 0) + 1,
				);
			}
		}
	}

	/** Remove a file's contributions from the index */
	private removeFile(path: string): void {
		if (!this.removeFileContributions(path)) return;
		this.fileCount = Math.max(0, this.fileCount - 1);
	}

	private renameFile(file: TAbstractFile, oldPath: string): void {
		if (!this.removeFileContributions(oldPath)) return;
		const renamedFile = this.app.vault.getFileByPath(file.path);
		if (!renamedFile) return;
		this.indexFile(
			renamedFile.path,
			this.app.metadataCache.getFileCache(renamedFile),
		);
	}

	private removeFileContributions(path: string): boolean {
		const properties = this.fileProperties.get(path);
		if (!properties) return false;
		this.fileProperties.delete(path);

		for (const [property, values] of properties) {
			const propertyReferences =
				(this.propertyReferenceCounts.get(property) ?? 0) - 1;
			if (propertyReferences <= 0) {
				this.propertyReferenceCounts.delete(property);
				this.valueReferenceCounts.delete(property);
				this.index.delete(property);
				continue;
			}
			this.propertyReferenceCounts.set(property, propertyReferences);

			const referenceCounts = this.valueReferenceCounts.get(property);
			const indexedValues = this.index.get(property);
			for (const value of values) {
				const references = (referenceCounts?.get(value) ?? 0) - 1;
				if (references <= 0) {
					referenceCounts?.delete(value);
					indexedValues?.delete(value);
				} else {
					referenceCounts?.set(value, references);
				}
			}
			if (referenceCounts?.size === 0) {
				this.valueReferenceCounts.delete(property);
			}
		}
		return true;
	}

	private addValues(target: Set<string>, value: unknown): void {
		if (value == null) return;
		if (Array.isArray(value)) {
			for (const v of value) {
				this.addIndexValue(target, v);
			}
			return;
		}
		this.addIndexValue(target, value);
	}

	private addIndexValue(target: Set<string>, value: unknown): void {
		if (value == null) return;
		if (typeof value === 'string') {
			target.add(value);
			return;
		}
		if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
			target.add(String(value));
			return;
		}
		if (typeof value === 'symbol') {
			target.add(value.description ?? value.toString());
			return;
		}
		if (typeof value === 'function') {
			target.add(value.name);
			return;
		}
		const serialized = JSON.stringify(value);
		if (serialized) target.add(serialized);
	}
}
