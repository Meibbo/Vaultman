import { Component, type App } from 'obsidian';

/**
 * Reads property type assignments from .obsidian/types.json
 * and provides lookup/mutation helpers.
 */
export class PropertyTypeService extends Component {
	private types = new Map<string, string>();
	private app: App;

	constructor(app: App) {
		super();
		this.app = app;
	}

	onload(): void {
		void this.loadTypes();
	}

	private async loadTypes(): Promise<void> {
		try {
			const path = `${this.app.vault.configDir}/types.json`;
			const raw = await this.app.vault.adapter.read(path);
			const data = JSON.parse(raw) as { types?: Record<string, string> };
			if (data.types && typeof data.types === 'object') {
				for (const [name, type] of Object.entries(data.types)) {
					this.types.set(name, type);
				}
			}
		} catch {
			// types.json missing or unreadable
		}
	}

	getType(propName: string): string | null {
		return this.types.get(propName) ?? null;
	}

	getAllTypes(): string[] {
		const unique = new Set(this.types.values());
		return [...unique].sort();
	}

	/** Write a type assignment to .obsidian/types.json */
	async setType(propName: string, type: string): Promise<void> {
		this.types.set(propName, type);
		try {
			const path = `${this.app.vault.configDir}/types.json`;
			const raw = await this.app.vault.adapter.read(path);
			const data = JSON.parse(raw) as { types?: Record<string, string> };
			if (!data.types) data.types = {};
			data.types[propName] = type;
			await this.app.vault.adapter.write(
				path,
				JSON.stringify(data, null, 2)
			);
		} catch {
			// Could not write types.json
		}
	}
}
