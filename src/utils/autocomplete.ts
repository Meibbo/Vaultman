import {
	AbstractInputSuggest,
	TFolder,
	prepareFuzzySearch,
	setIcon,
	type App,
} from 'obsidian';

/**
 * A suggester candidate. Native parity (minified `wN extends JR`): the core
 * Properties view offers `{value, icon}` pairs sourced from
 * `metadataTypeManager.getAllProperties()` plus each widget's icon.
 */
export interface PropertySuggestItem {
	value: string;
	icon?: string;
}

/**
 * Native-parity source for the full vault property list with per-type icons.
 * `metadataTypeManager` is internal (absent from the public d.ts), so every
 * step is guarded and the caller merges these ahead of its own fallback —
 * nothing here may throw when the manager is missing.
 */
export function nativePropertyItems(app: App): PropertySuggestItem[] {
	try {
		const manager = (
			app as unknown as {
				metadataTypeManager?: {
					getAllProperties?: () => Record<string, { name?: unknown; widget?: unknown }>;
					getWidget?: (widget: string) => { icon?: unknown };
				};
			}
		).metadataTypeManager;
		const all = manager?.getAllProperties?.();
		if (!all || typeof all !== 'object') return [];
		// The manager is internal: tolerate both a plain record and a Map.
		// `Object.values` on a Map yields [] silently, which used to cap the
		// popover at whatever the fallback provided.
		const entries: unknown[] = all instanceof Map ? [...all.values()] : Object.values(all);
		const items: PropertySuggestItem[] = [];
		for (const raw of entries) {
			const entry = raw as { name?: unknown; widget?: unknown };
			if (typeof entry?.name !== 'string' || !entry.name) continue;
			let icon: string | undefined;
			if (typeof entry.widget === 'string') {
				const widgetIcon = manager?.getWidget?.(entry.widget)?.icon;
				if (typeof widgetIcon === 'string' && widgetIcon) icon = widgetIcon;
			}
			items.push({ value: entry.name, icon });
		}
		return items;
	} catch {
		return [];
	}
}

/**
 * Normalize mixed candidates and drop case-insensitive duplicates, keeping
 * the first occurrence (callers merge icon-bearing propScene items first so
 * their icons win). Value lists pass `caseInsensitive: false` — `TODO` and
 * `todo` can be distinct task values, while property names collide
 * case-insensitively like the native duplicate check.
 */
export function dedupeSuggestItems(
	items: Array<string | PropertySuggestItem>,
	caseInsensitive = true,
): PropertySuggestItem[] {
	const out: PropertySuggestItem[] = [];
	for (const raw of items) {
		const item =
			typeof raw === 'string' ? { value: raw } : { ...raw };
		const known = out.find((entry) =>
			caseInsensitive
				? entry.value.toLowerCase() === item.value.toLowerCase()
				: entry.value === item.value,
		);
		if (known) {
			if (!known.icon && item.icon) known.icon = item.icon;
			continue;
		}
		out.push(item);
	}
	return out;
}

/** Drop candidates the note already has (compared lowercase). */
export function excludeSuggestItems(
	items: PropertySuggestItem[],
	excludedLower: Set<string>,
): PropertySuggestItem[] {
	if (excludedLower.size === 0) return items;
	return items.filter((item) => !excludedLower.has(item.value.toLowerCase()));
}

/**
 * Flatten a frontmatter value the way the propScene tree stores rawValues
 * (mirrors `describeConflictValue` in logicProps): null/undefined and empty
 * arrays become `''`, arrays flatten one level per nesting, objects become
 * JSON. Used to dedupe suggestions against what the note already holds.
 */
export function normalizeFrontmatterValues(value: unknown): string[] {
	if (value == null) return [''];
	if (Array.isArray(value)) {
		if (value.length === 0) return [''];
		const out: string[] = [];
		for (const entry of value) out.push(...normalizeFrontmatterValues(entry));
		return out;
	}
	if (typeof value === 'object') {
		try {
			return [JSON.stringify(value) ?? Object.prototype.toString.call(value)];
		} catch {
			return [Object.prototype.toString.call(value)];
		}
	}
	// eslint-disable-next-line @typescript-eslint/no-base-to-string -- Allow default stringification
	return [String(value)];
}

/**
 * Fuzzy-search suggest component for property names and values.
 * Wraps Obsidian's AbstractInputSuggest for native-feeling autocomplete:
 * the popover, keyboard navigation and dismissal are native; only the
 * candidate list comes from the vault, like the core Properties view.
 */
export class PropertySuggest extends AbstractInputSuggest<string> {
	private items: PropertySuggestItem[] = [];
	private selectCallback: (value: string) => void;

	constructor(
		app: App,
		inputEl: HTMLInputElement,
		items: Array<string | PropertySuggestItem>,
		onSelectItem: (value: string) => void
	) {
		super(app, inputEl);
		this.items = items.map((item) =>
			typeof item === 'string' ? { value: item } : item,
		);
		this.selectCallback = onSelectItem;
	}

	getSuggestions(query: string): string[] {
		const lower = query.toLowerCase();
		if (!lower) return this.items.slice(0, 20).map((item) => item.value);

		// Native parity: the core Properties view fuzzy-matches, so
		// intermediate fragments must hit, with prefix matches first.
		const fuzzy = prepareFuzzySearch(lower);
		return this.items
			.map((item) => ({ item, match: fuzzy(item.value.toLowerCase()) }))
			.filter(
				(entry): entry is { item: PropertySuggestItem; match: NonNullable<typeof entry.match> } =>
					entry.match !== null,
			)
			.sort((a, b) => {
				if (a.match.score !== b.match.score) return a.match.score - b.match.score;
				const aStarts = a.item.value.toLowerCase().startsWith(lower) ? 0 : 1;
				const bStarts = b.item.value.toLowerCase().startsWith(lower) ? 0 : 1;
				if (aStarts !== bStarts) return aStarts - bStarts;
				return a.item.value.localeCompare(b.item.value, undefined, { sensitivity: 'base' });
			})
			.map((entry) => entry.item.value)
			.slice(0, 30);
	}

	iconFor(value: string): string | undefined {
		return this.items.find((item) => item.value === value)?.icon;
	}

	/**
	 * The native popover element. `suggestEl` is untyped in the public API
	 * (the core uses it for `mod-property-value` theming), so it is reached
	 * through a contained cast rather than an `any` leak at call sites.
	 */
	get popoverEl(): HTMLElement {
		return (this as unknown as { suggestEl: HTMLElement }).suggestEl;
	}

	renderSuggestion(value: string, el: HTMLElement): void {
		const icon = this.iconFor(value);
		if (!icon) {
			el.setText(value);
			return;
		}
		el.empty();
		const iconSpan = el.createSpan({ cls: 'vaultman-suggest-icon' });
		setIcon(iconSpan, icon);
		el.createSpan({ cls: 'vaultman-suggest-label', text: value });
	}

	selectSuggestion(value: string): void {
		this.selectCallback(value);
		this.close();
	}

	/** Update the suggestion list dynamically */
	setItems(items: Array<string | PropertySuggestItem>): void {
		this.items = items.map((item) =>
			typeof item === 'string' ? { value: item } : item,
		);
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
