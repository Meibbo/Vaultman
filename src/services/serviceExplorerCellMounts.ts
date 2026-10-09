import type { App } from 'obsidian';
import { ExplorerCellContributions } from './serviceExplorerCellContributions';
import { NATIVE_TREE_PROFILES } from '../logic/logicNativeTreeCompat';

export interface ExplorerNativeRowSource {
	readonly row: (path: string) => HTMLElement | null;
	readonly onLayout: (callback: () => void) => () => void;
	readonly pseudoVisible: (row: HTMLElement, pseudo: 'before' | 'after') => boolean;
	readonly rootOrdinal?: (path: string) => number | undefined;
	readonly rootColors?: () => ReadonlyMap<string, string>;
}

function record(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object';
}

/** Passive FileExplorer boundary; never invoke a private native controller. */
export function explorerNativeRowSource(app: App): ExplorerNativeRowSource {
	const profiles = new Map<string, boolean>();
	let rootOrdinals: ReadonlyMap<string, number> | null = null;
	const colors = new Map<string, string>();
	let colorsReady = false;
	const rootColors = (): ReadonlyMap<string, string> => {
		if (colorsReady) return colors;
		colorsReady = true;
		const view = app.workspace.getLeavesOfType('file-explorer')[0]?.view;
		if (view && 'fileItems' in view && record(view.fileItems)) {
			for (const file of app.vault.getRoot().children) {
				const item = view.fileItems[file.path];
				if (!record(item) || !(item.selfEl instanceof HTMLElement) || !item.selfEl.classList.contains('nav-folder-title')) continue;
				const label = item.innerEl instanceof HTMLElement ? item.innerEl : item.selfEl;
				const color = label.ownerDocument.defaultView?.getComputedStyle(label).color;
				if (color) colors.set(file.path, color);
			}
		}
		return colors;
	};
	return {
		rootColors,
		rootOrdinal: (path) => {
			if (!rootOrdinals) {
				const ordinals = new Map<string, number>();
				const view = app.workspace.getLeavesOfType('file-explorer')[0]?.view;
				if (view && 'fileItems' in view && record(view.fileItems)) {
					const first = app.vault.getRoot().children.find(file => record(view.fileItems) && record(view.fileItems[file.path]));
					const item = first ? view.fileItems[first.path] : null;
					const parent = record(item) ? item.parent : null;
					const virtual = record(parent) ? parent.vChildren : null;
					if (record(virtual) && Array.isArray(virtual._children)) {
						const children: readonly unknown[] = virtual._children;
						for (const [index, child] of children.entries()) {
							if (record(child) && record(child.file) && typeof child.file.path === 'string')
								ordinals.set(child.file.path, index + 1 + (NATIVE_TREE_PROFILES.files.rootLeadingSlots ?? 0));
						}
					}
				}
				rootOrdinals = ordinals;
			}
			return rootOrdinals.get(path);
		},
		pseudoVisible: (row, pseudo) => {
			const key = `${row.tagName}:${row.className}:${pseudo}`;
			const cached = profiles.get(key);
			if (cached !== undefined) return cached;
			const style = row.ownerDocument.defaultView?.getComputedStyle(row, `::${pseudo}`);
			const visible = Boolean(style && style.content !== '' && style.content !== 'none' && style.content !== 'normal' && style.display !== 'none');
			profiles.set(key, visible);
			return visible;
		},
		row: (path) => {
			const view = app.workspace.getLeavesOfType('file-explorer')[0]?.view;
			if (!view || !('fileItems' in view) || !record(view.fileItems)) return null;
			const item = view.fileItems[path];
			if (!record(item)) return null;
			const row = item.titleEl ?? item.selfEl;
			return row instanceof HTMLElement ? row : null;
		},
		onLayout: callback => {
			const refresh = () => { profiles.clear(); rootOrdinals = null; colors.clear(); colorsReady = false; rootColors(); callback(); };
			const ref = app.workspace.on('layout-change', refresh);
			const cssRef = app.workspace.on('css-change', refresh);
			const doc = app.workspace.getLeavesOfType('file-explorer')[0]?.view.containerEl.ownerDocument;
			const observer = new MutationObserver(refresh);
			if (doc) {
				observer.observe(doc.body, { attributes: true, attributeFilter: ['class', 'style'] });
				observer.observe(doc.head, { childList: true, subtree: true, characterData: true });
			}
			return () => { observer.disconnect(); app.workspace.offref(ref); app.workspace.offref(cssRef); };
		},
	};
}

