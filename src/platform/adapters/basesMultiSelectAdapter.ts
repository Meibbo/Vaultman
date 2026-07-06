import { Menu, TFile, setIcon, type App } from 'obsidian';
import { PropertyManagerModal } from '../../modals/modalPropertyManager';
import { FileRenameModal } from '../../modals/modalFileRename';
import { FileMoveModal } from '../../modals/modalFileMove';
import type { PropertyIndexService } from '../../index/utilPropIndex';
import { DELETE_FILE, type PendingChange } from '../../types/typeOps';
import type {
	CapabilityResult,
	FragilityRecord,
	PlatformAdapter,
	PlatformAdapterContext,
} from '../platformAdapter';

export const BASES_ROOT_SELECTOR =
	'.workspace-leaf-content[data-type="base"], .bases-view, .bases-embed, .bases-table-container';
export const BASES_SELECTED_ROW_SELECTOR =
	'.bases-tr.is-selected, .bases-tr.mod-selected, .bases-tr[aria-selected="true"], .bases-tr[data-is-selected="true"]';
export const BASES_ROW_SELECTOR = '.bases-tr';
export const BASES_NATIVE_MENU_SELECTOR = '.menu';
export const BASES_NATIVE_MENU_ENHANCED_CLASS = 'vm-bases-menu-enhanced';
export const BASES_NATIVE_MENU_ITEM_CLASS = 'vm-bases-menu-item';
export const BASES_NATIVE_MENU_SEPARATOR_CLASS = 'vm-bases-menu-separator';

type DeferHandle = unknown;
type QueueCallback = (change: PendingChange) => void;

export interface BasesMultiSelectAdapterOptions {
	readonly propertyIndex: PropertyIndexService;
	readonly enqueue: QueueCallback;
	readonly enabled?: () => boolean;
	readonly menuFactory?: () => Menu;
	readonly defer?: (callback: () => void) => DeferHandle;
	readonly cancelDefer?: (handle: DeferHandle) => void;
}

type EventDoc = Pick<Document, 'addEventListener' | 'removeEventListener'>;

const FRAGILITY: FragilityRecord = {
	id: 'bases-multi-select',
	title: 'Bases multi-select operations',
	summary:
		'Ports the stable Bases multi-select DOM scraper into a PlatformAdapter. It reads ' +
		'selected native Bases rows, injects Vaultman operations into Obsidian native menus, ' +
		'and falls back to an Obsidian Menu when no native menu is open.',
	privateSymbols: [
		'Obsidian Bases selected-row DOM',
		'Obsidian native Menu DOM',
		'app.vault.getAbstractFileByPath',
	],
	selectorSources: [
		BASES_ROOT_SELECTOR,
		BASES_SELECTED_ROW_SELECTOR,
		BASES_ROW_SELECTOR,
		BASES_NATIVE_MENU_SELECTOR,
		'[data-path]',
		'[data-file-path]',
		'[data-href]',
		'.internal-link',
	],
	obsidianAssumptions: [
		'Bases rows render as .bases-tr elements inside a Bases root container',
		'Selected Bases rows are marked with is-selected/mod-selected/aria/data selection state',
		'Rows or their internal links expose file paths through data-path, data-file-path, or data-href',
		'Obsidian native context menus are mounted as .menu nodes on the next task after contextmenu',
		'Queueing and property-index access are injected; this adapter does not route selector hits through providers or serviceCMenu',
	],
	fallback:
		'Bases multi-select operations stay disabled when probe fails. When the native menu is absent after a valid contextmenu, a Vaultman-only Obsidian Menu is opened instead.',
	mobile: {
		supported: 'degraded',
		notes:
			'Native Bases contextmenu and desktop multi-select row semantics are not guaranteed on mobile; fallback Menu behavior is touch-host dependent.',
	},
};

export class BasesMultiSelectAdapter implements PlatformAdapter {
	readonly id = FRAGILITY.id;
	readonly fragility = FRAGILITY;

