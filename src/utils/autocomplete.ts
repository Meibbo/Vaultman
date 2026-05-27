import { AbstractInputSuggest, TFolder, type App } from 'obsidian';

/**
 * Fuzzy-search suggest component for property names and values.
 * Wraps Obsidian's AbstractInputSuggest for native-feeling autocomplete.
 */
export class PropertySuggest extends AbstractInputSuggest<string> {
	private items: string[] = [];
	private selectCallback: (value: string) => void;

	constructor(
		app: App,
		inputEl: HTMLInputElement,
		items: string[],
		onSelectItem: (value: string) => void
	) {
		super(app, inputEl);
		this.items = items;
		this.selectCallback = onSelectItem;
	}

	getSuggestions(query: string): string[] {
		const lower = query.toLowerCase();
		if (!lower) return this.items.slice(0, 20);

		return this.items
			.filter((item) => item.toLowerCase().includes(lower))
			.sort((a, b) => {
				// Prioritize prefix matches
				const aStarts = a.toLowerCase().startsWith(lower) ? 0 : 1;
				const bStarts = b.toLowerCase().startsWith(lower) ? 0 : 1;
				if (aStarts !== bStarts) return aStarts - bStarts;
				return a.localeCompare(b, undefined, { sensitivity: 'base' });
			})
			.slice(0, 30);
	}

	renderSuggestion(value: string, el: HTMLElement): void {
		el.setText(value);
	}

	selectSuggestion(value: string): void {
		this.selectCallback(value);
		this.close();
	}

	/** Update the suggestion list dynamically */
	setItems(items: string[]): void {
		this.items = items;
	}
}

/**
 * Folder path suggest for picking a destination folder.
 * Shows all vault folders with fuzzy prefix-first sorting.
 */
export class FolderSuggest extends AbstractInputSuggest<string> {
	private selectCallback: (path: string) => void;

	constructor(app: App, inputEl: HTMLInputElement, onSelect: (path: string) => void) {
		super(app, inputEl);
		this.selectCallback = onSelect;
	}

	getSuggestions(query: string): string[] {
		const folders = this.app.vault.getAllFolders(true).map((f: TFolder) => f.path);
		const lower = query.toLowerCase();
		if (!lower) return folders.slice(0, 30);
		return folders
			.filter((p) => p.toLowerCase().includes(lower))
			.sort((a, b) => {
				const aStarts = a.toLowerCase().startsWith(lower) ? 0 : 1;
				const bStarts = b.toLowerCase().startsWith(lower) ? 0 : 1;
				if (aStarts !== bStarts) return aStarts - bStarts;
				return a.localeCompare(b, undefined, { sensitivity: 'base' });
			})
			.slice(0, 30);
	}

	renderSuggestion(path: string, el: HTMLElement): void {
		el.setText(path || '/ (vault root)');
	}

	selectSuggestion(path: string): void {
		this.selectCallback(path);
		this.close();
	}
}
