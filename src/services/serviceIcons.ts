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
	iconDefault?: string | null;
	items?: IconicRuntimeItem[] | null;
}

interface IconicRuntimePlugin {
	getFileItem?: (path: string) => IconicRuntimeItem | null;
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

	constructor(app: App, enabled = true) {
		super();
		this.app = app;
		this.enabled = enabled;
	}

	onload(): void {
		void this.loadIcons();
	}

	/** Register a callback to fire once after icons are loaded. Fires immediately if already loaded. */
	onLoaded(cb: () => void): void {
		if (this.loaded) {
			cb();
		} else {
			this._onLoadedCallbacks.push(cb);
		}
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
	getIcon(propName: string): { icon: string; color?: string } | null {
		if (!this.enabled) return null;
		const entry = this.propertyIcons.get(propName);
		if (!entry?.icon) return null;
		return {
			icon: entry.icon,
			...(entry.color ? { color: entry.color } : {}),
		};
	}

	/** Get custom icon for a tag path (without #). Returns null if not set. */
	getTagIcon(tagPath: string): { icon: string; color?: string } | null {
		if (!this.enabled) return null;
		const entry = this.tagIcons.get(tagPath) ?? this.tagIcons.get(`#${tagPath}`);
		if (!entry?.icon) return null;
		return {
			icon: entry.icon,
			...(entry.color ? { color: entry.color } : {}),
		};
	}

	setEnabled(enabled: boolean): void {
		this.enabled = enabled;
	}

	/** Resolve a direct or rule-driven Iconic file/folder icon. */
	getFileIcon(path: string, isFolder: boolean): IconicResolvedIcon | null {
		if (!this.enabled) return null;
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