	private readonly propertyIndex: PropertyIndexService;
	private readonly enqueue: QueueCallback;
	private readonly enabled: () => boolean;
	private readonly menuFactory: () => Menu;
	private readonly defer?: (callback: () => void) => DeferHandle;
	private readonly cancelDefer?: (handle: DeferHandle) => void;
	private teardowns: Array<() => void> = [];
	private pendingDefers = new Set<DeferHandle>();
	private injectedNodes = new Map<HTMLElement, HTMLElement[]>();
	private isApplied = false;

	constructor(options: BasesMultiSelectAdapterOptions) {
		this.propertyIndex = options.propertyIndex;
		this.enqueue = options.enqueue;
		this.enabled = options.enabled ?? (() => true);
		this.menuFactory = options.menuFactory ?? (() => new Menu());
		this.defer = options.defer;
		this.cancelDefer = options.cancelDefer;
	}

	probe(ctx: PlatformAdapterContext): CapabilityResult {
		try {
			if (!isEventDocument(ctx.doc)) {
				return { ok: false, reason: 'document event API is not available' };
			}
			if (!ctx.doc.body || typeof ctx.doc.body.querySelectorAll !== 'function') {
				return { ok: false, reason: 'document body is not available' };
			}
			if (typeof vaultResolver(ctx.app) !== 'function') {
				return { ok: false, reason: 'app.vault.getAbstractFileByPath is not available' };
			}
			if (!hasPropertyIndex(this.propertyIndex)) {
				return { ok: false, reason: 'propertyIndex is not available' };
			}
			if (typeof this.enqueue !== 'function') {
				return { ok: false, reason: 'enqueue callback is not available' };
			}
		} catch (error) {
			return { ok: false, reason: `probe failed: ${errorMessage(error)}` };
		}
		return { ok: true };
	}

	apply(ctx: PlatformAdapterContext): void {
		const capability = this.probe(ctx);
		if (!capability.ok) {
			throw new Error(capability.reason);
		}
		this.revert();

		const handler = (event: Event) => {
			if (!this.enabled()) return;
			this.handleContextMenu(ctx, event as MouseEvent);
		};
		ctx.doc.addEventListener('contextmenu', handler, true);
		this.teardowns = [() => ctx.doc.removeEventListener('contextmenu', handler, true)];
		this.isApplied = true;
	}

	revert(): void {
		this.isApplied = false;
		for (const teardown of this.teardowns.splice(0)) {
			teardown();
		}
		for (const handle of this.pendingDefers) {
			this.cancelDeferHandle(handle);
		}
		this.pendingDefers.clear();
		this.removeInjectedNodes();
	}

	fallback(): void {
		// Probe failure means the feature is disabled; no public Obsidian API can replace it.
	}

	get applied(): boolean {
		return this.isApplied;
	}

	private handleContextMenu(ctx: PlatformAdapterContext, event: MouseEvent): void {
		const target = asElement(event.target);
		if (!target) return;
		const root = target.closest<HTMLElement>(BASES_ROOT_SELECTOR);
		if (!root) return;
		const files = collectBasesSelectedFiles(ctx.app, root, target);
		if (files.length < 2) return;

		this.schedule(ctx.doc, () => {
			if (!this.isApplied) return;
			if (!this.injectIntoOpenNativeMenu(ctx, files)) {
				this.openFallbackBasesOperationsMenu(ctx, files, event);
			}
		});
	}

	private schedule(doc: Document, callback: () => void): void {
		let handle: DeferHandle;
		const wrapped = () => {
			if (handle !== undefined) this.pendingDefers.delete(handle);
			if (!this.isApplied) return;
			callback();
		};
		handle = this.defer ? this.defer(wrapped) : deferWithDocument(doc, wrapped);
		this.pendingDefers.add(handle);
	}

	private cancelDeferHandle(handle: DeferHandle): void {
		if (this.cancelDefer) {
			this.cancelDefer(handle);
			return;
		}
		clearTimeout(handle as ReturnType<typeof setTimeout>);
	}

