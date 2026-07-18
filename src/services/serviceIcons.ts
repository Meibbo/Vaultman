import { Component, type App } from 'obsidian';

interface IconEntry {
	icon?: string | null;
	color?: string | null;
}

interface IconicData {
	fileIcons?: Record<string, IconEntry>;
	propertyIcons?: Record<string, IconEntry>;
	tagIcons?: Record<string, IconEntry>;
}

interface IconicRuntimeItem extends IconEntry {
	id?: string;
	name?: string;
	category?: string;
	iconDefault?: string | null;
	items?: IconicRuntimeItem[] | null;
}

interface IconicRuntimePlugin {
	getFileItem?: (path: string) => IconicRuntimeItem | null;
	getPropertyItem?: (name: string) => IconicRuntimeItem | null;
	getTagItem?: (path: string) => IconicRuntimeItem | null;
	openIconPicker?: (
		item: IconicRuntimeItem,
		callback: (icon: string | null, color: string | null) => void,
	) => unknown;
	savePropertyIcon?: (
		item: IconicRuntimeItem,
		icon: string | null,
		color: string | null,
	) => unknown;
	saveTagIcon?: (
		item: IconicRuntimeItem,
		icon: string | null,
		color: string | null,
	) => unknown;
	refreshManagers?: (...kinds: Array<'property' | 'tag'>) => unknown;
	ruleManager?: {
		checkRuling?: (
			kind: 'file' | 'folder',
			path: string,
		) => IconicRuntimeItem | null;
	};
}

interface ExtendedApp extends App {
	plugins?: {
		plugins?: Record<string, unknown>;
	};
}

export interface IconicResolvedIcon {
	icon?: string;
	color?: string;
}

export class IconicService extends Component {
	private app: App;
	private fileIcons = new Map<string, IconEntry>();
	private propertyIcons = new Map<string, IconEntry>();
	private tagIcons = new Map<string, IconEntry>();
	private loaded = false;
	private enabled: boolean;
	private _onLoadedCallbacks: Array<() => void> = [];
	private _onChangedCallbacks = new Set<() => void>();

	constructor(app: App, enabled = true) {
		super();
		this.app = app;
		this.enabled = enabled;
	}

	onload(): void {
		void this.loadIcons();
	}

	/** Register a callback to fire once after icons are loaded. Fires immediately if already loaded. */
	onLoaded(cb: () => void): () => void {
		if (this.loaded) {
			cb();
			return () => {};
		}
		this._onLoadedCallbacks.push(cb);
		return () => {
			this._onLoadedCallbacks = this._onLoadedCallbacks.filter(
				(pending) => pending !== cb,
			);
		};
	}

	/** One resolution per icon per render burst: explorer renders ask per node
	 * and Iconic's runtime may evaluate rules per query, which froze large
	 * vaults (BT4-002). The memo self-clears on the next macrotask so live
	 * Iconic edits still surface. */
	private _burstCache = new Map<string, IconicResolvedIcon | null>();
	private _burstClearScheduled = false;

	private _burstMemo(
		key: string,
		resolve: () => IconicResolvedIcon | null,
	): IconicResolvedIcon | null {
		const cached = this._burstCache.get(key);
		if (cached !== undefined || this._burstCache.has(key)) return cached ?? null;
		const value = resolve();
		this._burstCache.set(key, value);
		if (!this._burstClearScheduled) {
			this._burstClearScheduled = true;
			setTimeout(() => {
				this._burstCache.clear();
				this._burstClearScheduled = false;
			}, 0);
		}
		return value;
	}

	/** Subscribe to live Iconic changes exposed through this adapter. */
	onChanged(cb: () => void): () => void {
		this._onChangedCallbacks.add(cb);
		return () => this._onChangedCallbacks.delete(cb);
	}

	private async loadIcons(): Promise<void> {
		try {
			const path = `${this.app.vault.configDir}/plugins/iconic/data.json`;
			const raw = await this.app.vault.adapter.read(path);
			const data = JSON.parse(raw) as IconicData;
			this.fileIcons.clear();
			this.propertyIcons.clear();
			this.tagIcons.clear();
			if (data.fileIcons) {
				for (const [path, entry] of Object.entries(data.fileIcons)) {
					this.fileIcons.set(path, entry);
				}
			}
			if (data.propertyIcons) {
				for (const [name, entry] of Object.entries(data.propertyIcons)) {
					this.propertyIcons.set(name, entry);
				}
			}
			if (data.tagIcons) {
				for (const [name, entry] of Object.entries(data.tagIcons)) {
					this.tagIcons.set(name, entry);
				}
			}
			this.loaded = true;
		} catch {
			this.loaded = false;
		} finally {
			// Notify all waiting panels regardless of success/failure
			for (const cb of this._onLoadedCallbacks) cb();
			this._onLoadedCallbacks = [];
		}
	}

	/** Get custom icon for a property name. Returns null if not set. */
	getIcon(propName: string): IconicResolvedIcon | null {
		if (!this.enabled) return null;
		return this._burstMemo(`prop:${propName}`, () => {
			const runtime = this.runtimePlugin();
			if (runtime?.getPropertyItem) {
				try {
					const resolved = this.normalizedIcon(
						runtime.getPropertyItem(propName),
					);
					if (resolved) return resolved;
				} catch {
					// Runtime APIs are optional/private; persisted data remains the fallback.
				}
			}
			return this.normalizedIcon(this.propertyIcons.get(propName));
		});
	}