interface Binding {
	readonly row: HTMLElement;
	readonly self: HTMLElement;
	icon: HTMLElement | null;
	readonly ownsIcon: boolean;
	readonly showIcons: boolean;
	readonly showAddons: boolean;
	readonly originalIcon: readonly Node[];
	readonly originalStyle: string | null;
	readonly originalClass: string;
	readonly originalAttributes: readonly { readonly name: string; readonly value: string }[];
	readonly compatible: boolean;
	nativeRow: HTMLElement | null;
	iconSignature: string;
}

/** Mounted-row consumer of the public API, including sticky copies. Native
 * mutation updates patch cells, not the tree. Detached native items can still
 * be observed; offscreen VM rows never get mounted for translation purposes.
 */
export class ExplorerCellMounts {
	private readonly bindings = new Map<HTMLElement, Binding>();
	private readonly titles = new Map<HTMLElement, number>();
	private readonly observer: MutationObserver;
	private readonly disposals: readonly (() => void)[];
	private readonly observation: MutationObserverInit = { childList: true, subtree: true, attributes: true };

	constructor(private readonly registry: ExplorerCellContributions, private readonly source: ExplorerNativeRowSource,
		private readonly doc: Document) {
		this.observer = new MutationObserver(() => this.refresh());
		this.disposals = [source.onLayout(() => this.refresh()), registry.onChange(() => this.refresh()), registry.attachDocument(doc)];
	}

	bind(row: HTMLElement, compatible: boolean, visibility: Readonly<{ icons: boolean; addons: boolean }> = { icons: true, addons: true }): void {
		const { icons: showIcons, addons: showAddons } = visibility;
		const self = row.querySelector<HTMLElement>(':scope > .vaultman-tree-self');
		if (!self || !row.dataset.path) return;
		let binding = this.bindings.get(row);
		if (binding && (binding.self !== self || binding.compatible !== compatible || binding.showIcons !== showIcons || binding.showAddons !== showAddons)) {
			this.unbind(row); binding = undefined;
		}
		if (!binding) {
			const icon = self.querySelector<HTMLElement>('.vaultman-tree-icon');
			binding = { row, self, icon, compatible, ownsIcon: !icon, showIcons, showAddons, nativeRow: null, iconSignature: '',
				originalIcon: icon ? [...icon.childNodes].map(node => node.cloneNode(true)) : [],
				originalClass: icon?.className ?? 'vaultman-tree-icon', originalStyle: icon?.getAttribute('style') ?? null,
				originalAttributes: icon ? [...icon.attributes].map(({ name, value }) => ({ name, value })) : [] };
			this.bindings.set(row, binding);
		}
		this.sync(binding);
	}

	unbind(row: HTMLElement): void {
		const binding = this.bindings.get(row);
		if (!binding) return;
		this.releaseTitle(binding); this.restoreIcon(binding);
		for (const cell of binding.self.querySelectorAll(':scope > .vaultman-explorer-cell-text')) cell.remove();
		delete binding.self.dataset.vaultmanTranslatedBefore; delete binding.self.dataset.vaultmanTranslatedAfter;
		this.bindings.delete(row);
	}

	refresh(): void {
		for (const binding of this.bindings.values()) {
			if (!binding.row.isConnected) this.unbind(binding.row);
			else this.sync(binding);
		}
	}

	destroy(): void {
		for (const off of this.disposals) off();
		for (const row of this.bindings.keys()) this.unbind(row);
		this.observer.disconnect();
	}

	private releaseTitle(binding: Binding): void {
		if (!binding.nativeRow) return;
		const refs = (this.titles.get(binding.nativeRow) ?? 1) - 1;
		if (refs > 0) this.titles.set(binding.nativeRow, refs);
		else {
			this.titles.delete(binding.nativeRow);
			this.observer.disconnect();
			for (const title of this.titles.keys()) this.observer.observe(title, this.observation);
		}
		binding.nativeRow = null;
	}

