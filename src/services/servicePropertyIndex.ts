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

	/** Per-file property tracking for incremental removal */
	private fileProperties: Map<string, Set<string>> = new Map();

	/** Debounce timer for batching metadata changes */
	private metadataTimer: number | null = null;
	private pendingFiles: Set<string> = new Set();
	private readonly METADATA_DEBOUNCE_MS = 50;

	constructor(app: App) {
		super();
		this.app = app;
	}

	onload(): void {
		// Build index immediately (cache may already be resolved)
		this.rebuild();

		// Rebuild again when the metadata cache finishes resolving
		// (handles large vaults where cache isn't ready during onload)
		this.registerEvent(
			this.app.metadataCache.on('resolved', () => {
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
		// Track which properties this file contributes
		const props = new Set<string>();
		this.fileProperties.set(path, props);

		const fm = cache?.frontmatter;
		if (!fm) return;

		for (const [key, value] of Object.entries(fm)) {
			if (key === 'position') continue;

			props.add(key);
			if (!this.index.has(key)) {
				this.index.set(key, new Set());
			}
			const values = this.index.get(key)!;
			this.addValues(values, value);
		}
	}

	/** Remove a file's contributions from the index */
	private removeFile(path: string): void {
		this.fileProperties.delete(path);
		this.fileCount = Math.max(0, this.fileCount - 1);
		// Note: we don't remove values from the index since other files may
		// contribute the same values. The index grows monotonically between
		// full rebuilds, which is acceptable for autocomplete/suggestion use.
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