	/** Get custom icon for a tag path (without #). Returns null if not set. */
	getTagIcon(tagPath: string): IconicResolvedIcon | null {
		if (!this.enabled) return null;
		return this._burstMemo(`tag:${tagPath}`, () => {
			const runtime = this.runtimePlugin();
			if (runtime?.getTagItem) {
				try {
					const resolved = this.normalizedIcon(
						this.runtimeTagItem(runtime, tagPath),
					);
					if (resolved) return resolved;
				} catch {
					// Runtime APIs are optional/private; persisted data remains the fallback.
				}
			}
			return this.normalizedIcon(
				this.tagIcons.get(tagPath) ?? this.tagIcons.get(`#${tagPath}`),
			);
		});
	}

	setEnabled(enabled: boolean): void {
		if (this.enabled === enabled) return;
		this.enabled = enabled;
		this.notifyChanged();
	}

	canChangePropertyIcon(): boolean {
		const runtime = this.runtimePlugin();
		return (
			this.enabled &&
			typeof runtime?.getPropertyItem === 'function' &&
			typeof runtime.openIconPicker === 'function' &&
			typeof runtime.savePropertyIcon === 'function'
		);
	}

	canChangeTagIcon(): boolean {
		const runtime = this.runtimePlugin();
		return (
			this.enabled &&
			typeof runtime?.getTagItem === 'function' &&
			typeof runtime.openIconPicker === 'function' &&
			typeof runtime.saveTagIcon === 'function'
		);
	}

	openPropertyIconPicker(propName: string): boolean {
		if (!this.canChangePropertyIcon()) return false;
		const runtime = this.runtimePlugin();
		if (!runtime?.getPropertyItem) return false;
		try {
			const item = runtime.getPropertyItem(propName);
			if (!item) return false;
			return this.openRuntimePicker(runtime, 'property', propName, item);
		} catch {
			return false;
		}
	}

	openTagIconPicker(tagPath: string): boolean {
		if (!this.canChangeTagIcon()) return false;
		const runtime = this.runtimePlugin();
		if (!runtime?.getTagItem) return false;
		try {
			const item = this.runtimeTagItem(runtime, tagPath);
			if (!item) return false;
			return this.openRuntimePicker(runtime, 'tag', tagPath, item);
		} catch {
			return false;
		}
	}

	/** Resolve a direct or rule-driven Iconic file/folder icon. */
	getFileIcon(path: string, isFolder: boolean): IconicResolvedIcon | null {
		if (!this.enabled) return null;
		return this._burstMemo(`file:${isFolder ? 'd' : 'f'}:${path}`, () => {
			const runtime = this.runtimePlugin();
			if (runtime) {
				try {
					const item = runtime.getFileItem?.(path) ?? null;
					const ruling = runtime.ruleManager?.checkRuling?.(
						isFolder ? 'folder' : 'file',
						path,
					);
					const resolved = this.normalizedIcon(ruling ?? item);
					if (resolved) return resolved;
				} catch {
					// Runtime APIs are optional/private; persisted data remains the fallback.
				}
			}
			return this.normalizedIcon(this.fileIcons.get(path));
		});
	}

	isEnabled(): boolean {
		return this.enabled;
	}

	isAvailable(): boolean {
		return this.enabled && (this.loaded || this.runtimePlugin() !== null);
	}

	private runtimePlugin(): IconicRuntimePlugin | null {
		const plugins = (this.app as ExtendedApp).plugins?.plugins;
		const candidate = plugins?.iconic;
		if (!candidate || typeof candidate !== 'object') return null;
		return candidate as IconicRuntimePlugin;
	}

	private runtimeTagItem(
		runtime: IconicRuntimePlugin,
		tagPath: string,
	): IconicRuntimeItem | null {
		if (!runtime.getTagItem) return null;
		return runtime.getTagItem(tagPath) ?? runtime.getTagItem(`#${tagPath}`);
	}

	private openRuntimePicker(
		runtime: IconicRuntimePlugin,
		kind: 'property' | 'tag',
		key: string,
		item: IconicRuntimeItem,
	): boolean {
		if (!runtime.openIconPicker) return false;
		try {
			runtime.openIconPicker(item, (icon, color) => {
				item.icon = icon;
				item.color = color;
				const cache = kind === 'property' ? this.propertyIcons : this.tagIcons;
				cache.set(key, { icon, color });
				try {
					const save =
						kind === 'property'
							? runtime.savePropertyIcon
							: runtime.saveTagIcon;
					const saveResult = save?.call(runtime, item, icon, color);
					void Promise.resolve(saveResult).catch(() => undefined);
					runtime.refreshManagers?.(kind);
				} catch {
					// Keep Vaultman's live view coherent even if an optional API disappears.
				}
				this.notifyChanged();
			});
			return true;
		} catch {
			return false;
		}
	}

	private notifyChanged(): void {
		for (const cb of this._onChangedCallbacks) {
			try {
				cb();
			} catch {
				// A stale consumer must not block refreshes for the remaining panels.
			}
		}
	}

	private normalizedIcon(
		entry: IconEntry | null | undefined,
	): IconicResolvedIcon | null {
		if (!entry?.icon && !entry?.color) return null;
		return {
			...(entry.icon ? { icon: entry.icon } : {}),
			...(entry.color ? { color: entry.color } : {}),
		};
	}
}