	private restoreIcon(binding: Binding): void {
		if (!binding.icon || !binding.iconSignature) return;
		if (binding.ownsIcon) {
			binding.icon.remove(); binding.icon = null; binding.iconSignature = ''; return;
		}
		binding.icon.replaceChildren(...binding.originalIcon.map(node => node.cloneNode(true)));
		binding.icon.className = binding.originalClass;
		if (binding.originalStyle === null) binding.icon.removeAttribute('style');
		else binding.icon.setAttribute('style', binding.originalStyle);
		binding.icon.removeAttribute('data-icon'); binding.iconSignature = '';
		for (const attribute of [...binding.icon.attributes]) binding.icon.removeAttribute(attribute.name);
		for (const attribute of binding.originalAttributes) binding.icon.setAttribute(attribute.name, attribute.value);
	}

	private sync(binding: Binding): void {
		const path = binding.row.dataset.path ?? '';
		const nativeRow = binding.compatible ? this.source.row(path) : null;
		if (nativeRow !== binding.nativeRow) {
			this.releaseTitle(binding); binding.nativeRow = nativeRow;
			if (nativeRow) {
				const refs = this.titles.get(nativeRow) ?? 0;
				if (refs === 0) this.observer.observe(nativeRow, this.observation);
				this.titles.set(nativeRow, refs + 1);
			}
		}
		const nativePseudos = { before: nativeRow ? this.source.pseudoVisible(nativeRow, 'before') : false,
			after: nativeRow ? this.source.pseudoVisible(nativeRow, 'after') : false };
		const cells = binding.compatible ? this.registry.read({ path, nativeRow, document: this.doc, nativePseudos }) : [];
		// The renderer has one primary icon slot. Explicit later registrations
		// override passive translators; text IDs should be provider-namespaced.
		const icon = [...cells].reverse().find(cell => cell.kind === 'icon');
		if (icon?.kind === 'icon' && binding.showIcons) {
			if (!binding.icon) {
				binding.icon = this.doc.createElement('span'); binding.icon.className = 'vaultman-tree-icon';
				binding.self.insertBefore(binding.icon, binding.self.querySelector('.vaultman-tree-label'));
			}
			const signature = icon.element.outerHTML;
			if (signature !== binding.iconSignature) {
				binding.icon.replaceChildren(...[...icon.element.childNodes].map(node => this.doc.importNode(node, true)));
				binding.icon.className = `${binding.originalClass} ${icon.element.className}`;
				binding.icon.setAttribute('style', icon.element.getAttribute('style') ?? '');
				for (const attribute of icon.element.attributes) {
					if (attribute.name.startsWith('data-') || attribute.name.startsWith('aria-') || attribute.name === 'title')
						binding.icon.setAttribute(attribute.name, attribute.value);
				}
				binding.icon.dataset.vaultmanContributedIcon = 'true';
				binding.icon.dataset.cell = icon.id;
				binding.iconSignature = signature;
			}
		} else this.restoreIcon(binding);
		const visible = new Set<string>();
		delete binding.self.dataset.vaultmanTranslatedBefore; delete binding.self.dataset.vaultmanTranslatedAfter;
		for (const contribution of cells) {
			if (contribution.kind !== 'text') continue;
			if (contribution.replacesPseudo === 'before') binding.self.dataset.vaultmanTranslatedBefore = 'true';
			if (contribution.replacesPseudo === 'after') binding.self.dataset.vaultmanTranslatedAfter = 'true';
			if (!binding.showAddons) continue;
			visible.add(contribution.id);
			let cell = [...binding.self.querySelectorAll<HTMLElement>(':scope > .vaultman-explorer-cell-text')]
				.find(element => element.dataset.cell === contribution.id);
			if (!cell) {
				cell = this.doc.createElement('span'); cell.className = 'vaultman-explorer-cell-text';
				cell.dataset.cell = contribution.id; binding.self.append(cell);
			}
			if (cell.textContent !== contribution.text) cell.textContent = contribution.text;
		}
		for (const cell of binding.self.querySelectorAll<HTMLElement>(':scope > .vaultman-explorer-cell-text')) {
			if (!visible.has(cell.dataset.cell ?? '')) cell.remove();
		}
	}
}
