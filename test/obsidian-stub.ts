/**
 * Minimal Obsidian stub for vitest module resolution.
 * The real obsidian package has no runtime entry point (main: "").
 * Tests that use evalInObsidian run code inside the real Obsidian instance,
 * so these stubs only need to satisfy vitest's module resolver.
 */

export class TFile {
	path = '';
	name = '';
}

export class TFolder {
	path = '';
	name = '';
}

export const Platform = {
	isMobile: false,
};

export class Component {
	load(): void {}
	unload(): void {}
	onload(): void {}
	onunload(): void {}
	addChild(): void {}
	registerEvent(): void {}
}

export class Events {
	private callbacks = new Map<string, Set<(...args: unknown[]) => unknown>>();

	on(name: string, callback: (...args: unknown[]) => unknown): void {
		if (!this.callbacks.has(name)) this.callbacks.set(name, new Set());
		this.callbacks.get(name)?.add(callback);
	}

	off(name: string, callback: (...args: unknown[]) => unknown): void {
		this.callbacks.get(name)?.delete(callback);
	}

	trigger(name: string, ...args: unknown[]): void {
		for (const callback of this.callbacks.get(name) ?? []) {
			callback(...args);
		}
	}
}

export class Notice {
	message: string;

	constructor(message: string) {
		this.message = message;
	}

	setMessage(message: string): void {
		this.message = message;
	}

	hide(): void {}
}

export class FileManager {}

export class AbstractInputSuggest<T> {
	constructor(..._args: unknown[]) {}

	getSuggestions(_inputStr: string): T[] {
		return [];
	}

	renderSuggestion(_value: T, _el: HTMLElement): void {}

	selectSuggestion(_value: T, _evt: MouseEvent | KeyboardEvent): void {}
}

export class Modal {
	contentEl = {
		empty: () => {},
		addClass: () => {},
		createEl: () => ({}),
		createDiv: () => ({
			createEl: () => ({}),
		}),
	};

	constructor(..._args: unknown[]) {}

	open(): void {}
	close(): void {}
	onOpen(): void {}
	onClose(): void {}
}

export class Setting {
	constructor(..._args: unknown[]) {}

	setName(): this {
		return this;
	}

	addText(callback: (text: { setPlaceholder: () => unknown; setValue: () => { onChange: () => unknown } }) => unknown): this {
		callback({
			setPlaceholder: () => ({
				setValue: () => ({
					onChange: () => {},
				}),
			}),
			setValue: () => ({
				onChange: () => {},
			}),
		});
		return this;
	}

	addButton(callback: (button: { setButtonText: () => { setCta: () => { onClick: () => unknown }; onClick: () => unknown }; setCta: () => { onClick: () => unknown }; onClick: () => unknown }) => unknown): this {
		const chain = {
			setButtonText: () => chain,
			setCta: () => chain,
			onClick: () => chain,
		};
		callback(chain);
		return this;
	}
}

interface MenuItemStub {
	setTitle: () => MenuItemStub;
	setIcon: () => MenuItemStub;
	setDisabled: () => MenuItemStub;
	onClick: () => MenuItemStub;
}

export class Menu {
	addItem(callback: (item: MenuItemStub) => unknown): void {
		const chain: MenuItemStub = {
			setTitle: () => chain,
			setIcon: () => chain,
			setDisabled: () => chain,
			onClick: () => chain,
		};
		callback(chain);
	}

	addSeparator(): void {}
	showAtMouseEvent(): void {}
	showAtPosition(): void {}
}

export function prepareSimpleSearch(query: string): (text: string) => { score: number } | null {
	const normalized = query.toLowerCase();
	return (text: string) =>
		text.toLowerCase().includes(normalized) ? { score: 1 } : null;
}

export function setTooltip(
	_el: HTMLElement,
	_text: string,
	_options?: unknown,
): void {}

/**
 * Core injects an `svg.svg-icon.<name>` child. Reproducing the shape rather
 * than a no-op lets suites assert which icon a renderer chose, which is the
 * only observable part of `setIcon` that a contract can depend on.
 */
export function setIcon(el: { createEl?: (tag: string, options?: { cls?: string }) => unknown }, icon: string): void {
	el.createEl?.('svg', { cls: `svg-icon ${icon}` });
}

export function parseYaml(_yaml: string): unknown {
	return {};
}

export function getAllTags(cache: { tags?: Array<{ tag: string }>; frontmatter?: Record<string, unknown> }): string[] {
	const tags = new Set<string>();
	for (const tag of cache.tags ?? []) tags.add(tag.tag);
	const raw = cache.frontmatter?.tags;
	if (Array.isArray(raw)) {
		for (const tag of raw) tags.add(String(tag).startsWith('#') ? String(tag) : `#${String(tag)}`);
	} else if (typeof raw === 'string') {
		tags.add(raw.startsWith('#') ? raw : `#${raw}`);
	}
	return [...tags];
}
