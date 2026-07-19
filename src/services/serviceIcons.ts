import { Component, type App } from 'obsidian';

interface IconEntry {
	icon?: string | null;
	color?: string | null;
}

interface IconicData {
	fileIcons?: Record<string, IconEntry>;
	propertyIcons?: Record<string, IconEntry>;
	tagIcons?: Record<string, IconEntry>;
	ribbonIcons?: Record<string, IconEntry>;
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
	tagIconManager?: {
		onContextMenu?: (tagPath: string, event?: MouseEvent) => unknown;
	};
	propertyIconManager?: {
		onContextMenu?: (name: string, event?: MouseEvent) => unknown;
	};
	ribbonIconManager?: {
		onContextMenu?: (itemId: string, event?: MouseEvent) => unknown;
	};
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
	private ribbonIcons = new Map<string, IconEntry>();
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
		// Iconic edits (its own UI, core menus, pickers) rewrite data.json but
		// emit no event we can hear; poll the file's mtime cheaply and reload +
		// notify on change so explorers refresh without a plugin restart
		// (BT4-024, all providers go through this service).
		if (typeof window !== 'undefined') {
			this.registerInterval(
				window.setInterval(() => void this._syncExternalData(), 2500),
			);
		}
		// The interval freezes under Electron background throttling (verified
		// live: 0 ticks while the window is hidden), so the real trigger is the
		// vault adapter's raw FS event, which fires for config-dir paths even
		// in the background. The interval stays as a resume fallback.
		const rawVault = this.app.vault as import('obsidian').Vault & {
			on?: (
				name: 'raw',
				callback: (path: string) => void,
			) => import('obsidian').EventRef;
		};
		const rawRef = rawVault.on?.('raw', (path: string) => {
			if (path !== this._dataFilePath()) return;
			// No window timers here: they freeze under background throttling
			// (the very bug this replaces). The mtime guard plus an in-flight
			// flag already coalesce the event bursts.
			void this._syncExternalData();
		});
		if (rawRef) this.registerEvent(rawRef);
	}

	private _syncInFlight = false;

	private _dataFileMtime = 0;

	private _dataFilePath(): string {
		return `${this.app.vault.configDir}/plugins/iconic/data.json`;
	}

	private async _syncExternalData(): Promise<void> {
		if (!this.enabled || this._syncInFlight) return;
		this._syncInFlight = true;
		try {
			await this._syncExternalDataInner();
		} finally {
			this._syncInFlight = false;
		}
	}

	private async _syncExternalDataInner(): Promise<void> {
		let mtime = 0;
		try {
			const stat = await this.app.vault.adapter.stat(this._dataFilePath());
			mtime = stat?.mtime ?? 0;
		} catch {
			return;
		}
		if (!mtime || mtime === this._dataFileMtime) return;
		this._dataFileMtime = mtime;
		await this.loadIcons();
		this.notifyChanged();
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

	/** Explorer renders ask for icons per node over the WHOLE tree, and
	 * Iconic's runtime evaluates rules per query — synchronous per-render
	 * lookups froze large vaults on every render (BT4-002). Resolution is
	 * split instead: the render pass only reads persisted data.json maps
	 * (cheap) backed by a persistent cache, while runtime rule evaluation is
	 * drained in the background in small time slices; when a batch upgrades
	 * any icon, ONE coalesced change notification re-renders the panels. */
	private _resolvedCache = new Map<string, IconicResolvedIcon | null>();
	private _pendingRuntime = new Map<string, () => IconicResolvedIcon | null>();
	private _runtimePumpScheduled = false;
	private _runtimeBatchDirty = false;

	private _invalidateResolved(): void {
		this._resolvedCache.clear();
		this._pendingRuntime.clear();
		this._runtimeBatchDirty = false;
	}

	private _resolveDeferred(
		key: string,
		cheap: () => IconicResolvedIcon | null,
		runtime: () => IconicResolvedIcon | null,
	): IconicResolvedIcon | null {
		if (this._resolvedCache.has(key)) {
			return this._resolvedCache.get(key) ?? null;
		}
		const value = cheap();
		this._resolvedCache.set(key, value);
		if (this.runtimePlugin()) {
			this._pendingRuntime.set(key, runtime);
			this._scheduleRuntimePump();
		}
		return value;
	}

	private _scheduleRuntimePump(): void {
		if (this._runtimePumpScheduled) return;
		this._runtimePumpScheduled = true;
		const timerHost =
			this.app.workspace?.containerEl?.ownerDocument.defaultView ?? activeWindow;
		timerHost.setTimeout(() => {
			this._runtimePumpScheduled = false;
			this._pumpRuntimeQueue();
		}, 0);
	}

	private _pumpRuntimeQueue(): void {
		const deadline = Date.now() + 8;
		for (const [key, resolve] of this._pendingRuntime) {
			if (Date.now() >= deadline) break;
			this._pendingRuntime.delete(key);
			let value: IconicResolvedIcon | null = null;
			try {
				value = resolve();
			} catch {
				value = null;
			}
			if (!value) continue;
			const prior = this._resolvedCache.get(key) ?? null;
			if (!prior || prior.icon !== value.icon || prior.color !== value.color) {
				this._resolvedCache.set(key, value);
				this._runtimeBatchDirty = true;
			}
		}
		if (this._pendingRuntime.size > 0) {
			this._scheduleRuntimePump();
			return;
		}
		if (this._runtimeBatchDirty) {
			this._runtimeBatchDirty = false;
			this.notifyChanged();
		}
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
			this.ribbonIcons.clear();
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
			if (data.ribbonIcons) {
				for (const [id, entry] of Object.entries(data.ribbonIcons)) {
					this.ribbonIcons.set(id, entry);
				}
			}
			this.loaded = true;
			this._invalidateResolved();
			// Seed the external-watch baseline at load so the FIRST outside
			// edit is never mistaken for the initial observation.
			try {
				const stat = await this.app.vault.adapter.stat(this._dataFilePath());
				if (stat?.mtime) this._dataFileMtime = stat.mtime;
			} catch {
				// Baseline stays as-is; the next sync will settle it.
			}
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
		return this._resolveDeferred(
			`prop:${propName}`,
			() => this.normalizedIcon(this.propertyIcons.get(propName)),
			() => {
				const runtime = this.runtimePlugin();
				if (!runtime?.getPropertyItem) return null;
				return this.normalizedIcon(runtime.getPropertyItem(propName));
			},
		);
	}

	/** Get custom icon for a tag path (without #). Returns null if not set. */
	getTagIcon(tagPath: string): IconicResolvedIcon | null {
		if (!this.enabled) return null;
		return this._resolveDeferred(
			`tag:${tagPath}`,
			() =>
				this.normalizedIcon(
					this.tagIcons.get(tagPath) ?? this.tagIcons.get(`#${tagPath}`),
				),
			() => {
				const runtime = this.runtimePlugin();
				if (!runtime?.getTagItem) return null;
				return this.normalizedIcon(this.runtimeTagItem(runtime, tagPath));
			},
		);
	}

	setEnabled(enabled: boolean): void {
		if (this.enabled === enabled) return;
		this.enabled = enabled;
		this._invalidateResolved();
		this.notifyChanged();
	}

	/** Persisted Iconic override for a ribbon action (plugin-emitted icon). */
	getRibbonIcon(itemId: string): IconicResolvedIcon | null {
		if (!this.enabled) return null;
		return this.normalizedIcon(this.ribbonIcons.get(itemId));
	}

	canChangeRibbonIcon(): boolean {
		const runtime = this.runtimePlugin();
		return (
			this.enabled &&
			typeof runtime?.ribbonIconManager?.onContextMenu === 'function'
		);
	}

	openRibbonIconMenu(itemId: string, event?: MouseEvent): boolean {
		if (!this.canChangeRibbonIcon()) return false;
		try {
			this.runtimePlugin()?.ribbonIconManager?.onContextMenu?.(itemId, event);
			return true;
		} catch {
			return false;
		}
	}

	canChangePropertyIcon(): boolean {
		const runtime = this.runtimePlugin();
		// Iconic exposes no public picker; its per-kind managers' onContextMenu
		// opens the real change-icon menu/picker (verified live, BT4-023).
		return (
			this.enabled &&
			(typeof runtime?.propertyIconManager?.onContextMenu === 'function' ||
				(typeof runtime?.getPropertyItem === 'function' &&
					typeof runtime.openIconPicker === 'function' &&
					typeof runtime.savePropertyIcon === 'function'))
		);
	}

	canChangeTagIcon(): boolean {
		const runtime = this.runtimePlugin();
		return (
			this.enabled &&
			(typeof runtime?.tagIconManager?.onContextMenu === 'function' ||
				(typeof runtime?.getTagItem === 'function' &&
					typeof runtime.openIconPicker === 'function' &&
					typeof runtime.saveTagIcon === 'function'))
		);
	}

	openPropertyIconPicker(propName: string, event?: MouseEvent): boolean {
		if (!this.canChangePropertyIcon()) return false;
		const runtime = this.runtimePlugin();
		try {
			if (runtime?.propertyIconManager?.onContextMenu) {
				runtime.propertyIconManager.onContextMenu(propName, event);
				return true;
			}
			if (!runtime?.getPropertyItem) return false;
			const item = runtime.getPropertyItem(propName);
			if (!item) return false;
			return this.openRuntimePicker(runtime, 'property', propName, item);
		} catch {
			return false;
		}
	}

	openTagIconPicker(tagPath: string, event?: MouseEvent): boolean {
		if (!this.canChangeTagIcon()) return false;
		const runtime = this.runtimePlugin();
		try {
			if (runtime?.tagIconManager?.onContextMenu) {
				runtime.tagIconManager.onContextMenu(tagPath, event);
				return true;
			}
			if (!runtime?.getTagItem) return false;
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
		return this._resolveDeferred(
			`file:${isFolder ? 'd' : 'f'}:${path}`,
			() => this.normalizedIcon(this.fileIcons.get(path)),
			() => {
				const runtime = this.runtimePlugin();
				if (!runtime) return null;
				const item = runtime.getFileItem?.(path) ?? null;
				const ruling = runtime.ruleManager?.checkRuling?.(
					isFolder ? 'folder' : 'file',
					path,
				);
				return this.normalizedIcon(ruling ?? item);
			},
		);
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
				this._invalidateResolved();
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