	private injectIntoOpenNativeMenu(ctx: PlatformAdapterContext, files: TFile[]): boolean {
		const menus = Array.from(
			ctx.doc.body.querySelectorAll<HTMLElement>(BASES_NATIVE_MENU_SELECTOR),
		);
		const menu = menus.at(-1);
		if (!menu) return false;
		if (menu.classList.contains(BASES_NATIVE_MENU_ENHANCED_CLASS)) return true;

		const nodes: HTMLElement[] = [];
		menu.classList.add(BASES_NATIVE_MENU_ENHANCED_CLASS);

		const separator = ctx.doc.createElement('div');
		separator.className = `menu-separator ${BASES_NATIVE_MENU_SEPARATOR_CLASS}`;
		menu.appendChild(separator);
		nodes.push(separator);

		this.appendNativeMenuItem(ctx.doc, menu, nodes, {
			title: 'Vaultman: add property',
			icon: 'lucide-plus',
			action: () => this.openPropertyManager(ctx, files),
		});
		this.appendNativeMenuItem(ctx.doc, menu, nodes, {
			title: 'Vaultman: rename files',
			icon: 'lucide-pencil',
			action: () => this.openRenameModal(ctx, files),
		});
		this.appendNativeMenuItem(ctx.doc, menu, nodes, {
			title: 'Vaultman: move files',
			icon: 'lucide-folder-input',
			action: () => this.openMoveModal(ctx, files),
		});
		this.appendNativeMenuItem(ctx.doc, menu, nodes, {
			title: 'Vaultman: delete files',
			icon: 'lucide-trash',
			action: () => this.queueDelete(files),
		});

		this.injectedNodes.set(menu, nodes);
		return true;
	}

	private appendNativeMenuItem(
		doc: Document,
		menu: HTMLElement,
		nodes: HTMLElement[],
		item: { title: string; icon: string; action: () => void },
	): void {
		const itemEl = doc.createElement('div');
		itemEl.className = `menu-item ${BASES_NATIVE_MENU_ITEM_CLASS}`;
		itemEl.setAttribute('role', 'menuitem');
		itemEl.tabIndex = -1;

		const iconEl = doc.createElement('div');
		iconEl.className = 'menu-item-icon';
		setIcon(iconEl, item.icon);

		const titleEl = doc.createElement('div');
		titleEl.className = 'menu-item-title';
		titleEl.textContent = item.title;

		itemEl.append(iconEl, titleEl);
		itemEl.addEventListener('click', (event) => {
			event.preventDefault();
			event.stopPropagation();
			item.action();
			menu.remove();
		});

		menu.appendChild(itemEl);
		nodes.push(itemEl);
	}

	private openFallbackBasesOperationsMenu(
		ctx: PlatformAdapterContext,
		files: TFile[],
		event: MouseEvent,
	): void {
		const menu = this.menuFactory();
		menu.addItem((item) =>
			item
				.setTitle('Vaultman: add property')
				.setIcon('lucide-plus')
				.onClick(() => this.openPropertyManager(ctx, files)),
		);
		menu.addItem((item) =>
			item
				.setTitle('Vaultman: rename files')
				.setIcon('lucide-pencil')
				.onClick(() => this.openRenameModal(ctx, files)),
		);
		menu.addItem((item) =>
			item
				.setTitle('Vaultman: move files')
				.setIcon('lucide-folder-input')
				.onClick(() => this.openMoveModal(ctx, files)),
		);
		menu.addItem((item) =>
			item
				.setTitle('Vaultman: delete files')
				.setIcon('lucide-trash')
				.onClick(() => this.queueDelete(files)),
		);
		menu.showAtMouseEvent(event);
	}

	private openPropertyManager(ctx: PlatformAdapterContext, files: TFile[]): void {
		new PropertyManagerModal(ctx.app, this.propertyIndex, [...files], this.enqueue).open();
	}

	private openRenameModal(ctx: PlatformAdapterContext, files: TFile[]): void {
		new FileRenameModal(ctx.app, this.propertyIndex, [...files], this.enqueue).open();
	}

	private openMoveModal(ctx: PlatformAdapterContext, files: TFile[]): void {
		new FileMoveModal(ctx.app, [...files], this.enqueue).open();
	}

	private queueDelete(files: TFile[]): void {
		const change = buildBasesFileDeleteChange(files);
		if (change) this.enqueue(change);
	}

	private removeInjectedNodes(): void {
		for (const [menu, nodes] of this.injectedNodes) {
			for (const node of nodes) {
				node.remove();
			}
			menu.classList.remove(BASES_NATIVE_MENU_ENHANCED_CLASS);
		}
		this.injectedNodes.clear();
	}
}

export function collectBasesSelectedFiles(
	app: App,
	root: Element,
	target: HTMLElement,
): TFile[] {
	const rows = Array.from(root.querySelectorAll<HTMLElement>(BASES_SELECTED_ROW_SELECTOR));
	const clickedRow = target.closest<HTMLElement>(BASES_ROW_SELECTOR);
	if (clickedRow && root.contains(clickedRow) && !rows.includes(clickedRow)) {
		rows.push(clickedRow);
	}

	const resolve = vaultResolver(app);
	if (typeof resolve !== 'function') return [];

	const filesByPath = new Map<string, TFile>();
	for (const selectedRow of rows) {
		const path = pathFromBasesRow(selectedRow);
		if (!path || filesByPath.has(path)) continue;
		const file = resolve(path);
		if (file instanceof TFile) {
			filesByPath.set(path, file);
		}
	}
	return [...filesByPath.values()];
}

export function pathFromBasesRow(row: HTMLElement): string {
	const ownPath =
		row.dataset.path ??
		row.dataset.filePath ??
		row.dataset.href ??
		row.getAttribute('data-path') ??
		row.getAttribute('data-file-path') ??
		row.getAttribute('data-href');
	if (ownPath) return normalizeBasesPath(ownPath);

	const link = row.querySelector<HTMLElement>('[data-href], .internal-link');
	const linkPath =
		link?.dataset.href ??
		link?.getAttribute('data-href') ??
		link?.getAttribute('href') ??
		'';
	return normalizeBasesPath(linkPath);
}

export function buildBasesFileDeleteChange(files: readonly TFile[]): PendingChange | null {
	if (files.length === 0) return null;
	return {
		type: 'file_delete',
		action: 'delete',
		details: `Delete ${files.length} files`,
		files: [...files],
		customLogic: true,
		logicFunc: () => ({ [DELETE_FILE]: true }),
	};
}

function deferWithDocument(doc: Document, callback: () => void): DeferHandle {
	const win = doc.defaultView;
	if (win) return win.setTimeout(callback, 0);
	return setTimeout(callback, 0);
}

function vaultResolver(app: App): ((path: string) => unknown) | undefined {
	const vault = (app as { vault?: { getAbstractFileByPath?: (path: string) => unknown } }).vault;
	const resolver = vault?.getAbstractFileByPath;
	if (typeof resolver !== 'function') return undefined;
	return resolver.bind(vault);
}

function hasPropertyIndex(propertyIndex: PropertyIndexService): boolean {
	const index = propertyIndex as unknown as {
		getPropertyNames?: unknown;
		getPropertyValues?: unknown;
	};
	return (
		!!index &&
		typeof index.getPropertyNames === 'function' &&
		typeof index.getPropertyValues === 'function'
	);
}

function normalizeBasesPath(path: string): string {
	return path.trim();
}

function isEventDocument(doc: Document): doc is Document & EventDoc {
	return (
		typeof doc?.addEventListener === 'function' &&
		typeof doc?.removeEventListener === 'function'
	);
}

function asElement(target: EventTarget | null): HTMLElement | null {
	return target instanceof HTMLElement ? target : null;
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
